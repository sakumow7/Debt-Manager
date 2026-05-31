import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Target, TrendingDown, Check, Flame, Snowflake, Minus, ChevronRight, ChevronDown, ChevronUp, CalendarCheck, ArrowLeftRight, CalendarDays } from 'lucide-react';
import type { Debt, AppSettings, ScheduledPayment, MonthlyScheduleItem } from '../types';
import { calculatePayoffPlan, formatCurrency, formatDate, monthsToYearsMonths, getPayoffChartData, scheduledToLumps, effectiveExtraPayment } from '../lib/calculations';
import type { AttackPlanResult } from '../types';
import type { ToastType } from '../hooks/useToast';

interface Props {
  debts: Debt[];
  settings: AppSettings;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  scheduledPayments: ScheduledPayment[];
  addToast: (msg: string, type?: ToastType) => void;
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ result, label, icon: Icon, color, borderColor, saving, isSelected, onSelect }: {
  result: AttackPlanResult; label: string; icon: React.ElementType; color: string; borderColor: string;
  saving?: number; isSelected: boolean; onSelect: () => void;
}) {
  return (
    <div onClick={onSelect} className={`bg-gray-900 border-2 rounded-2xl p-5 cursor-pointer transition-all ${isSelected ? borderColor : 'border-gray-800 hover:border-gray-700'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className={isSelected ? color : 'text-gray-500'} />
          <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{label}</h3>
        </div>
        {isSelected && (
          <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Check size={10} /> Selected
          </span>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Debt-Free</span>
          <span className="text-white font-semibold text-sm">{result.totalMonths > 0 ? formatDate(result.payoffDate) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Time</span>
          <span className="text-white text-sm">{result.totalMonths > 0 ? monthsToYearsMonths(result.totalMonths) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Total Interest</span>
          <span className="text-red-400 text-sm">{formatCurrency(result.totalInterestPaid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Monthly Payment</span>
          <span className="text-white font-semibold text-sm">{formatCurrency(result.monthlyPayment)}</span>
        </div>
        {saving !== undefined && saving > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Interest Saved</span>
              <span className="text-emerald-400 font-semibold text-sm">+{formatCurrency(saving)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Debt Breakdown Row ───────────────────────────────────────────────────────

function monthLabel(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

interface BreakdownRow { month: number; balance: number; payment: number; isLump: boolean; paidOff: boolean; }

function DebtBreakdownRow({ debt, schedule, lumps }: { debt: Debt; schedule: MonthlyScheduleItem[]; lumps: { debtId: string; amount: number; month: number }[]; }) {
  const [open, setOpen] = useState(false);
  const lumpMonths = useMemo(() => new Set(lumps.filter((l) => l.debtId === debt.id).map((l) => l.month)), [lumps, debt.id]);

  const rows = useMemo<BreakdownRow[]>(() => {
    const result: BreakdownRow[] = [{ month: 0, balance: debt.balance, payment: 0, isLump: false, paidOff: false }];
    for (const item of schedule) {
      const pmt = item.payments.find((p) => p.debtId === debt.id);
      if (!pmt) continue;
      const paidOff = pmt.balance < 0.01;
      result.push({ month: item.month, balance: pmt.balance, payment: pmt.payment, isLump: lumpMonths.has(item.month), paidOff });
      if (paidOff) break;
    }
    return result;
  }, [debt.balance, debt.id, schedule, lumpMonths]);

  const payoffRow = rows.find((r) => r.paidOff);

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: debt.color }} />
          <span className="text-gray-200 text-sm font-medium truncate">{debt.name}</span>
          <span className="text-gray-500 text-xs shrink-0">{formatCurrency(debt.balance)}</span>
          {lumpMonths.size > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-400 shrink-0">
              <CalendarCheck size={11} /> {lumpMonths.size} lump sum{lumpMonths.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {payoffRow ? (
            <span className="text-emerald-400 text-xs font-medium">{monthLabel(payoffRow.month)}</span>
          ) : (
            <span className="text-gray-600 text-xs">Not paid off in projection</span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-950 border-b border-gray-800 z-10">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Month</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Date</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Balance</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Payment</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className={`border-b border-gray-800/40 last:border-0 ${row.paidOff ? 'bg-emerald-500/5' : row.isLump ? 'bg-blue-500/5' : ''}`}>
                  <td className="px-4 py-2 text-gray-500">{row.month === 0 ? 'Now' : `M${row.month}`}</td>
                  <td className="px-4 py-2 text-gray-400">{monthLabel(row.month)}</td>
                  <td className="px-4 py-2 text-right font-semibold" style={{ color: debt.color }}>{formatCurrency(row.balance)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{row.payment > 0 ? formatCurrency(row.payment) : '—'}</td>
                  <td className="px-4 py-2 text-left">
                    {row.isLump && !row.paidOff && <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">lump sum</span>}
                    {row.paidOff && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">✓ paid off</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Balance Transfer Calculator ──────────────────────────────────────────────

function BalanceTransferCalc({ debts }: { debts: Debt[] }) {
  const cards = debts.filter((d) => d.type === 'credit_card' && d.balance > 0);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFee, setTransferFee] = useState('3');
  const [promoPeriod, setPromoPeriod] = useState('15');
  const [postPromoAPR, setPostPromoAPR] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [sourceDebtId, setSourceDebtId] = useState(cards[0]?.id || '');

  const sourceDebt = debts.find((d) => d.id === sourceDebtId);

  const result = useMemo(() => {
    const amount = parseFloat(transferAmount);
    const fee = parseFloat(transferFee) / 100;
    const promoMonths = parseInt(promoPeriod);
    const postAPR = parseFloat(postPromoAPR) / 100 / 12;
    const payment = parseFloat(monthlyPayment);
    const currentAPR = (sourceDebt?.interestRate || 20) / 100 / 12;

    if (isNaN(amount) || amount <= 0 || isNaN(payment) || payment <= 0) return null;

    const feeAmount = amount * fee;
    let transferBalance = amount + feeAmount;
    let transferInterest = 0;

    // Promo period (0% APR)
    for (let i = 0; i < promoMonths && transferBalance > 0.01; i++) {
      const pmt = Math.min(payment, transferBalance);
      transferBalance -= pmt;
    }

    // Post-promo period
    if (!isNaN(postAPR) && postAPR > 0) {
      let postMonths = 0;
      while (transferBalance > 0.01 && postMonths < 600) {
        const interest = transferBalance * postAPR;
        transferBalance += interest;
        transferInterest += interest;
        const pmt = Math.min(payment, transferBalance);
        transferBalance -= pmt;
        postMonths++;
      }
    }

    // Current approach
    let currentBalance = amount;
    let currentInterest = 0;
    let currentMonths = 0;
    while (currentBalance > 0.01 && currentMonths < 600) {
      const interest = currentBalance * currentAPR;
      currentBalance += interest;
      currentInterest += interest;
      const pmt = Math.min(payment, currentBalance);
      currentBalance -= pmt;
      currentMonths++;
    }

    const transferTotal = feeAmount + transferInterest;
    const savings = currentInterest - transferTotal;

    return { feeAmount, transferInterest, transferTotal, currentInterest, savings, currentMonths };
  }, [transferAmount, transferFee, promoPeriod, postPromoAPR, monthlyPayment, sourceDebt]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <ArrowLeftRight size={16} className="text-purple-400" />
        <h2 className="text-white font-semibold">Balance Transfer Calculator</h2>
      </div>
      <p className="text-gray-500 text-xs mb-5">Model a 0% promotional transfer vs paying at your current APR</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {cards.length > 0 && (
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Source Debt</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={sourceDebtId}
              onChange={(e) => {
                setSourceDebtId(e.target.value);
                const d = debts.find((x) => x.id === e.target.value);
                if (d) setTransferAmount(String(d.balance));
              }}
            >
              {cards.map((d) => <option key={d.id} value={d.id}>{d.name} ({formatCurrency(d.balance)})</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Transfer Amount ($)</label>
          <input type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 5000" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Transfer Fee (%)</label>
          <input type="number" min="0" max="10" step="0.5" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="3" value={transferFee} onChange={(e) => setTransferFee(e.target.value)} />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Promo Period (months)</label>
          <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" value={promoPeriod} onChange={(e) => setPromoPeriod(e.target.value)}>
            {[12, 15, 18, 21, 24].map((m) => <option key={m} value={m}>{m} months (0% APR)</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Post-Promo APR (%)</label>
          <input type="number" min="0" max="100" step="0.1" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 24.99" value={postPromoAPR} onChange={(e) => setPostPromoAPR(e.target.value)} />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Monthly Payment ($)</label>
          <input type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 300" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} />
        </div>
      </div>

      {result ? (
        <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs mb-1.5">With Balance Transfer</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Transfer Fee</span><span className="text-white">{formatCurrency(result.feeAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Post-Promo Interest</span><span className="text-white">{formatCurrency(result.transferInterest)}</span></div>
                <div className="flex justify-between text-sm font-semibold border-t border-gray-700 pt-1.5"><span className="text-gray-300">Total Cost</span><span className="text-purple-400">{formatCurrency(result.transferTotal)}</span></div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1.5">Without Transfer (Current APR)</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Interest ({sourceDebt?.interestRate || '?'}% APR)</span><span className="text-white">{formatCurrency(result.currentInterest)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Months</span><span className="text-white">{monthsToYearsMonths(result.currentMonths)}</span></div>
                <div className="flex justify-between text-sm font-semibold border-t border-gray-700 pt-1.5"><span className="text-gray-300">Total Cost</span><span className="text-red-400">{formatCurrency(result.currentInterest)}</span></div>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-3 text-center ${result.savings > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            {result.savings > 0 ? (
              <p className="text-emerald-400 font-semibold text-sm">Transfer saves you {formatCurrency(result.savings)}!</p>
            ) : (
              <p className="text-amber-400 font-semibold text-sm">Transfer costs {formatCurrency(-result.savings)} more — increase monthly payment</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-4">Enter a transfer amount and monthly payment to see the comparison</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttackPlan({ debts, settings, setSettings, scheduledPayments, addToast }: Props) {
  const [extra, setExtra] = useState(String(settings.extraMonthlyPayment));

  const extraNum = parseFloat(extra) || 0;
  const lumps = useMemo(() => scheduledToLumps(scheduledPayments), [scheduledPayments]);
  const biweekly = settings.biweeklyPayments ?? false;

  // Biweekly adds 1 extra payment per year (26 half-payments = 13 full vs 12).
  // Shared helper keeps this projection in sync with the Dashboard.
  const effectiveExtra = effectiveExtraPayment(debts, extraNum, biweekly);
  const biweeklyBonus = effectiveExtra - extraNum;

  const avalanche = useMemo(() => calculatePayoffPlan(debts, effectiveExtra, 'avalanche', lumps), [debts, effectiveExtra, lumps]);
  const snowball = useMemo(() => calculatePayoffPlan(debts, effectiveExtra, 'snowball', lumps), [debts, effectiveExtra, lumps]);
  const minimum = useMemo(() => calculatePayoffPlan(debts, 0, 'minimum', lumps), [debts, lumps]);

  const chartData = useMemo(() =>
    getPayoffChartData([
      { label: 'Avalanche', result: avalanche, color: '#ef4444' },
      { label: 'Snowball', result: snowball, color: '#3b82f6' },
      { label: 'Minimum Only', result: minimum, color: '#6b7280' },
    ]),
    [avalanche, snowball, minimum]
  );

  function applyExtra() {
    setSettings((prev) => ({ ...prev, extraMonthlyPayment: extraNum }));
    addToast('Extra payment updated', 'success');
  }

  const selected = settings.preferredStrategy;
  const selectedPlan = selected === 'avalanche' ? avalanche : snowball;

  if (debts.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Target size={40} className="text-gray-600 mb-3" />
        <p className="text-gray-400 text-lg font-medium">No debts to plan for</p>
        <p className="text-gray-600 text-sm mt-1">Add your debts first to generate attack plans</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-white text-2xl font-bold">Debt Attack Plan</h1>
        <p className="text-gray-400 text-sm mt-0.5">Compare strategies and accelerate your debt payoff</p>
      </div>

      {/* Extra Payment + Biweekly */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-1">Extra Monthly Payment</h2>
        <p className="text-gray-500 text-sm mb-4">Amount above minimums to apply toward debt each month. Even small amounts make a big difference.</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="10"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </div>
          <button onClick={applyExtra} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Apply
          </button>
        </div>

        {/* Biweekly toggle */}
        <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <CalendarDays size={16} className="text-blue-400" />
            <div>
              <p className="text-gray-200 text-sm font-medium">Biweekly Payments</p>
              <p className="text-gray-500 text-xs">Pay half your monthly amount every 2 weeks — equals 13 full payments/year</p>
            </div>
          </div>
          <button
            onClick={() => setSettings((p) => ({ ...p, biweeklyPayments: !p.biweeklyPayments }))}
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${biweekly ? 'bg-blue-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${biweekly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {biweekly && (
          <p className="text-blue-400 text-xs mt-2 flex items-center gap-1">
            <CalendarDays size={11} /> Biweekly adds ~{formatCurrency(biweeklyBonus)}/mo effective extra — saving time and interest
          </p>
        )}

        {extraNum > 0 && avalanche.totalMonths > 0 && minimum.totalMonths > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-emerald-400 font-bold">{monthsToYearsMonths(minimum.totalMonths - avalanche.totalMonths)}</p>
              <p className="text-gray-500 text-xs mt-0.5">Faster (Avalanche)</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-emerald-400 font-bold">{formatCurrency(minimum.totalInterestPaid - avalanche.totalInterestPaid)}</p>
              <p className="text-gray-500 text-xs mt-0.5">Interest Saved</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-white font-bold">{formatCurrency(extraNum * 12)}</p>
              <p className="text-gray-500 text-xs mt-0.5">Extra Per Year</p>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlanCard result={avalanche} label="Avalanche" icon={Flame} color="text-red-400" borderColor="border-red-500" saving={minimum.totalInterestPaid - avalanche.totalInterestPaid} isSelected={selected === 'avalanche'} onSelect={() => setSettings((p) => ({ ...p, preferredStrategy: 'avalanche' }))} />
        <PlanCard result={snowball} label="Snowball" icon={Snowflake} color="text-blue-400" borderColor="border-blue-500" saving={minimum.totalInterestPaid - snowball.totalInterestPaid} isSelected={selected === 'snowball'} onSelect={() => setSettings((p) => ({ ...p, preferredStrategy: 'snowball' }))} />
        <PlanCard result={minimum} label="Minimum Only" icon={Minus} color="text-gray-400" borderColor="border-gray-600" isSelected={false} onSelect={() => {}} />
      </div>

      {/* Strategy Explanations */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={15} className="text-red-400" />
            <h3 className="text-red-300 font-semibold text-sm">Avalanche Method</h3>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">Targets the debt with the <strong className="text-white">highest interest rate</strong> first. Mathematically optimal — saves the most money and pays off debt fastest.</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake size={15} className="text-blue-400" />
            <h3 className="text-blue-300 font-semibold text-sm">Snowball Method</h3>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">Targets the debt with the <strong className="text-white">lowest balance</strong> first. Builds momentum through quick wins. Great for staying motivated.</p>
        </div>
      </div>

      {/* Balance Over Time Chart */}
      {chartData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1">Balance Over Time</h2>
          <p className="text-gray-500 text-xs mb-5">Comparing all three strategies</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Months', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [formatCurrency(v)]} />
              <Legend formatter={(v) => <span className="text-gray-300 text-xs">{v}</span>} />
              <Line type="monotone" dataKey="Avalanche" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="Snowball" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="Minimum Only" stroke="#6b7280" strokeWidth={2} dot={false} strokeDasharray="4 4" isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payoff Order */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-1">
          {selected === 'avalanche' ? '🔥 Avalanche' : '❄️ Snowball'} Payoff Order
        </h2>
        <p className="text-gray-500 text-xs mb-4">Debts in the order they'll be eliminated with your selected strategy</p>
        <div className="space-y-2">
          {selectedPlan.debtPayoffInfo.map((info, i) => {
            const debt = debts.find((d) => d.id === info.debtId);
            if (!debt) return null;
            return (
              <div key={info.debtId} className="flex items-center gap-4 py-2.5 border-b border-gray-800 last:border-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${debt.color}20`, color: debt.color }}>
                  {i + 1}
                </div>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: debt.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm font-medium">{debt.name}</p>
                  <p className="text-gray-500 text-xs">{debt.creditor} · {debt.interestRate}% APR · {formatCurrency(debt.balance)} remaining</p>
                </div>
                <ChevronRight size={14} className="text-gray-700" />
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-medium">{formatDate(info.date)}</p>
                  <p className="text-gray-500 text-xs">{formatCurrency(info.totalInterestPaid)} interest</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Balance Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-1">Monthly Balance Breakdown</h2>
        <p className="text-gray-500 text-xs mb-4">
          Per-debt projection for the {selected === 'avalanche' ? 'Avalanche' : 'Snowball'} strategy
        </p>
        <div className="space-y-2">
          {(() => {
            const payoffOrder = new Map(selectedPlan.debtPayoffInfo.map((info, i) => [info.debtId, i]));
            return debts
              .filter((d) => d.balance > 0)
              .sort((a, b) => {
                const ia = payoffOrder.get(a.id) ?? Infinity;
                const ib = payoffOrder.get(b.id) ?? Infinity;
                return ia - ib;
              })
              .map((debt) => (
                <DebtBreakdownRow key={debt.id} debt={debt} schedule={selectedPlan.monthlySchedule} lumps={lumps} />
              ));
          })()}
        </div>
      </div>

      {/* Balance Transfer Calculator */}
      <BalanceTransferCalc debts={debts} />

      {/* Tips */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingDown size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Pro Tip: The Power of Extra Payments</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Even adding <strong className="text-white">$50–100/month</strong> above minimums can save thousands in interest. Biweekly payments add a 13th payment each year at no extra monthly budget.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
