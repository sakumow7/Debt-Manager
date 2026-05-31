/**
 * Dashboard — the app's home screen.
 *
 * Aggregates key metrics (total debt, payoff date, monthly payment, average APR),
 * a downsampled area chart of the projected payoff timeline, a donut chart of
 * debt breakdown by balance, per-debt progress bars, and upcoming payment reminders.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, Calendar, Percent, ArrowRight, AlertCircle, TrendingDown, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { ChiselIcon } from '../components/ui/ChiselIcon';
import type { Debt, MonthlyBudget, AppSettings, ScheduledPayment } from '../types';
import {
  calculatePayoffPlan,
  formatCurrency,
  formatDate,
  monthsToYearsMonths,
  getDebtProgress,
  getDaysUntilDue,
  scheduledToLumps,
  effectiveExtraPayment,
} from '../lib/calculations';
import { ordinal } from '../lib/utils';

interface Props {
  debts: Debt[];
  budgets: MonthlyBudget[];
  settings: AppSettings;
  scheduledPayments: ScheduledPayment[];
  onApplyScheduled: (id: string) => void;
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>{`${(percent * 100).toFixed(0)}%`}</text>;
}

export default function Dashboard({ debts, budgets, settings, scheduledPayments, onApplyScheduled }: Props) {
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const avgRate = debts.length ? debts.reduce((s, d) => s + d.interestRate, 0) / debts.length : 0;

  const bestPlan = useMemo(
    () => calculatePayoffPlan(
      debts,
      effectiveExtraPayment(debts, settings.extraMonthlyPayment, settings.biweeklyPayments ?? false),
      settings.preferredStrategy,
      scheduledToLumps(scheduledPayments)
    ),
    [debts, settings, scheduledPayments]
  );

  const currentBudget = budgets.find((b) => b.month === new Date().toISOString().slice(0, 7));
  const totalExpenses = currentBudget ? currentBudget.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const surplus = currentBudget ? currentBudget.income - totalExpenses : 0;

  const chartData = useMemo(() => {
    const schedule = bestPlan.monthlySchedule;
    if (schedule.length === 0) return [];
    // Downsample to ~24 points so the chart doesn't render hundreds of tiny segments.
    const step = Math.max(1, Math.floor(schedule.length / 24));
    return [
      { month: 'Now', balance: debts.reduce((s, d) => s + d.balance, 0) },
      ...schedule
        .filter((_, i) => i % step === 0)
        .map((s) => ({ month: `M${s.month}`, balance: Math.round(s.totalBalance) })),
      { month: 'Free!', balance: 0 },
    ];
  }, [bestPlan, debts]);

  const pieData = debts.map((d) => ({ name: d.name, value: d.balance, color: d.color }));

  // Merge regular monthly due dates with one-time scheduled payments, sorted by days until due.
  const upcomingRegular = debts.map((d) => ({
    kind: 'due' as const,
    key: d.id,
    label: d.name,
    sub: `Due on ${d.dueDate}${ordinal(d.dueDate)}`,
    amount: d.minimumPayment,
    color: d.color,
    daysUntil: getDaysUntilDue(d.dueDate),
    scheduledId: null as null,
  }));

  const upcomingScheduled = scheduledPayments
    .filter((p) => p.status === 'pending')
    .map((p) => {
      const debt = debts.find((d) => d.id === p.debtId);
      const target = new Date(p.scheduledDate + 'T00:00:00');
      const daysUntil = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        kind: 'scheduled' as const,
        key: p.id,
        label: debt?.name ?? 'Unknown debt',
        sub: p.note ?? 'Scheduled payment',
        amount: p.amount,
        color: debt?.color ?? '#f59e0b',
        daysUntil,
        scheduledId: p.id,
      };
    });

  const upcomingPayments = [...upcomingRegular, ...upcomingScheduled]
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  if (debts.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
          <ChiselIcon size={34} className="text-emerald-400" />
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">Welcome to Chisel</h1>
        <p className="text-gray-400 text-center max-w-md mb-6">
          Start by adding your debts to see your personalized payoff plan, progress tracking, and AI-powered money-saving tips.
        </p>
        <Link to="/debts" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors">
          Add Your First Debt <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Your debt-freedom journey at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Debt" value={formatCurrency(totalDebt)} sub={`${debts.length} active debt${debts.length !== 1 ? 's' : ''}`} icon={DollarSign} color="bg-red-500/80" />
        <StatCard label="Debt-Free Date" value={bestPlan.totalMonths > 0 ? formatDate(bestPlan.payoffDate) : '—'} sub={bestPlan.totalMonths > 0 ? monthsToYearsMonths(bestPlan.totalMonths) : 'Add extra payment'} icon={Calendar} color="bg-emerald-600/80" />
        <StatCard label="Monthly Payment" value={formatCurrency(totalMin + settings.extraMonthlyPayment)} sub={`${formatCurrency(totalMin)} minimum`} icon={TrendingDown} color="bg-blue-600/80" />
        <StatCard label="Avg. Interest" value={`${avgRate.toFixed(1)}%`} sub={`${formatCurrency(bestPlan.totalInterestPaid)} total interest`} icon={Percent} color="bg-amber-600/80" />
      </div>

      {surplus > 0 && settings.extraMonthlyPayment === 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm">
            You have a <strong>{formatCurrency(surplus)}/month surplus</strong> in your budget.{' '}
            <Link to="/attack-plan" className="underline hover:text-emerald-200">Add extra payments</Link> to pay off debt faster and save on interest.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payoff Timeline */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold">Payoff Timeline</h2>
              <p className="text-gray-500 text-xs mt-0.5">{settings.preferredStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'} strategy</p>
            </div>
            <Link to="/attack-plan" className="text-emerald-400 text-xs hover:text-emerald-300 flex items-center gap-1">
              See plans <ArrowRight size={12} />
            </Link>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }}
                  formatter={(v: number) => [formatCurrency(v), 'Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#balGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No data yet</div>
          )}
        </div>

        {/* Debt Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col">
          <h2 className="text-white font-semibold mb-2">Debt Breakdown</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" labelLine={false} label={CustomLabel}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [formatCurrency(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.color }} />
                    <span className="text-gray-400 text-xs truncate max-w-[110px]">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debt Progress */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Debt Progress</h2>
            <Link to="/debts" className="text-emerald-400 text-xs hover:text-emerald-300 flex items-center gap-1">Manage <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-4">
            {debts.slice(0, 4).map((debt) => {
              const progress = getDebtProgress(debt);
              return (
                <div key={debt.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: debt.color }} />
                      <span className="text-gray-300 text-sm">{debt.name}</span>
                    </div>
                    <span className="text-white text-sm font-medium">{formatCurrency(debt.balance)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: debt.color }} />
                  </div>
                  <p className="text-gray-600 text-xs mt-1">{progress.toFixed(1)}% paid off · {debt.interestRate}% APR</p>
                </div>
              );
            })}
            {debts.length > 4 && <p className="text-gray-500 text-xs">+{debts.length - 4} more debts</p>}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Upcoming Payments</h2>
          <div className="space-y-3">
            {upcomingPayments.map((item) => {
              const isOverdue = item.daysUntil <= 0;
              return (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    {item.kind === 'scheduled' ? (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}20` }}>
                        <CalendarCheck size={15} style={{ color: item.color }} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${item.color}20`, color: item.color }}>
                        {item.daysUntil}d
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-gray-200 text-sm font-medium">{item.label}</p>
                        {item.kind === 'scheduled' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">lump sum</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {item.kind === 'scheduled'
                          ? isOverdue ? 'Ready to apply' : `Scheduled · ${item.daysUntil}d away`
                          : item.sub}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-semibold text-sm">{formatCurrency(item.amount)}</span>
                    {item.kind === 'scheduled' && item.scheduledId && (
                      <button
                        onClick={() => onApplyScheduled(item.scheduledId!)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 size={11} /> Apply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
