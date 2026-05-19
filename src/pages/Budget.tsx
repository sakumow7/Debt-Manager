import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, PiggyBank, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthlyBudget, ExpenseItem, AppSettings } from '../types';
import { EXPENSE_CATEGORIES } from '../types';
import { formatCurrency } from '../lib/calculations';
import { generateId, currentMonth } from '../lib/storage';

interface Props {
  budgets: MonthlyBudget[];
  setBudgets: (b: MonthlyBudget[] | ((p: MonthlyBudget[]) => MonthlyBudget[])) => void;
  settings: AppSettings;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
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

export default function Budget({ budgets, setBudgets, settings, setSettings }: Props) {
  const [viewMonth, setViewMonth] = useState(currentMonth());
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'fixed' | 'variable'>('fixed');
  const [incomeInput, setIncomeInput] = useState('');

  const budget = budgets.find((b) => b.month === viewMonth);

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

  const totalExpenses = budget ? budget.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const income = budget?.income || 0;
  const surplus = income - totalExpenses;
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
          <p className="text-white text-xl font-bold">{formatCurrency(income)}</p>
          <p className="text-gray-600 text-xs mt-1">After tax take-home</p>
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
            <p className="text-emerald-300 text-sm">You have <strong>{formatCurrency(surplus)}</strong> surplus this month. Apply <strong>{formatCurrency(Math.round(surplus * 0.7))}</strong> (70%) to debt for optimal progress.</p>
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
          {income > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Budget Health</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Expenses ({income > 0 ? ((totalExpenses / income) * 100).toFixed(0) : 0}%)</span>
                    <span>{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${Math.min(100, income > 0 ? (totalExpenses / income) * 100 : 0)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Surplus ({income > 0 ? ((Math.max(0, surplus) / income) * 100).toFixed(0) : 0}%)</span>
                    <span className="text-emerald-400">{formatCurrency(Math.max(0, surplus))}</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${income > 0 ? Math.min(100, (Math.max(0, surplus) / income) * 100) : 0}%` }} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs pt-1">50/30/20 Rule: 50% needs, 30% wants, 20% savings/debt</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
