import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Target, TrendingDown, Check, Flame, Snowflake, Minus, ChevronRight } from 'lucide-react';
import type { Debt, AppSettings } from '../types';
import { calculatePayoffPlan, formatCurrency, formatDate, monthsToYearsMonths, getPayoffChartData } from '../lib/calculations';
import type { AttackPlanResult } from '../types';

interface Props {
  debts: Debt[];
  settings: AppSettings;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
}

function PlanCard({
  result,
  label,
  icon: Icon,
  color,
  borderColor,
  saving,
  isSelected,
  onSelect,
}: {
  result: AttackPlanResult;
  label: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  saving?: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`bg-gray-900 border-2 rounded-2xl p-5 cursor-pointer transition-all ${isSelected ? borderColor : 'border-gray-800 hover:border-gray-700'}`}
    >
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

export default function AttackPlan({ debts, settings, setSettings }: Props) {
  const [extra, setExtra] = useState(String(settings.extraMonthlyPayment));

  const extraNum = parseFloat(extra) || 0;

  const avalanche = useMemo(() => calculatePayoffPlan(debts, extraNum, 'avalanche'), [debts, extraNum]);
  const snowball = useMemo(() => calculatePayoffPlan(debts, extraNum, 'snowball'), [debts, extraNum]);
  const minimum = useMemo(() => calculatePayoffPlan(debts, 0, 'minimum'), [debts]);

  const chartData = useMemo(
    () =>
      getPayoffChartData([
        { label: 'Avalanche', result: avalanche, color: '#ef4444' },
        { label: 'Snowball', result: snowball, color: '#3b82f6' },
        { label: 'Minimum Only', result: minimum, color: '#6b7280' },
      ]),
    [avalanche, snowball, minimum]
  );

  function applyExtra() {
    setSettings((prev) => ({ ...prev, extraMonthlyPayment: extraNum }));
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

      {/* Extra Payment Input */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-1">Extra Monthly Payment</h2>
        <p className="text-gray-500 text-sm mb-4">Amount above minimums to apply toward debt each month. Even small amounts make a big difference.</p>
        <div className="flex items-center gap-3">
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
          <button
            onClick={applyExtra}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Apply
          </button>
        </div>

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
        <PlanCard
          result={avalanche}
          label="Avalanche"
          icon={Flame}
          color="text-red-400"
          borderColor="border-red-500"
          saving={minimum.totalInterestPaid - avalanche.totalInterestPaid}
          isSelected={selected === 'avalanche'}
          onSelect={() => setSettings((p) => ({ ...p, preferredStrategy: 'avalanche' }))}
        />
        <PlanCard
          result={snowball}
          label="Snowball"
          icon={Snowflake}
          color="text-blue-400"
          borderColor="border-blue-500"
          saving={minimum.totalInterestPaid - snowball.totalInterestPaid}
          isSelected={selected === 'snowball'}
          onSelect={() => setSettings((p) => ({ ...p, preferredStrategy: 'snowball' }))}
        />
        <PlanCard
          result={minimum}
          label="Minimum Only"
          icon={Minus}
          color="text-gray-400"
          borderColor="border-gray-600"
          isSelected={false}
          onSelect={() => {}}
        />
      </div>

      {/* Strategy Explanations */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={15} className="text-red-400" />
            <h3 className="text-red-300 font-semibold text-sm">Avalanche Method</h3>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">Targets the debt with the <strong className="text-white">highest interest rate</strong> first. Mathematically optimal — saves the most money and pays off debt fastest. Best choice if you can stay motivated without quick wins.</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake size={15} className="text-blue-400" />
            <h3 className="text-blue-300 font-semibold text-sm">Snowball Method</h3>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">Targets the debt with the <strong className="text-white">lowest balance</strong> first. Builds momentum through quick wins as debts are eliminated. Great for staying motivated even if slightly more expensive.</p>
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
              <Line type="monotone" dataKey="Avalanche" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Snowball" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Minimum Only" stroke="#6b7280" strokeWidth={2} dot={false} strokeDasharray="4 4" />
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

      {/* Tips */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingDown size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Pro Tip: The Power of Extra Payments</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Even adding <strong className="text-white">$50–100/month</strong> above minimums can save thousands in interest and years off your payoff timeline. Use windfalls (tax refunds, bonuses) as extra debt payments for maximum impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
