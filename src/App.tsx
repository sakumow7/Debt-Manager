import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Debts from './pages/Debts';
import AttackPlan from './pages/AttackPlan';
import Budget from './pages/Budget';
import Tips from './pages/Tips';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Help from './pages/Help';
import NetWorth from './pages/NetWorth';
import OnboardingTour from './components/ui/OnboardingTour';
import ToastContainer from './components/ui/Toast';
import type { Debt, MonthlyBudget, AppSettings, ChatMessage, ScheduledPayment, Asset } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useToast } from './hooks/useToast';
import { generateId } from './lib/utils';
import { checkPaymentReminders } from './lib/reminders';
import { DEFAULT_SETTINGS, getData, getDataError, updateData, replaceData, emptyData, recoveryCopy, parseBackup } from './lib/dataStore';

export default function App() {
  const [debts, setDebts] = useLocalStorage<Debt[]>('dm-debts', []);
  const [budgets, setBudgets] = useLocalStorage<MonthlyBudget[]>('dm-budgets', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('dm-settings', DEFAULT_SETTINGS);
  const [chatMessages, setChatMessages] = useLocalStorage<ChatMessage[]>('dm-chat', []);
  const [scheduledPayments, setScheduledPayments] = useLocalStorage<ScheduledPayment[]>('dm-scheduled', []);
  const [assets, setAssets] = useLocalStorage<Asset[]>('dm-assets', []);
  const [showOnboarding, setShowOnboarding] = useState(() => !getData().onboardingComplete);

  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const onError = (event: Event) => addToast('Changes were not saved: ' + (event as CustomEvent<string>).detail, 'error');
    window.addEventListener('chisel-storage-error', onError);
    return () => window.removeEventListener('chisel-storage-error', onError);
  }, [addToast]);

  const mergedSettings: AppSettings = { ...DEFAULT_SETTINGS, ...settings };

  // Reminders work while the app is running, including after enabling notifications.
  useEffect(() => {
    void checkPaymentReminders(debts, mergedSettings);
    const timer = setInterval(() => { void checkPaymentReminders(debts, mergedSettings); }, 60_000);
    return () => clearInterval(timer);
  }, [debts, settings]);

  // Apply theme class to <html> element
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (mergedSettings.theme === 'light') {
      html.classList.add('chisel-light');
      body.classList.add('chisel-light');
    } else {
      html.classList.remove('chisel-light');
      body.classList.remove('chisel-light');
    }
  }, [mergedSettings.theme]);

  function completeOnboarding() {
    updateData(prev => ({ ...prev, onboardingComplete: true }));
    setShowOnboarding(false);
  }

  function replayTutorial() {
    updateData(prev => ({ ...prev, onboardingComplete: false }));
    setShowOnboarding(true);
  }

  function applyScheduledPayment(id: string) {
    try {
      updateData(prev => {
        const sp = prev.scheduledPayments.find(p => p.id === id && p.status === 'pending');
        const debt = prev.debts.find(d => d.id === sp?.debtId);
        if (!sp || !debt) throw new Error('Scheduled payment or debt is missing.');
        if (sp.amount <= 0 || sp.amount > debt.balance) throw new Error('Payment must be positive and no greater than the recorded balance. Edit the scheduled payment first.');
        const now = new Date().toISOString();
        return { ...prev, debts: prev.debts.map(d => d.id === debt.id ? {
          ...d, balance: Math.round((d.balance - sp.amount) * 100) / 100, updatedAt: now,
          payments: [...d.payments, { id: generateId(), amount: sp.amount, date: now.slice(0, 10), note: sp.note || 'Scheduled payment', source: 'manual' as const }],
        } : d), scheduledPayments: prev.scheduledPayments.filter(p => p.id !== id) };
      });
      addToast('Payment recorded', 'success');
    } catch (error) { addToast(error instanceof Error ? error.message : 'Payment was not saved.', 'error'); }
  }

  if (getDataError()) return <div className="p-8 text-white bg-gray-950 min-h-screen space-y-4">
    <h1 className="text-xl font-bold">Saved data needs recovery</h1><p role="alert">{getDataError()}</p>
    <button className="bg-gray-700 p-3 rounded" onClick={() => {
      const url = URL.createObjectURL(new Blob([recoveryCopy()], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'chisel-recovery-private.json'; a.click(); URL.revokeObjectURL(url);
    }}>Export private recovery copy</button>
    <p>Recovery copies may contain sensitive information. Keep them private.</p>
    <label className="block">Restore a backup <input type="file" accept=".json" onChange={async e => {
      try {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 20 * 1024 * 1024) throw new Error('Backup exceeds 20 MB.');
        const restored = parseBackup(await file.text());
        if (window.electronAPI) { const config = await window.electronAPI.getConfig(); if (config.aiConsent) await window.electronAPI.setConfig({ aiConsent: false }); }
        replaceData(restored); window.location.reload();
      }
      catch (error) { alert(error instanceof Error ? error.message : 'Restore failed.'); }
    }} /></label>
    <button className="bg-red-900 p-3 rounded" onClick={async () => {
      if (!confirm('Delete saved data and credentials? Export a recovery copy first.')) return;
      try { if (window.electronAPI) await window.electronAPI.clearConfig(); replaceData(emptyData()); window.location.reload(); }
      catch { alert('Could not clear data. Your recovery copy is still needed.'); }
    }}>Delete data and start over</button>
  </div>;

  return (
    <Router>
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          <Routes>
            <Route path="/help" element={<Help onReplayTutorial={replayTutorial} />} />
            <Route path="/" element={<Dashboard debts={debts} budgets={budgets} settings={mergedSettings} scheduledPayments={scheduledPayments} onApplyScheduled={applyScheduledPayment} />} />
            <Route path="/debts" element={<Debts debts={debts} setDebts={setDebts} settings={mergedSettings} addToast={addToast} />} />
            <Route path="/attack-plan" element={<AttackPlan debts={debts} settings={mergedSettings} setSettings={setSettings} scheduledPayments={scheduledPayments} addToast={addToast} />} />
            <Route path="/budget" element={<Budget budgets={budgets} setBudgets={setBudgets} settings={mergedSettings} setSettings={setSettings} debts={debts} scheduledPayments={scheduledPayments} setScheduledPayments={setScheduledPayments} />} />
            <Route path="/tips" element={<Tips debts={debts} budgets={budgets} />} />
            <Route path="/chat" element={<Chat debts={debts} budgets={budgets} messages={chatMessages} setMessages={setChatMessages} />} />
            <Route path="/net-worth" element={<NetWorth assets={assets} setAssets={setAssets} debts={debts} addToast={addToast} />} />
            <Route
              path="/settings"
              element={
                <Settings
                  settings={mergedSettings}
                  setSettings={setSettings}
                  debts={debts}
                  setDebts={setDebts}
                  budgets={budgets}
                  setBudgets={setBudgets}
                  addToast={addToast}
                />
              }
            />
          </Routes>
        </main>
      </div>
      {showOnboarding && <OnboardingTour onComplete={completeOnboarding} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Router>
  );
}

