import { useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, DollarSign, Calendar, RefreshCw, BarChart2, Upload } from 'lucide-react';
import Modal from '../components/ui/Modal';
import CelebrationModal from '../components/ui/CelebrationModal';
import CSVImportModal from '../components/ui/CSVImportModal';
import type { Debt, DebtType, AppSettings } from '../types';
import { DEBT_TYPE_LABELS, DEBT_COLORS } from '../types';
import { formatCurrency, formatDate, getDebtProgress, getDaysUntilDue } from '../lib/calculations';
import { generateId, ordinal } from '../lib/utils';
import type { ToastType } from '../hooks/useToast';

const DEBT_TYPES: DebtType[] = ['credit_card', 'student_loan', 'mortgage', 'auto', 'personal', 'medical', 'other'];

interface Props {
  debts: Debt[];
  setDebts: (debts: Debt[] | ((prev: Debt[]) => Debt[])) => void;
  settings: AppSettings;
  addToast: (msg: string, type?: ToastType) => void;
}

const emptyForm = {
  name: '',
  creditor: '',
  type: 'credit_card' as DebtType,
  balance: '',
  interestRate: '',
  minimumPayment: '',
  creditLimit: '',
  dueDate: '15',
  notes: '',
};

interface CelebrationData {
  debtName: string;
  originalBalance: number;
  totalPaid: number;
}

// ─── Credit Score Impact Estimator ────────────────────────────────────────────

function CreditScorePanel({ debts }: { debts: Debt[] }) {
  const cards = debts.filter((d) => d.type === 'credit_card');
  if (cards.length === 0) return null;

  // Utilization is only meaningful against real credit limits. Use only cards
  // that have a creditLimit set; never fabricate a limit from the balance.
  const cardsWithLimit = cards.filter((d) => (d.creditLimit ?? 0) > 0);

  if (cardsWithLimit.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={16} className="text-gray-400" />
          <h2 className="text-white font-semibold">Credit Score Impact Estimator</h2>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          Add a <strong className="text-gray-300">Credit Limit</strong> to your credit cards
          (via the edit button) to estimate your credit utilization and its impact on your score.
          Utilization is roughly 30% of a FICO score.
        </p>
      </div>
    );
  }

  const totalLimit = cardsWithLimit.reduce((s, d) => s + (d.creditLimit ?? 0), 0);
  const totalBalance = cardsWithLimit.reduce((s, d) => s + d.balance, 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  const cardsMissingLimit = cards.length - cardsWithLimit.length;

  let impact = '';
  let impactColor = '';
  let scoreDelta = '';
  if (utilization < 10) {
    impact = 'Excellent';
    impactColor = 'text-emerald-400';
    scoreDelta = '+40–60 pts';
  } else if (utilization < 30) {
    impact = 'Good';
    impactColor = 'text-blue-400';
    scoreDelta = '+10–30 pts';
  } else if (utilization < 50) {
    impact = 'Fair';
    impactColor = 'text-amber-400';
    scoreDelta = '−10–20 pts';
  } else if (utilization < 75) {
    impact = 'Poor';
    impactColor = 'text-orange-400';
    scoreDelta = '−30–50 pts';
  } else {
    impact = 'Very Poor';
    impactColor = 'text-red-400';
    scoreDelta = '−80–120 pts';
  }

  const barWidth = Math.min(100, utilization);
  const barColor = utilization < 10 ? '#10b981' : utilization < 30 ? '#3b82f6' : utilization < 50 ? '#f59e0b' : utilization < 75 ? '#f97316' : '#ef4444';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-gray-400" />
        <h2 className="text-white font-semibold">Credit Score Impact Estimator</h2>
      </div>
      <p className="text-gray-500 text-xs mb-4">
        Credit utilization accounts for ~30% of your FICO score. Based on {cardsWithLimit.length} credit card{cardsWithLimit.length > 1 ? 's' : ''} with a limit set
        {cardsMissingLimit > 0 && <span className="text-amber-400/80"> ({cardsMissingLimit} card{cardsMissingLimit > 1 ? 's' : ''} missing a limit — add one to include {cardsMissingLimit > 1 ? 'them' : 'it'})</span>}.
      </p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-white font-bold">{utilization.toFixed(1)}%</p>
          <p className="text-gray-500 text-xs mt-0.5">Utilization</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className={`font-bold ${impactColor}`}>{impact}</p>
          <p className="text-gray-500 text-xs mt-0.5">Rating</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className={`font-bold text-sm ${impactColor}`}>{scoreDelta}</p>
          <p className="text-gray-500 text-xs mt-0.5">Est. Score Impact</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatCurrency(totalBalance)} used</span>
          <span>{formatCurrency(totalLimit)} limit</span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barWidth}%`, background: barColor }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>0%</span>
          <span className="text-emerald-600">10% ideal</span>
          <span className="text-blue-600">30% ok</span>
          <span className="text-red-600">75%+</span>
          <span>100%</span>
        </div>
      </div>
      <p className="text-gray-600 text-xs mt-3">
        Tip: Keeping utilization under 10% can maximize your credit score improvement.
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Debts({ debts, setDebts, addToast }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [showPayment, setShowPayment] = useState<Debt | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  function openAdd() {
    setForm(emptyForm);
    setEditDebt(null);
    setShowAdd(true);
  }

  function openEdit(debt: Debt) {
    setForm({
      name: debt.name,
      creditor: debt.creditor,
      type: debt.type,
      balance: String(debt.balance),
      interestRate: String(debt.interestRate),
      minimumPayment: String(debt.minimumPayment),
      creditLimit: debt.creditLimit != null ? String(debt.creditLimit) : '',
      dueDate: String(debt.dueDate),
      notes: debt.notes || '',
    });
    setEditDebt(debt);
    setShowAdd(true);
  }

  function handleSubmit() {
    const balance = parseFloat(form.balance);
    const interestRate = parseFloat(form.interestRate);
    const minimumPayment = parseFloat(form.minimumPayment);
    const dueDate = parseInt(form.dueDate);
    const parsedLimit = parseFloat(form.creditLimit);
    // Credit limit only applies to credit cards; undefined when blank or N/A.
    const creditLimit = form.type === 'credit_card' && !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    if (!form.name || isNaN(balance) || isNaN(interestRate) || isNaN(minimumPayment)) return;

    const now = new Date().toISOString();

    if (editDebt) {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === editDebt.id
            ? { ...d, name: form.name, creditor: form.creditor, type: form.type, balance, interestRate, minimumPayment, creditLimit, dueDate, notes: form.notes, updatedAt: now }
            : d
        )
      );
      addToast(`${form.name} updated`, 'success');
    } else {
      const newDebt: Debt = {
        id: generateId(),
        name: form.name,
        creditor: form.creditor,
        type: form.type,
        balance,
        originalBalance: balance,
        interestRate,
        minimumPayment,
        creditLimit,
        dueDate,
        notes: form.notes,
        color: DEBT_COLORS[form.type],
        createdAt: now,
        updatedAt: now,
        payments: [],
      };
      setDebts((prev) => [...prev, newDebt]);
      addToast(`${form.name} added`, 'success');
    }
    setShowAdd(false);
  }

  function handleLogPayment() {
    if (!showPayment) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const now = new Date().toISOString();
    const newBalance = Math.max(0, showPayment.balance - amount);
    const isPaidOff = newBalance === 0;

    setDebts((prev) =>
      prev.map((d) =>
        d.id === showPayment.id
          ? {
              ...d,
              balance: newBalance,
              updatedAt: now,
              payments: [
                ...d.payments,
                { id: generateId(), amount, date: now.slice(0, 10), note: paymentNote || undefined, source: 'manual' },
              ],
            }
          : d
      )
    );

    if (isPaidOff) {
      const totalPaid = showPayment.payments.reduce((s, p) => s + p.amount, 0) + amount;
      setCelebration({ debtName: showPayment.name, originalBalance: showPayment.originalBalance, totalPaid });
    } else {
      addToast(`Payment of ${formatCurrency(amount)} logged for ${showPayment.name}`, 'success');
    }

    setPaymentAmount('');
    setPaymentNote('');
    setShowPayment(null);
  }

  function handleDelete(id: string) {
    const debt = debts.find((d) => d.id === id);
    setDebts((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirm(null);
    if (debt) addToast(`${debt.name} deleted`, 'info');
  }

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">My Debts</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {debts.length} debts · {formatCurrency(totalDebt)} total · {formatCurrency(totalMin)}/mo minimum
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCSVImport(true)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
            <Plus size={16} /> Add Debt
          </button>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center">
          <CreditCard size={40} className="text-gray-600 mb-3" />
          <p className="text-gray-400 text-lg font-medium">No debts added yet</p>
          <p className="text-gray-600 text-sm mt-1">Add your debts to start tracking your progress</p>
          <button onClick={openAdd} className="mt-5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
            <Plus size={16} /> Add First Debt
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDebts.map((debt) => {
            const progress = getDebtProgress(debt);
            const daysUntil = getDaysUntilDue(debt.dueDate);
            const isExpanded = expandedId === debt.id;

            return (
              <div key={debt.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${debt.color}20` }}>
                      <CreditCard size={18} style={{ color: debt.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-white font-semibold">{debt.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${debt.color}20`, color: debt.color }}>
                              {DEBT_TYPE_LABELS[debt.type]}
                            </span>
                            <span className="text-gray-500 text-xs">{debt.creditor}</span>
                            {daysUntil <= 7 && (
                              <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">Due in {daysUntil}d</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-bold text-lg">{formatCurrency(debt.balance)}</p>
                          <p className="text-gray-500 text-xs">of {formatCurrency(debt.originalBalance)}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-gray-500 text-xs">{progress.toFixed(1)}% paid off</span>
                          <span className="text-gray-500 text-xs">{formatCurrency(debt.originalBalance - debt.balance)} paid</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${progress}%`, background: `linear-gradient(to right, ${debt.color}aa, ${debt.color})` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                        <span><span className="text-white font-medium">{debt.interestRate}%</span> APR</span>
                        <span><span className="text-white font-medium">{formatCurrency(debt.minimumPayment)}</span>/mo min</span>
                        <span>Due <span className="text-white font-medium">{debt.dueDate}{ordinal(debt.dueDate)}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setShowPayment(debt); setPaymentAmount(''); setPaymentNote(''); }} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Log payment">
                        <DollarSign size={16} />
                      </button>
                      <button onClick={() => openEdit(debt)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteConfirm(debt.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : debt.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-800 px-5 py-4 bg-gray-950/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Calendar size={14} /> Payment History
                      </h4>
                    </div>
                    {debt.payments.length === 0 ? (
                      <p className="text-gray-600 text-sm">No payments recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...debt.payments].reverse().map((p) => (
                          <div key={p.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-800 last:border-0">
                            <div>
                              <span className="text-gray-300">{formatDate(p.date)}</span>
                              {p.note && <span className="text-gray-500 text-xs ml-2">{p.note}</span>}
                              {p.source === 'plaid' && <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded ml-2">Bank</span>}
                            </div>
                            <span className="text-emerald-400 font-medium">-{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {debt.notes && (
                      <p className="text-gray-500 text-xs mt-3 border-t border-gray-800 pt-3">{debt.notes}</p>
                    )}
                  </div>
                )}

                {deleteConfirm === debt.id && (
                  <div className="border-t border-red-900/50 bg-red-950/30 px-5 py-3 flex items-center justify-between">
                    <p className="text-red-300 text-sm">Delete <strong>{debt.name}</strong>? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-gray-400 hover:text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                      <button onClick={() => handleDelete(debt.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Credit Score Impact Estimator */}
      {debts.length > 0 && <CreditScorePanel debts={debts} />}

      {/* Add/Edit Modal */}
      {showAdd && (
        <Modal title={editDebt ? 'Edit Debt' : 'Add New Debt'} onClose={() => setShowAdd(false)} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs block mb-1.5">Debt Name *</label>
                <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Chase Sapphire" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Creditor / Lender</label>
                <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Chase Bank" value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Type *</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DebtType })}>
                  {DEBT_TYPES.map((t) => <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Current Balance ($) *</label>
                <input type="number" min="0" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="0.00" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Interest Rate (APR %) *</label>
                <input type="number" min="0" max="100" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 24.99" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Minimum Payment ($) *</label>
                <input type="number" min="0" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="0.00" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Due Date (day of month)</label>
                <input type="number" min="1" max="31" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="15" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              {form.type === 'credit_card' && (
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs block mb-1.5">Credit Limit ($) <span className="text-gray-600">— optional, enables credit utilization estimate</span></label>
                  <input type="number" min="0" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 10000" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                </div>
              )}
              <div className="col-span-2">
                <label className="text-gray-400 text-xs block mb-1.5">Notes (optional)</label>
                <textarea rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" placeholder="Any notes about this debt..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name || !form.balance || !form.interestRate || !form.minimumPayment} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {editDebt ? 'Save Changes' : 'Add Debt'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Log Payment Modal */}
      {showPayment && (
        <Modal title={`Log Payment — ${showPayment.name}`} onClose={() => setShowPayment(null)} size="sm">
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Balance</span>
                <span className="text-white font-semibold">{formatCurrency(showPayment.balance)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Minimum Payment</span>
                <span className="text-gray-300">{formatCurrency(showPayment.minimumPayment)}</span>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Payment Amount ($) *</label>
              <input type="number" min="0" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder={String(showPayment.minimumPayment)} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Note (optional)</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. March payment" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayment(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleLogPayment} disabled={!paymentAmount || isNaN(parseFloat(paymentAmount))} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <RefreshCw size={14} className="inline mr-1.5" />Log Payment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCSVImport && (
        <CSVImportModal
          onClose={() => setShowCSVImport(false)}
          onImport={(imported) => {
            setDebts(prev => [...prev, ...imported]);
            setShowCSVImport(false);
            addToast(`Imported ${imported.length} debt${imported.length !== 1 ? 's' : ''}`, 'success');
          }}
        />
      )}

      {celebration && (
        <CelebrationModal
          debtName={celebration.debtName}
          originalBalance={celebration.originalBalance}
          totalPaid={celebration.totalPaid}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
