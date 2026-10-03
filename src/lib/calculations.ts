/**
 * Core financial calculation engine.
 *
 * Implements month-by-month debt payoff simulation for the Avalanche (highest APR
 * first), Snowball (lowest balance first), and Minimum-only strategies. Also
 * provides formatting helpers and the AI context builder used by the chat feature.
 */
import { getData } from './dataStore';
import type { Debt, AttackPlanResult, MonthlyScheduleItem, DebtPayoffInfo, ScheduledPayment } from '../types';

// ─── Scheduled payment helpers ────────────────────────────────────────────────

/**
 * Converts persisted ScheduledPayment records into the simulation-month format
 * used by calculatePayoffPlan. Month 1 is the first monthly interval.
 * Payments scheduled in the past or today are placed at month 1 so they are
 * applied immediately in the projection.
 */
export function scheduledToLumps(
  payments: ScheduledPayment[]
): { debtId: string; amount: number; month: number }[] {
  const now = new Date();
  return payments
    .filter((p) => p.status === 'pending')
    .map((p) => {
      const target = new Date(p.scheduledDate + 'T00:00:00');
      const month = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
      return { debtId: p.debtId, amount: p.amount, month };
    });
}

// Monthly estimates use fixed APR / 12 and fixed entered minimums, rounded to cents.
// They do not model lender-specific daily accrual or changing contractual minimums.
const MAX_MONTHS = 600;
const MAX_AMOUNT = 1_000_000_000;

function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT) {
    throw new Error('Amounts must be finite, non-negative, and at most 1 billion.');
  }
  return Math.round(value * 100);
}

export function projectionDate(start: Date, month: number): string {
  const day = start.getDate();
  const date = new Date(start.getFullYear(), start.getMonth() + month, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function effectiveExtraPayment(debts: Debt[], extraMonthly: number, biweekly: boolean): number {
  cents(extraMonthly);
  if (!biweekly) return extraMonthly;
  const minimums = debts.filter(d => d.balance > 0).reduce((sum, d) => sum + cents(d.minimumPayment), 0) / 100;
  return extraMonthly + (minimums + extraMonthly) / 12;
}

export function calculatePayoffPlan(
  debts: Debt[], extraMonthly: number, strategy: AttackPlanResult['strategy'],
  lumpSums: { debtId: string; amount: number; month: number }[] = [],
  startDate = new Date()
): AttackPlanResult {
  cents(extraMonthly);
  if (!['avalanche', 'snowball', 'minimum'].includes(strategy)) throw new Error('Invalid payoff strategy.');
  const ids = new Set<string>();
  const states = debts.map(d => {
    if (ids.has(d.id)) throw new Error('Duplicate debt ID.');
    ids.add(d.id);
    if (!Number.isFinite(d.interestRate) || d.interestRate < 0 || d.interestRate > 100) throw new Error('APR must be between 0 and 100.');
    return { id: d.id, name: d.name, balance: cents(d.balance), minPayment: cents(d.minimumPayment),
      monthlyRate: d.interestRate / 1200, interestPaid: 0, paidMonth: 0 };
  }).filter(d => d.balance > 0);
  for (const lump of lumpSums) {
    cents(lump.amount);
    if (!Number.isInteger(lump.month) || lump.month < 1) throw new Error('Invalid scheduled payment month.');
  }
  const startingBalance = states.reduce((sum, d) => sum + d.balance, 0) / 100;
  const monthlyBudget = states.reduce((sum, d) => sum + d.minPayment, 0) + (strategy === 'minimum' ? 0 : cents(extraMonthly));
  let globalInterest = 0;
  let month = 0;
  const schedule: MonthlyScheduleItem[] = [];
  while (states.some(d => d.balance > 0) && month < MAX_MONTHS && states.every(d => d.balance <= MAX_AMOUNT * 100)) {
    month++;
    const accruals = new Map<string, number>();
    const details = new Map<string, MonthlyScheduleItem['payments'][number]>();
    let interestThisMonth = 0;
    for (const d of states) {
      if (d.balance === 0) continue;
      let lumpPayment = 0;
      for (const lump of lumpSums.filter(l => l.month === month && l.debtId === d.id)) {
        const applied = Math.min(d.balance, cents(lump.amount));
        d.balance -= applied;
        lumpPayment += applied;
      }
      const interest = Math.round(d.balance * d.monthlyRate);
      accruals.set(d.id, interest);
      d.balance += interest;
      d.interestPaid += interest;
      interestThisMonth += interest;
      details.set(d.id, { debtId: d.id, payment: lumpPayment, principal: lumpPayment, interest: 0, balance: d.balance });
      if (d.balance === 0) d.paidMonth = month;
    }
    globalInterest += interestThisMonth;
    const active = states.filter(d => d.balance > 0).sort((a, b) =>
      strategy === 'avalanche' ? b.monthlyRate - a.monthlyRate : strategy === 'snowball' ? a.balance - b.balance : 0);
    let budget = monthlyBudget;
    const pay = (d: typeof states[number], amount: number) => {
      const payment = Math.min(amount, d.balance);
      d.balance -= payment;
      budget -= payment;
      const detail = details.get(d.id)!;
      detail.payment += payment;
      detail.balance = d.balance;
      if (d.balance === 0 && !d.paidMonth) d.paidMonth = month;
    };
    // Cover every active minimum before allocating extra. Minimum-only never rolls
    // freed payments to another debt; avalanche/snowball maintain the fixed budget.
    for (const d of active) pay(d, Math.min(d.minPayment, Math.max(0, budget)));
    if (strategy !== 'minimum') {
      for (const d of active) {
        if (budget <= 0) break;
        pay(d, budget);
      }
    }
    const payments = [...details.values()].map(detail => {
      // Interest paid is the part of the regular payment covering this month's accrual.
      const accrued = accruals.get(detail.debtId) || 0;
      const regularPayment = detail.payment - detail.principal;
      detail.interest = Math.min(regularPayment, accrued);
      detail.principal = detail.payment - detail.interest;
      return { ...detail, payment: detail.payment / 100, interest: detail.interest / 100,
        principal: detail.principal / 100, balance: detail.balance / 100 };
    });
    schedule.push({ month, payments, totalPayment: payments.reduce((sum, p) => sum + Math.round(p.payment * 100), 0) / 100,
      totalBalance: states.reduce((sum, d) => sum + d.balance, 0) / 100, totalInterest: interestThisMonth / 100 });
  }
  const remainingBalance = states.reduce((sum, d) => sum + d.balance, 0) / 100;
  const isPaidOff = remainingBalance === 0;
  return { strategy, startingBalance, remainingBalance, isPaidOff,
    totalInterestPaid: globalInterest / 100, totalMonths: month,
    payoffDate: isPaidOff ? projectionDate(startDate, month) : null,
    monthlySchedule: schedule, monthlyPayment: monthlyBudget / 100,
    debtPayoffInfo: states.filter(d => d.paidMonth > 0).sort((a, b) => a.paidMonth - b.paidMonth).map(d => ({
      debtId: d.id, debtName: d.name, month: d.paidMonth, date: projectionDate(startDate, d.paidMonth), totalInterestPaid: d.interestPaid / 100,
    })),
  };
}

/**
 * Downsamples multiple payoff schedules into a single chart-ready dataset.
 * All three strategy lines share the same month axis so Recharts can overlay them.
 */
export function getPayoffChartData(
  plans: { label: string; result: AttackPlanResult; color: string }[],
  samplePoints = 60
): { month: number; [key: string]: number }[] {
  if (plans.length === 0) return [];
  const maxMonths = Math.max(...plans.map((p) => p.result.totalMonths));
  if (maxMonths === 0) return [];

  const step = Math.max(1, Math.floor(maxMonths / samplePoints));
  const dataMap = new Map<number, { month: number; [key: string]: number }>();

  // Anchor at the actual starting balance, including when the first month has lump sums.
  dataMap.set(0, {
    month: 0,
    ...Object.fromEntries(
      plans.map((p) => {
        const start = p.result.startingBalance;
        return [p.label, start];
      })
    ),
  });

  for (const plan of plans) {
    const schedule = plan.result.monthlySchedule;
    for (let i = 0; i < schedule.length; i += step) {
      const item = schedule[i];
      const existing = dataMap.get(item.month) || { month: item.month };
      existing[plan.label] = item.totalBalance;
      dataMap.set(item.month, existing);
    }
    // Preserve the actual final balance when the horizon ends before payoff.
    const last = schedule[schedule.length - 1];
    if (last) {
      const existing = dataMap.get(last.month) || { month: last.month };
      existing[plan.label] = last.totalBalance;
      dataMap.set(last.month, existing);
    }
  }

  return Array.from(dataMap.values()).sort((a, b) => a.month - b.month);
}

export function displayCurrency(): string {
  return typeof localStorage === 'undefined' ? 'USD' : getData().settings.currency;
}
export function currencySymbol(): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency() }).formatToParts(0).find(part => part.type === 'currency')?.value || displayCurrency();
}
export function formatCurrency(amount: number, currency = displayCurrency()): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function monthsToYearsMonths(months: number): string {
  const years = Math.floor(months / 12);
  const m = months % 12;
  if (years === 0) return `${m}mo`;
  if (m === 0) return `${years}yr`;
  return `${years}yr ${m}mo`;
}

export function getDaysUntilDue(dueDate: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const clampedDay = (year: number, month: number) => Math.min(dueDate, new Date(year, month + 1, 0).getDate());
  let due = new Date(today.getFullYear(), today.getMonth(), clampedDay(today.getFullYear(), today.getMonth()));
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, clampedDay(today.getFullYear(), today.getMonth() + 1));
  return Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function getDebtProgress(debt: Debt): number {
  if (debt.originalBalance <= 0) return 0;
  const paid = debt.originalBalance - debt.balance;
  return Math.min(100, Math.max(0, (paid / debt.originalBalance) * 100));
}

export function getTotalPaid(debt: Debt): number {
  return debt.payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Builds a plain-text financial summary injected into the AI system prompt so
 * Claude has full context about the user's debts and monthly budget.
 */
export function generateDebtContext(
  debts: Debt[],
  budget?: { income: number; extraIncome: number; totalExpenses: number }
): string {
  if (debts.length === 0) return 'The user has no debts entered yet.';

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);

  let ctx = `Current Financial Situation:
Currency: ${displayCurrency()}
Total Debt: ${formatCurrency(totalDebt)}
Number of Debts: ${debts.length}
Total Minimum Monthly Payments: ${formatCurrency(totalMin)}

Debts:
${debts
  .map(
    (d) =>
      `- Debt ${debts.indexOf(d) + 1}: ${formatCurrency(d.balance)} balance, ${d.interestRate}% APR, ${formatCurrency(d.minimumPayment)}/mo minimum`
  )
  .join('\n')}`;

  if (budget) {
    const totalIncome = budget.income + budget.extraIncome;
    const surplus = totalIncome - budget.totalExpenses;
    ctx += `\n\nMonthly Budget:
Regular Income: ${formatCurrency(budget.income)}${budget.extraIncome > 0 ? `\nExtra / One-Time Income: ${formatCurrency(budget.extraIncome)}` : ''}
Total Income: ${formatCurrency(totalIncome)}
Total Expenses: ${formatCurrency(budget.totalExpenses)}
Monthly Surplus: ${formatCurrency(surplus)}`;
  }

  return ctx;
}

