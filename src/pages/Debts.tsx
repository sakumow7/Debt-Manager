import { useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import type { Debt, DebtType, AppSettings } from '../types';
import { DEBT_TYPE_LABELS, DEBT_COLORS } from '../types';
import { formatCurrency, formatDate, getDebtProgress, getDaysUntilDue } from '../lib/calculations';
import { generateId } from '../lib/storage';

const DEBT_TYPES: DebtType[] = ['credit_card', 'student_loan', 'mortgage', 'auto', 'personal', 'medical', 'other'];

interface Props {
  debts: Debt[];
  setDebts: (debts: Debt[] | ((prev: Debt[]) => Debt[])) => void;
  settings: AppSettings;
}

const emptyForm = {
  name: '',
  creditor: '',
  type: 'credit_card' as DebtType,
  balance: '',
  interestRate: '',
  minimumPayment: '',
  dueDate: '15',
  notes: '',
};

export default function Debts({ debts, setDebts }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [showPayment, setShowPayment] = useState<Debt | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

    if (!form.name || isNaN(balance) || isNaN(interestRate) || isNaN(minimumPayment)) return;

    const now = new Date().toISOString();

    if (editDebt) {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === editDebt.id
            ? { ...d, name: form.name, creditor: form.creditor, type: form.type, balance, interestRate, minimumPayment, dueDate, notes: form.notes, updatedAt: now }
            : d
        )
      );
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
        dueDate,
        notes: form.notes,
        color: DEBT_COLORS[form.type],
        createdAt: now,
        updatedAt: now,
        payments: [],
      };
      setDebts((prev) => [...prev, newDebt]);
    }
    setShowAdd(false);
  }

  function handleLogPayment() {
    if (!showPayment) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const now = new Date().toISOString();
    setDebts((prev) =>
      prev.map((d) =>
        d.id === showPayment.id
          ? {
              ...d,
              balance: Math.max(0, d.balance - amount),
              updatedAt: now,
              payments: [...d.payments, { id: generateId(), amount, date: now.slice(0, 10), note: paymentNote || undefined, source: 'manual' }],
            }
          : d
      )
    );
    setPaymentAmount('');
    setPaymentNote('');
    setShowPayment(null);
  }

  function handleDelete(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirm(null);
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
        <button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
          <Plus size={16} /> Add Debt
        </button>
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
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(to right, ${debt.color}aa, ${debt.color})` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                        <span><span className="text-white font-medium">{debt.interestRate}%</span> APR</span>
                        <span><span className="text-white font-medium">{formatCurrency(debt.minimumPayment)}</span>/mo min</span>
                        <span>Due <span className="text-white font-medium">{debt.dueDate}{['st', 'nd', 'rd'][debt.dueDate - 1] || 'th'}</span></span>
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
    </div>
  );
}
