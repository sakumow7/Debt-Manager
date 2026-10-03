import { app, BrowserWindow, ipcMain, shell, Notification, safeStorage, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import https from 'node:https';
import { createVault, type AppConfig } from './vault';
import { boundedText, externalURL, record, validateChat, validateConfigUpdate } from './security';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
const vault = () => createVault(app.getPath('userData'), safeStorage);
const rendererURL = () => isDev ? 'http://localhost:5173/' : pathToFileURL(path.join(app.getAppPath(), 'dist/index.html')).href;
function trustedSender(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents || !event.senderFrame || event.senderFrame !== event.sender.mainFrame) throw new Error('Untrusted IPC caller.');
  const url = new URL(event.senderFrame.url);
  if (isDev ? url.origin !== 'http://localhost:5173' : url.href.split('#')[0] !== rendererURL()) throw new Error('Untrusted IPC origin.');
}
function handle(channel: string, action: (payload: unknown) => unknown) {
  ipcMain.handle(channel, (event, payload) => { trustedSender(event); return action(payload); });
}

// Bound response size and duration; never log requests or credentials.
function requestJSON(hostname: string, endpoint: string, body: object, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    if (Buffer.byteLength(payload) > 512 * 1024) { reject(new Error('Request is too large.')); return; }
    const req = https.request({ hostname, path: endpoint, method: 'POST', headers: {
      'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(payload)), ...headers,
    } }, res => {
      const chunks: Buffer[] = []; let length = 0;
      res.on('data', chunk => {
        length += chunk.length;
        if (length > 2 * 1024 * 1024) { req.destroy(new Error('Service response is too large.')); res.destroy(); }
        else chunks.push(Buffer.from(chunk));
      });
      res.on('error', reject);
      res.on('end', () => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Service request failed (${res.statusCode ?? 'unknown'}). Check your credentials or try again later.`)); return;
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('Service returned an invalid response.')); }
      });
    });
    const deadline = setTimeout(() => req.destroy(new Error('Service request timed out. Please try again.')), 30000);
    req.on('close', () => clearTimeout(deadline));
    req.on('error', () => reject(new Error('Service request failed or timed out. Please try again.')));
    req.end(payload);
  });
}
async function callAnthropic(config: AppConfig, body: object): Promise<string> {
  if (!config.aiConsent) throw new Error('Enable AI data sharing in Settings before using AI features.');
  if (!config.anthropicKey) throw new Error('Add an Anthropic API key in Settings.');
  const result = await requestJSON('api.anthropic.com', '/v1/messages', body, {
    'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01',
  });
  if (!Array.isArray(result.content)) throw new Error('AI service returned an invalid response.');
  return result.content.filter((block: any) => block.type === 'text').map((block: any) => boundedText(block.text, 'AI response', 100000)).join('\n');
}
async function callPlaid(config: AppConfig, endpoint: string, body: object): Promise<any> {
  if (!config.plaidClientId || !config.plaidSecret) throw new Error('Add Plaid credentials in Settings.');
  const hostname = config.plaidEnv === 'production' ? 'production.plaid.com' : config.plaidEnv === 'development' ? 'development.plaid.com' : 'sandbox.plaid.com';
  return requestJSON(hostname, endpoint, { ...body, client_id: config.plaidClientId, secret: config.plaidSecret });
}
function connection(config: AppConfig, value: unknown) {
  const id = boundedText(value, 'connection ID', 200);
  const found = config.connections?.find(c => c.id === id);
  if (!found) throw new Error('Bank connection is unavailable. Reconnect this bank in Settings.');
  return found;
}
function createWindow(): void {
  mainWindow = new BrowserWindow({ width: 1400, height: 900, minWidth: 800, minHeight: 600, backgroundColor: '#030712',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }, show: false });
  if (isDev) void mainWindow.loadURL(rendererURL()); else void mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (externalURL(url)) void shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => { if (url.split('#')[0] !== rendererURL()) event.preventDefault(); });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
}
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on('second-instance', () => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show(); mainWindow?.focus();
});
app.whenReady().then(() => {
  if (!hasInstanceLock) return;
  // Migrate legacy plaintext credentials at startup. Errors remain visible through config:get.
  try { vault().load(); } catch { /* Keep offline features available and preserve unreadable credentials. */ }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

handle('config:get', () => {
  const store = vault(); const config = store.load();
  return { anthropicKeyConfigured: !!config.anthropicKey, plaidSecretConfigured: !!config.plaidSecret,
    plaidClientId: config.plaidClientId, plaidEnv: config.plaidEnv, aiConsent: !!config.aiConsent,
    secureStorageAvailable: store.available(), connections: (config.connections ?? []).map(c => ({ id: c.id, accountIds: c.accountIds })) };
});
handle('config:set', payload => {
  const updates = validateConfigUpdate(payload); const store = vault(); const config = store.load();
  if (updates.plaidEnv !== undefined && updates.plaidEnv !== config.plaidEnv) {
    // Tokens are bound to their environment. Do not send sandbox tokens to production.
    if (config.connections?.length) throw new Error('Disconnect linked banks before changing the banking environment.');
  }
  store.save({ ...config, ...updates }); return true;
});
handle('config:clear', () => { vault().clear(); return true; });
handle('ai:chat', payload => {
  const input = validateChat(payload);
  return callAnthropic(vault().load(), { model: 'claude-sonnet-4-6', max_tokens: 2048, system: input.systemPrompt, messages: input.messages });
});
handle('ai:tips', payload => {
  const input = record(payload); const prompt = boundedText(input.prompt, 'tips prompt', 20000);
  return callAnthropic(vault().load(), { model: 'claude-sonnet-4-6', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] });
});
handle('plaid:create-link-token', async () => {
  const store = vault(); const config = store.load();
  if (!config.localUserId) { config.localUserId = randomUUID(); store.save(config); }
  const result = await callPlaid(config, '/link/token/create', {
    user: { client_user_id: config.localUserId },
    client_name: 'Chisel Finance', products: ['liabilities'], country_codes: ['US'], language: 'en',
  });
  return boundedText(result.link_token, 'link token', 1024);
});
handle('plaid:exchange-token', async payload => {
  const publicToken = boundedText(payload, 'public token', 1024); const store = vault(); const config = store.load();
  const result = await callPlaid(config, '/item/public_token/exchange', { public_token: publicToken });
  const id = randomUUID(); const token = boundedText(result.access_token, 'access token', 1024);
  const latest = store.load();
  if (latest.plaidClientId !== config.plaidClientId || latest.plaidSecret !== config.plaidSecret || latest.plaidEnv !== config.plaidEnv) throw new Error('Bank configuration changed during connection. Try again.');
  store.save({ ...latest, connections: [...(latest.connections ?? []), { id, token, accountIds: [] }] });
  return id;
});
handle('plaid:get-accounts', async payload => {
  const store = vault(); const config = store.load(); const linked = connection(config, payload);
  const result = await callPlaid(config, '/accounts/get', { access_token: linked.token });
  if (!Array.isArray(result.accounts)) throw new Error('Bank service returned invalid accounts.');
  const accountIds = result.accounts.map((a: any) => boundedText(a.account_id, 'account ID', 200));
  // Reload before saving so concurrent config changes are preserved.
  const latest = store.load();
  if (!latest.connections?.some(c => c.id === linked.id)) throw new Error('Bank was disconnected during sync.');
  store.save({ ...latest, connections: latest.connections?.map(c => c.id === linked.id ? { ...c, accountIds } : c) });
  return result.accounts;
});
handle('plaid:disconnect', async payload => {
  const store = vault(); const config = store.load(); const linked = connection(config, payload);
  await callPlaid(config, '/item/remove', { access_token: linked.token });
  const latest = store.load(); store.save({ ...latest, connections: latest.connections?.filter(c => c.id !== linked.id) });
  return true;
});
handle('notification:show', payload => {
  const input = record(payload); const title = boundedText(input.title, 'notification title', 200); const body = boundedText(input.body, 'notification body', 1000);
  if (!Notification.isSupported()) return false;
  new Notification({ title, body, silent: false }).show(); return true;
});
