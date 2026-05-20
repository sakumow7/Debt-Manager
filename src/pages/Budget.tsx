/**
 * Monthly Budget page.
 *
 * Tracks income and categorized expenses for each calendar month, calculates
 * surplus/deficit, and surfaces a one-click "Apply to Plan" action that pushes
 * 70% of the surplus into the attack plan's extra monthly payment.
 */
import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, PiggyBank, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Wallet, Clock, CalendarCheck } from 'lucide-react';
import type { MonthlyBudget, ExpenseItem, ExtraIncome, AppSettings, Debt, ScheduledPayment } from '../types';
import { EXPENSE_CATEGORIES, EXTRA_INCOME_CATEGORIES } from '../types';
import { formatCurrency, formatDate } from '../lib/calculations';
import { generateId, currentMonth } from '../lib/utils';
import Modal from '../components/ui/Modal';

interface Props {
  budgets: MonthlyBudget[];
  setBudgets: (b: MonthlyBudget[] | ((p: MonthlyBudget[]) => MonthlyBudget[])) => void;
  settings: AppSettings;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  debts: Debt[];
  scheduledPayments: ScheduledPayment[];
  setScheduledPayments: (s: ScheduledPayment[] | ((p: ScheduledPayment[]) => ScheduledPayment[])) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#6b7280', '#84cc16', '#f97316', '#a78bfa', '#fb923c', '#34d399', '#60a5fa', '#c084fc'];

function getMonthLabel(m: string): string {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function prevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Budget({ budgets, setBudgets, settings, setSettings, debts, scheduledPayments, setScheduledPayments }: Props) {
  const [viewMonth, setViewMonth] = useState(currentMonth());
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'fixed' | 'variable'>('fixed');
  const [incomeInput, setIncomeInput] = useState('');
  const [newExtraCategory, setNewExtraCategory] = useState(EXTRA_INCOME_CATEGORIES[0]);
  const [newExtraAmount, setNewExtraAmount] = useState('');
  const [newExtraNote, setNewExtraNote] = useState('');

  // Schedule-a-payment modal state
  const [scheduleSource, setScheduleSource] = useState<ExtraIncome | null>(null);
  const [schedDebtId, setSchedDebtId] = useState('');
  const [schedAmount, setSchedAmount] = useState('');
  const [schedDate, setSchedDate] = useState('');

  function openScheduleModal(extra: ExtraIncome) {
    setScheduleSource(extra);
    setSchedDebtId(debts[0]?.id ?? '');
    setSchedAmount(String(extra.amount));
    // Default to tomorrow so it reads as a future payment, but the user can set it to today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSchedDate(tomorrow.toISOString().slice(0, 10));
  }

  function handleSchedulePayment() {
    if (!scheduleSource || !schedDebtId || !schedDate) return;
    const amount = parseFloat(schedAmount);
    if (isNaN(amount) || amount <= 0) return;
    const sp: ScheduledPayment = {
      id: generateId(),
      debtId: schedDebtId,
      amount,
      scheduledDate: schedDate,
      note: scheduleSource.note || scheduleSource.category,
      status: 'pending',
      createdAt: new Date().toISOString(),
      sourceExtraIncomeId: scheduleSource.id,
    };
    setScheduledPayments((prev) => [...prev, sp]);
    setScheduleSource(null);
  }

  const budget = budgets.find((b) => b.month === viewMonth);

  // Lazily creates a budget record for the viewed month the first time the user
  // interacts with it, so we don't pre-populate empty records for every past month.
  function ensureBudget(): MonthlyBudget {
    if (budget) return budget;
    const newB: MonthlyBudget = { id: generateId(), month: viewMonth, income: 0, expenses: [] };
    setBudgets((prev) => [...prev, newB]);
    return newB;
  }

  function setIncome(val: string) {
    const inc = parseFloat(val);
    if (isNaN(inc)) return;
    setBudgets((prev) => {
      const existing = prev.find((b) => b.month === viewMonth);
      if (existing) return prev.map((b) => b.month === viewMonth ? { ...b, income: inc } : b);
      return [...prev, { id: generateId(), month: viewMonth, income: inc, expenses: [] }];
    });
    setIncomeInput('');
  }

  function addExpense() {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;
    const expense: ExpenseItem = { id: generateId(), category: newCategory, amount, type: newType };
    setBudgets((prev) => {
      const existing = prev.find((b) => b.month === viewMonth);
      if (existing) return prev.map((b) => b.month === viewMonth ? { ...b, expenses: [...b.expenses, expense] } : b);
      return [...prev, { id: generateId(), month: viewMonth, income: budget?.income || 0, expenses: [expense] }];
    });
    setNewAmount('');
  }

  function removeExpense(id: string) {
    setBudgets((prev) => prev.map((b) => b.month === viewMonth ? { ...b, expenses: b.expenses.filter((e) => e.id !== id) } : b));
  }

  function addExtraIncome() {
    const amount = parseFloat(newExtraAmount);
    if (isNaN(amount) || amount <= 0) return;
    const extra: ExtraIncome = { id: generateId(), category: newExtraCategory, amount, note: newExtraNote || undefined };
    setBudgets((prev) => {
      const existing = prev.find((b) => b.month === viewMonth);
      if (existing) return prev.map((b) => b.month === viewMonth ? { ...b, extraIncomes: [...(b.extraIncomes ?? []), extra] } : b);
      return [...prev, { id: generateId(), month: viewMonth, income: 0, expenses: [], extraIncomes: [extra] }];
    });
    setNewExtraAmount('');
    setNewExtraNote('');
  }

  function removeExtraIncome(id: string) {
    // Find the item before removing it so we can match orphaned scheduled payments.
    const extra = (budget?.extraIncomes ?? []).find((e) => e.id === id);
    setBudgets((prev) => prev.map((b) => b.month === viewMonth ? { ...b, extraIncomes: (b.extraIncomes ?? []).filter((e) => e.id !== id) } : b));
    setScheduledPayments((prev) =>
      prev.filter((sp) => {
        // Primary match: ID link set when the payment was scheduled (post-fix).
        if (sp.sourceExtraIncomeId === id) return false;
        // Fallback: match by note+amount for payments created before the ID link existed.
        if (!sp.sourceExtraIncomeId && extra && sp.amount === extra.amount && sp.note === (extra.note || extra.category)) return false;
        return true;
      })
    );
  }

  const extraIncomes = budget?.extraIncomes ?? [];
  const totalExtraIncome = extraIncomes.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = budget ? budget.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const income = budget?.income || 0;
  const surplus = income + totalExtraIncome - totalExpenses;
  const fixedTotal = budget ? budget.expenses.filter((e) => e.type === 'fixed').reduce((s, e) => s + e.amount, 0) : 0;
  const variableTotal = totalExpenses - fixedTotal;

  const pieData = useMemo(() => {
    if (!budget) return [];
    const grouped = new Map<string, number>();
    for (const e of budget.expenses) {
      grouped.set(e.category, (grouped.get(e.category) || 0) + e.amount);
    }
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [budget]);

  const canNext = viewMonth < currentMonth();

  return (
    <>
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Monthly Budget</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track income and expenses to find extra money for debt</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMonth(prevMonth(viewMonth))} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-medium text-sm min-w-[140px] text-center">{getMonthLabel(viewMonth)}</span>
          <button onClick={() => setViewMonth(nextMonth(viewMonth))} disabled={!canNext} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">Monthly Income</p>
          <p className="text-white text-xl font-bold">{formatCurrency(income + totalExtraIncome)}</p>
          <p className="text-gray-600 text-xs mt-1">
            {totalExtraIncome > 0
              ? <><span className="text-gray-500">{formatCurrency(income)} base</span> + <span className="text-emerald-500">{formatCurrency(totalExtraIncome)} extra</span></>
              : 'After tax take-home'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total Expenses</p>
          <p className="text-red-400 text-xl font-bold">{formatCurrency(totalExpenses)}</p>
          <p className="text-gray-600 text-xs mt-1">{formatCurrency(fixedTotal)} fixed · {formatCurrency(variableTotal)} variable</p>
        </div>
        <div className={`border rounded-2xl p-4 ${surplus >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <p className="text-gray-400 text-xs mb-1">Monthly Surplus</p>
          <p className={`text-xl font-bold ${surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}</p>
          {surplus > 0 && (
            <p className="text-gray-500 text-xs mt-1">
              Put {formatCurrency(surplus * 0.5)} toward debt
            </p>
          )}
        </div>
      </div>

      {surplus > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <p className="text-emerald-300 text-sm">
            You have <strong>{formatCurrency(surplus)}</strong> surplus this month{totalExtraIncome > 0 && <> (includes <strong>{formatCurrency(totalExtraIncome)}</strong> extra income)</>}. Apply <strong>{formatCurrency(Math.round(surplus * 0.7))}</strong> (70%) to debt for optimal progress.
          </p>
          </div>
          <button
            onClick={() => setSettings((p) => ({ ...p, extraMonthlyPayment: Math.round(surplus * 0.7) }))}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-3"
          >
            Apply to Plan
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Expense List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Income Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" /> Monthly Income
            </h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder={income > 0 ? String(income) : 'Monthly take-home pay'}
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  onBlur={() => { if (incomeInput) setIncome(incomeInput); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && incomeInput) setIncome(incomeInput); }}
                />
              </div>
            </div>
          </div>

          {/* Extra Income */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
              <Wallet size={16} className="text-amber-400" /> Extra Income
            </h2>
            <p className="text-gray-500 text-xs mb-3">One-time income: gifts, refunds, bonuses, side hustle</p>

            {/* Add row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                value={newExtraCategory}
                onChange={(e) => setNewExtraCategory(e.target.value)}
              >
                {EXTRA_INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Amount"
                  value={newExtraAmount}
                  onChange={(e) => setNewExtraAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addExtraIncome(); }}
                />
              </div>
              <input
                className="col-span-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="Note (optional, e.g. Birthday gift from mom)"
                value={newExtraNote}
                onChange={(e) => setNewExtraNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addExtraIncome(); }}
              />
              <button
                onClick={addExtraIncome}
                disabled={!newExtraAmount}
                className="col-span-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 py-2.5"
              >
                <Plus size={15} /> Add Extra Income
              </button>
            </div>

            {/* List */}
            {extraIncomes.length > 0 && (
              <div className="space-y-1 border-t border-gray-800 pt-3">
                {extraIncomes.map((extra) => {
                  const alreadyScheduled = scheduledPayments.some(
                    (sp) => sp.status === 'pending' && sp.note === (extra.note || extra.category) && sp.amount === extra.amount
                  );
                  return (
                    <div key={extra.id} className="py-1.5 border-b border-gray-800/60 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0">
                            {extra.category}
                          </span>
                          {extra.note && <span className="text-gray-500 text-xs truncate">{extra.note}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-400 font-medium text-sm">+{formatCurrency(extra.amount)}</span>
                          <button
                            onClick={() => openScheduleModal(extra)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="Schedule as debt payment"
                          >
                            <Clock size={11} /> Schedule
                          </button>
                          <button onClick={() => removeExtraIncome(extra.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {alreadyScheduled && (
                        <p className="text-blue-400/70 text-xs mt-0.5 flex items-center gap-1">
                          <CalendarCheck size={10} /> Payment scheduled
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm font-medium">Total Extra</span>
                  <span className="text-emerald-400 font-bold">+{formatCurrency(totalExtraIncome)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Add Expense */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Plus size={16} className="text-blue-400" /> Add Expense
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'fixed' | 'variable')}
              >
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Amount"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addExpense(); }}
                />
              </div>
              <button onClick={addExpense} disabled={!newAmount} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <Plus size={15} /> Add
              </button>
            </div>
          </div>

          {/* Expense List */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-red-400" /> Expenses
            </h2>
            {!budget || budget.expenses.length === 0 ? (
              <p className="text-gray-600 text-sm">No expenses added for this month.</p>
            ) : (
              <div className="space-y-1">
                {budget.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${expense.type === 'fixed' ? 'bg-gray-700 text-gray-300' : 'bg-amber-500/10 text-amber-400'}`}>
                        {expense.type}
                      </span>
                      <span className="text-gray-300 text-sm">{expense.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium text-sm">{formatCurrency(expense.amount)}</span>
                      <button onClick={() => removeExpense(expense.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-700">
                  <span className="text-gray-400 text-sm font-medium">Total</span>
                  <span className="text-white font-bold">{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <PiggyBank size={16} className="text-emerald-400" /> Spending Breakdown
            </h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [formatCurrency(v)]} />
                  <Legend formatter={(v) => <span className="text-gray-300 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Add expenses to see breakdown</div>
            )}
          </div>

          {/* Income vs Expenses Bar */}
          {(income > 0 || totalExtraIncome > 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Budget Health</h2>
              <div className="space-y-3">
                {(() => {
                  const totalIn = income + totalExtraIncome;
                  return <>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Expenses ({totalIn > 0 ? ((totalExpenses / totalIn) * 100).toFixed(0) : 0}%)</span>
                        <span>{formatCurrency(totalExpenses)}</span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${Math.min(100, totalIn > 0 ? (totalExpenses / totalIn) * 100 : 0)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Surplus ({totalIn > 0 ? ((Math.max(0, surplus) / totalIn) * 100).toFixed(0) : 0}%)</span>
                        <span className="text-emerald-400">{formatCurrency(Math.max(0, surplus))}</span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalIn > 0 ? Math.min(100, (Math.max(0, surplus) / totalIn) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </>;
                })()}
                <p className="text-gray-600 text-xs pt-1">50/30/20 Rule: 50% needs, 30% wants, 20% savings/debt</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Schedule Payment Modal */}
    {scheduleSource && (
      <Modal title="Schedule a Debt Payment" onClose={() => setScheduleSource(null)} size="sm">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Apply <strong className="text-white">{formatCurrency(parseFloat(schedAmount) || 0)}</strong> from{' '}
            <span className="text-amber-400">{scheduleSource.category}</span> toward a specific debt on a chosen date.
          </p>

          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Apply to Debt *</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              value={schedDebtId}
              onChange={(e) => setSchedDebtId(e.target.value)}
            >
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {formatCurrency(d.balance)} remaining
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Payment Amount ($) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                value={schedAmount}
                onChange={(e) => setSchedAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Payment Date *</label>
            <input
              type="date"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
            />
            <p className="text-gray-600 text-xs mt-1">Set a future date if you don't have the money yet.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setScheduleSource(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSchedulePayment}
              disabled={!schedDebtId || !schedDate || !schedAmount}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <CalendarCheck size={15} /> Schedule Payment
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
