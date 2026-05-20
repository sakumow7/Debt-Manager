/**
 * Electron main process — the privileged Node.js side of the desktop application.
 *
 * Responsibilities:
 *   - Creates and manages the BrowserWindow
 *   - Reads/writes the local config file (API keys, Plaid tokens) via `config:*` IPC handlers
 *   - Proxies requests to the Anthropic Claude API via `ai:*` IPC handlers
 *   - Proxies requests to the Plaid API via `plaid:*` IPC handlers
 *
 * All API calls are made from the main process (not the renderer) so that secret
 * keys are never exposed to the browser context. The renderer communicates through
 * the contextBridge defined in preload.ts.
 */
import { app, BrowserWindow, ipcMain, shell, protocol, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';

const isDev = !app.isPackaged;

interface AppConfig {
  anthropicKey?: string;
  plaidClientId?: string;
  plaidSecret?: string;
  plaidEnv?: string;
  plaidAccessTokens?: { institution: string; token: string; accountIds: string[] }[];
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(config: AppConfig): void {
  const dir = path.dirname(getConfigPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Low-level Anthropic API caller using Node's built-in `https` module.
 * We avoid `fetch` here because the packaged Electron binary may run on a Node
 * version where global `fetch` is not available, while `https` is always present.
 */
async function callAnthropic(apiKey: string, body: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) reject(new Error(parsed.error.message || 'API error'));
            else resolve(parsed.content?.[0]?.text || '');
          } catch {
            reject(new Error('Failed to parse API response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Generic Plaid REST caller. Automatically selects the correct hostname based
 * on the configured environment (sandbox / development / production).
 */
async function callPlaid(
  config: AppConfig,
  endpoint: string,
  body: object
): Promise<object> {
  return new Promise((resolve, reject) => {
    const env = config.plaidEnv || 'sandbox';
    const hostname =
      env === 'production'
        ? 'production.plaid.com'
        : env === 'development'
        ? 'development.plaid.com'
        : 'sandbox.plaid.com';

    const payload = JSON.stringify({
      client_id: config.plaidClientId,
      secret: config.plaidSecret,
      ...body,
    });

    const req = https.request(
      {
        hostname,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error_code) reject(new Error(parsed.error_message || parsed.error_code));
            else resolve(parsed);
          } catch {
            reject(new Error('Failed to parse Plaid response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#030712',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // Isolates renderer from main-process globals
      nodeIntegration: false,  // Prevents renderer from calling Node APIs directly
      // sandbox: false is required so the preload script can access the ipcRenderer
      // module. The renderer itself is still isolated via contextIsolation.
      sandbox: false,
    },
    titleBarStyle: 'default',
    show: false,
  });

  // Windows 11 Mica effect
  if (process.platform === 'win32') {
    try {
      (mainWindow as any).setBackgroundMaterial?.('mica');
    } catch {
      // Not supported on this version
    }
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Config ─────────────────────────────────────────────────────────────

ipcMain.handle('config:get', () => loadConfig());

ipcMain.handle('config:set', (_, updates: Partial<AppConfig>) => {
  saveConfig({ ...loadConfig(), ...updates });
  return true;
});

// ─── IPC: AI Chat ─────────────────────────────────────────────────────────────

ipcMain.handle(
  'ai:chat',
  async (_, { messages, systemPrompt }: { messages: { role: string; content: string }[]; systemPrompt: string }) => {
    const config = loadConfig();
    if (!config.anthropicKey) throw new Error('No Anthropic API key configured. Go to Settings to add it.');
    return callAnthropic(config.anthropicKey, {
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });
  }
);

// ─── IPC: AI Tips ─────────────────────────────────────────────────────────────

ipcMain.handle('ai:tips', async (_, { prompt }: { prompt: string }) => {
  const config = loadConfig();
  if (!config.anthropicKey) throw new Error('No Anthropic API key configured. Go to Settings to add it.');
  return callAnthropic(config.anthropicKey, {
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
});

// ─── IPC: Plaid ───────────────────────────────────────────────────────────────

ipcMain.handle('plaid:create-link-token', async () => {
  const config = loadConfig();
  if (!config.plaidClientId || !config.plaidSecret) {
    throw new Error('Plaid credentials not configured. Go to Settings to add them.');
  }
  const result = await callPlaid(config, '/link/token/create', {
    user: { client_user_id: 'debt-manager-user' },
    client_name: 'Chisel',
    products: ['liabilities', 'accounts'],
    country_codes: ['US'],
    language: 'en',
  }) as any;
  return result.link_token;
});

ipcMain.handle('plaid:exchange-token', async (_, publicToken: string) => {
  const config = loadConfig();
  const result = await callPlaid(config, '/item/public_token/exchange', {
    public_token: publicToken,
  }) as any;
  return result.access_token;
});

ipcMain.handle('plaid:get-accounts', async (_, accessToken: string) => {
  const config = loadConfig();
  const result = await callPlaid(config, '/accounts/get', {
    access_token: accessToken,
  }) as any;
  return result.accounts;
});

ipcMain.handle('plaid:get-liabilities', async (_, accessToken: string) => {
  const config = loadConfig();
  const result = await callPlaid(config, '/liabilities/get', {
    access_token: accessToken,
  }) as any;
  return result;
});

ipcMain.handle('plaid:get-transactions', async (_, { accessToken, startDate, endDate }: { accessToken: string; startDate: string; endDate: string }) => {
  const config = loadConfig();
  const result = await callPlaid(config, '/transactions/get', {
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 100 },
  }) as any;
  return result.transactions;
});

ipcMain.handle('plaid:open-link', async () => {
  const linkToken = await ipcMain.emit('plaid:create-link-token', null);
  return linkToken;
});

// ─── IPC: Native Notifications ────────────────────────────────────────────────

ipcMain.handle('notification:show', (_, { title, body }: { title: string; body: string }) => {
  if (!Notification.isSupported()) return false;
  new Notification({ title, body, silent: false }).show();
  return true;
});
