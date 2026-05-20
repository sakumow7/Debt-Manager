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

const DEFAULT_SETTINGS: AppSettings = {
  extraMonthlyPayment: 0,
  currency: 'USD',
  preferredStrategy: 'avalanche',
  plaidAccounts: [],
  theme: 'dark',
  biweeklyPayments: false,
  notificationsEnabled: false,
};

export default function App() {
  const [debts, setDebts] = useLocalStorage<Debt[]>('dm-debts', []);
  const [budgets, setBudgets] = useLocalStorage<MonthlyBudget[]>('dm-budgets', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('dm-settings', DEFAULT_SETTINGS);
  const [chatMessages, setChatMessages] = useLocalStorage<ChatMessage[]>('dm-chat', []);
  const [scheduledPayments, setScheduledPayments] = useLocalStorage<ScheduledPayment[]>('dm-scheduled', []);
  const [assets, setAssets] = useLocalStorage<Asset[]>('dm-assets', []);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('dm-onboarding-complete'));

  const { toasts, addToast, removeToast } = useToast();

  const mergedSettings: AppSettings = { ...DEFAULT_SETTINGS, ...settings };

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
    localStorage.setItem('dm-onboarding-complete', '1');
    setShowOnboarding(false);
  }

  function replayTutorial() {
    localStorage.removeItem('dm-onboarding-complete');
    setShowOnboarding(true);
  }

  function applyScheduledPayment(id: string) {
    const sp = scheduledPayments.find((p) => p.id === id);
    if (!sp) return;
    const now = new Date().toISOString();
    setDebts((prev) =>
      prev.map((d) =>
        d.id === sp.debtId
          ? {
              ...d,
              balance: Math.max(0, d.balance - sp.amount),
              updatedAt: now,
              payments: [
                ...d.payments,
                { id: generateId(), amount: sp.amount, date: now.slice(0, 10), note: sp.note || 'Scheduled payment', source: 'manual' as const },
              ],
            }
          : d
      )
    );
    setScheduledPayments((prev) => prev.filter((p) => p.id !== id));
  }

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
