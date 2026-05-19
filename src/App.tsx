import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Debts from './pages/Debts';
import AttackPlan from './pages/AttackPlan';
import Budget from './pages/Budget';
import Tips from './pages/Tips';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import type { Debt, MonthlyBudget, AppSettings, ChatMessage } from './types';
import { useLocalStorage } from './lib/storage';

const DEFAULT_SETTINGS: AppSettings = {
  extraMonthlyPayment: 0,
  currency: 'USD',
  preferredStrategy: 'avalanche',
  plaidAccounts: [],
};

export default function App() {
  const [debts, setDebts] = useLocalStorage<Debt[]>('dm-debts', []);
  const [budgets, setBudgets] = useLocalStorage<MonthlyBudget[]>('dm-budgets', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('dm-settings', DEFAULT_SETTINGS);
  const [chatMessages, setChatMessages] = useLocalStorage<ChatMessage[]>('dm-chat', []);

  const mergedSettings: AppSettings = { ...DEFAULT_SETTINGS, ...settings };

  return (
    <Router>
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard debts={debts} budgets={budgets} settings={mergedSettings} />} />
            <Route path="/debts" element={<Debts debts={debts} setDebts={setDebts} settings={mergedSettings} />} />
            <Route path="/attack-plan" element={<AttackPlan debts={debts} settings={mergedSettings} setSettings={setSettings} />} />
            <Route path="/budget" element={<Budget budgets={budgets} setBudgets={setBudgets} settings={mergedSettings} setSettings={setSettings} />} />
            <Route path="/tips" element={<Tips debts={debts} budgets={budgets} />} />
            <Route path="/chat" element={<Chat debts={debts} budgets={budgets} messages={chatMessages} setMessages={setChatMessages} />} />
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
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
