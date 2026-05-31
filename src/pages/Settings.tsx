import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, CheckCircle, XCircle, Link2, Trash2, RefreshCw, Download, Upload, AlertCircle, Building2, Sun, Moon, Bell, BellOff, CalendarDays } from 'lucide-react';
import type { AppSettings, Debt, MonthlyBudget } from '../types';
import type { ToastType } from '../hooks/useToast';

interface Props {
  settings: AppSettings;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  debts: Debt[];
  setDebts: (d: Debt[] | ((p: Debt[]) => Debt[])) => void;
  budgets: MonthlyBudget[];
  setBudgets: (b: MonthlyBudget[] | ((p: MonthlyBudget[]) => MonthlyBudget[])) => void;
  addToast: (msg: string, type?: ToastType) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-white font-semibold text-base mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, iconClass, label, description, value, onChange }: {
  icon: React.ElementType; iconClass: string; label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={16} className={iconClass} />
        <div>
          <p className="text-gray-200 text-sm font-medium">{label}</p>
          <p className="text-gray-500 text-xs">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-emerald-500' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function Settings({ settings, setSettings, debts, setDebts, budgets, setBudgets, addToast }: Props) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [plaidClientId, setPlaidClientId] = useState('');
  const [plaidSecret, setPlaidSecret] = useState('');
  const [plaidEnv, setPlaidEnv] = useState('sandbox');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [plaidLinking, setPlaidLinking] = useState(false);
  const [plaidError, setPlaidError] = useState('');

  const isElectron = !!window.electronAPI;

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getConfig().then((config) => {
      if (config.anthropicKey) setAnthropicKey(config.anthropicKey);
      if (config.plaidClientId) setPlaidClientId(config.plaidClientId);
      if (config.plaidSecret) setPlaidSecret(config.plaidSecret);
      if (config.plaidEnv) setPlaidEnv(config.plaidEnv);
    });
  }, []);

  async function saveApiKeys() {
    if (!window.electronAPI) return;
    setSaving(true);
    await window.electronAPI.setConfig({ anthropicKey, plaidClientId, plaidSecret, plaidEnv });
    setSaving(false);
    setSaved(true);
    addToast('API keys saved', 'success');
    setTimeout(() => setSaved(false), 3000);
  }

  async function testAnthropicKey() {
    if (!window.electronAPI || !anthropicKey) return;
    setTestStatus('testing');
    setTestError('');
    try {
      await window.electronAPI.setConfig({ anthropicKey });
      const result = await window.electronAPI.chat([{ role: 'user', content: 'Say "API key works!" in exactly 3 words.' }], 'You are a helpful assistant.');
      if (result) { setTestStatus('ok'); addToast('API key is working', 'success'); }
      else setTestStatus('error');
    } catch (e: any) {
      setTestStatus('error');
      setTestError(e.message || 'Connection failed');
      addToast('API key test failed', 'error');
    }
  }

  async function connectBank() {
    if (!window.electronAPI) return;
    setPlaidLinking(true);
    setPlaidError('');
    try {
      await window.electronAPI.setConfig({ plaidClientId, plaidSecret, plaidEnv });
      const linkToken = await window.electronAPI.plaidCreateLinkToken();
      console.log('Plaid Link Token:', linkToken);
      setPlaidError(`Link token created: ${linkToken.slice(0, 20)}... Open Plaid Link with this token to connect your bank.`);
    } catch (e: any) {
      setPlaidError(e.message || 'Failed to create Plaid link token');
      addToast('Bank connection failed', 'error');
    } finally {
      setPlaidLinking(false);
    }
  }

  async function syncBankAccounts() {
    if (!window.electronAPI || settings.plaidAccounts.length === 0) return;
    for (const account of settings.plaidAccounts) {
      try {
        const accounts = await window.electronAPI.plaidGetAccounts(account.accessToken);
        const matchedAccount = accounts.find((a: { account_id: string; balances: { current: number | null } }) => a.account_id === account.account_id);
        if (matchedAccount) {
          const balance = Math.abs(matchedAccount.balances.current || 0);
          setDebts((prev) =>
            prev.map((d) =>
              d.plaidAccountId === account.account_id ? { ...d, balance, updatedAt: new Date().toISOString() } : d
            )
          );
        }
      } catch (e) {
        console.error('Sync error:', e);
      }
    }
    addToast('Bank accounts synced', 'success');
  }

  function exportData() {
    const data = { debts, budgets, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chisel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Backup exported', 'success');
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.debts) setDebts(data.debts);
        if (data.budgets) setBudgets(data.budgets);
        if (data.settings) setSettings(data.settings);
        addToast('Data imported successfully', 'success');
      } catch {
        addToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) return;
    // Wipe every persisted key (debts, budgets, settings, chat, scheduled payments,
    // assets, onboarding flag) and reload so all in-memory state re-initializes from
    // empty storage — avoids stale data lingering in components we don't own here.
    localStorage.clear();
    window.location.reload();
  }

  const isDark = settings.theme !== 'light';

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configure your preferences and API keys</p>
      </div>

      {!isElectron && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-400" />
          <p className="text-amber-300 text-sm">Running in browser mode. API key configuration requires the Electron desktop app.</p>
        </div>
      )}

      {/* Appearance & Behavior */}
      <Section title="Appearance & Behavior">
        <ToggleRow
          icon={isDark ? Moon : Sun}
          iconClass={isDark ? 'text-blue-400' : 'text-amber-400'}
          label="Light Mode"
          description={isDark ? 'Switch to light theme' : 'Currently using light theme'}
          value={!isDark}
          onChange={(v) => setSettings((p) => ({ ...p, theme: v ? 'light' : 'dark' }))}
        />
        <ToggleRow
          icon={CalendarDays}
          iconClass="text-blue-400"
          label="Biweekly Payments"
          description="Pay every 2 weeks instead of monthly — adds 1 extra full payment per year"
          value={settings.biweeklyPayments ?? false}
          onChange={(v) => setSettings((p) => ({ ...p, biweeklyPayments: v }))}
        />
        {isElectron && (
          <ToggleRow
            icon={settings.notificationsEnabled ? Bell : BellOff}
            iconClass={settings.notificationsEnabled ? 'text-emerald-400' : 'text-gray-500'}
            label="Desktop Notifications"
            description="Receive Windows notifications for upcoming payment due dates"
            value={settings.notificationsEnabled ?? false}
            onChange={(v) => {
              setSettings((p) => ({ ...p, notificationsEnabled: v }));
              if (v && window.electronAPI) {
                window.electronAPI.showNotification?.('Chisel', 'Desktop notifications are now enabled!');
              }
              addToast(v ? 'Notifications enabled' : 'Notifications disabled', 'info');
            }}
          />
        )}
      </Section>

      {/* App Preferences */}
      <Section title="App Preferences">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Default Strategy</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={settings.preferredStrategy}
                onChange={(e) => setSettings((p) => ({ ...p, preferredStrategy: e.target.value as 'avalanche' | 'snowball' }))}
              >
                <option value="avalanche">🔥 Avalanche (highest APR first)</option>
                <option value="snowball">❄️ Snowball (lowest balance first)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Currency</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={settings.currency}
                onChange={(e) => setSettings((p) => ({ ...p, currency: e.target.value }))}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Default Extra Monthly Payment ($)</label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="50"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={settings.extraMonthlyPayment}
                onChange={(e) => setSettings((p) => ({ ...p, extraMonthlyPayment: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Anthropic API */}
      <Section title="🤖 Anthropic Claude API">
        <div className="space-y-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            Required for AI Chat and personalized Tips. Get your API key from{' '}
            <span className="text-emerald-400">console.anthropic.com</span>. Your key is stored locally and never shared.
          </p>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showAnthropicKey ? 'text' : 'password'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 pr-10 font-mono"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => { setAnthropicKey(e.target.value); setTestStatus('idle'); }}
                />
                <button onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showAnthropicKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={testAnthropicKey}
                disabled={!anthropicKey || testStatus === 'testing' || !isElectron}
                className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {testStatus === 'testing' ? <RefreshCw size={13} className="animate-spin" /> : testStatus === 'ok' ? <CheckCircle size={13} className="text-emerald-400" /> : testStatus === 'error' ? <XCircle size={13} className="text-red-400" /> : null}
                Test
              </button>
            </div>
            {testStatus === 'ok' && <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1"><CheckCircle size={11} /> API key is working correctly</p>}
            {testStatus === 'error' && <p className="text-red-400 text-xs mt-1.5">{testError || 'Connection failed. Check your API key.'}</p>}
          </div>
        </div>
      </Section>

      {/* Plaid Banking */}
      <Section title="🏦 Plaid Banking Integration">
        <div className="space-y-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            Connect your bank accounts to automatically sync debt balances. Requires a free Plaid developer account at{' '}
            <span className="text-emerald-400">dashboard.plaid.com</span>.
          </p>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <h3 className="text-blue-300 text-sm font-semibold mb-2 flex items-center gap-2">
              <Building2 size={14} /> Setup Steps
            </h3>
            <ol className="text-gray-400 text-xs space-y-1 list-decimal pl-4">
              <li>Create a free account at dashboard.plaid.com</li>
              <li>Create a new application (choose "Personal Finance" category)</li>
              <li>Copy your Client ID and Sandbox Secret from API keys page</li>
              <li>Enter them below and click Save API Keys</li>
              <li>Click "Connect Bank" to link your accounts</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Plaid Client ID</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" placeholder="Client ID" value={plaidClientId} onChange={(e) => setPlaidClientId(e.target.value)} />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Secret Key</label>
              <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" placeholder="Secret" value={plaidSecret} onChange={(e) => setPlaidSecret(e.target.value)} />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Environment</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" value={plaidEnv} onChange={(e) => setPlaidEnv(e.target.value)}>
                <option value="sandbox">Sandbox (testing)</option>
                <option value="development">Development (real accounts)</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          {plaidError && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2 text-blue-300 text-xs font-mono break-all">
              {plaidError}
            </div>
          )}

          {settings.plaidAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs font-medium">Linked Accounts</p>
              {settings.plaidAccounts.map((acc, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-400" />
                    <span className="text-gray-300 text-sm">{acc.institution}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={syncBankAccounts} className="text-xs text-emerald-400 hover:text-emerald-300">Sync</button>
                    <button onClick={() => setSettings((p) => ({ ...p, plaidAccounts: p.plaidAccounts.filter((_, j) => j !== i) }))} className="text-gray-500 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={connectBank}
              disabled={!plaidClientId || !plaidSecret || plaidLinking || !isElectron}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Link2 size={14} /> {plaidLinking ? 'Connecting...' : 'Connect Bank'}
            </button>
            {settings.plaidAccounts.length > 0 && (
              <button onClick={syncBankAccounts} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <RefreshCw size={14} /> Sync All
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Save Keys Button */}
      {isElectron && (
        <button
          onClick={saveApiKeys}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save API Keys'}
        </button>
      )}

      {/* Data Management */}
      <Section title="Data Management">
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">All data is stored locally on your device. Back up regularly to avoid losing your data.</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={exportData} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Download size={15} /> Export Backup
            </button>
            <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer">
              <Upload size={15} /> Import Backup
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
            <button onClick={clearAllData} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-red-600/30">
              <Trash2 size={15} /> Clear All Data
            </button>
          </div>
        </div>
      </Section>

      <div className="text-center text-gray-700 text-xs pb-4">
        Chisel Finance v1.1.0 · Windows 11 Desktop App · Built with Electron + React
      </div>
    </div>
  );
}
