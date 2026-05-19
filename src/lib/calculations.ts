import type { Debt, AttackPlanResult, MonthlyScheduleItem, DebtPayoffInfo } from '../types';

const MAX_MONTHS = 600;

interface DebtState {
  id: string;
  name: string;
  balance: number;
  monthlyRate: number;
  minPayment: number;
  interestPaid: number;
  paidMonth: number;
}

function emptyResult(strategy: AttackPlanResult['strategy']): AttackPlanResult {
  return {
    strategy,
    totalInterestPaid: 0,
    totalMonths: 0,
    payoffDate: new Date().toISOString().slice(0, 10),
    monthlySchedule: [],
    debtPayoffInfo: [],
    monthlyPayment: 0,
  };
}

export function calculatePayoffPlan(
  debts: Debt[],
  extraMonthly: number,
  strategy: AttackPlanResult['strategy']
): AttackPlanResult {
  const activeDebts = debts.filter((d) => d.balance > 0);
  if (activeDebts.length === 0) return emptyResult(strategy);

  const states: DebtState[] = activeDebts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    monthlyRate: d.interestRate / 100 / 12,
    minPayment: d.minimumPayment,
    interestPaid: 0,
    paidMonth: 0,
  }));

  const totalMinimums = states.reduce((s, d) => s + d.minPayment, 0);
  const monthlyBudget = totalMinimums + (strategy === 'minimum' ? 0 : extraMonthly);

  let globalInterest = 0;
  let month = 0;
  const schedule: MonthlyScheduleItem[] = [];

  while (states.some((s) => s.balance > 0.01) && month < MAX_MONTHS) {
    month++;
    let interestThisMonth = 0;

    for (const s of states) {
      if (s.balance < 0.01) continue;
      const interest = s.balance * s.monthlyRate;
      s.balance += interest;
      s.interestPaid += interest;
      globalInterest += interest;
      interestThisMonth += interest;
    }

    const active = states
      .filter((s) => s.balance > 0.01)
      .sort((a, b) => {
        if (strategy === 'avalanche') return b.monthlyRate - a.monthlyRate;
        if (strategy === 'snowball') return a.balance - b.balance;
        return 0;
      });

    let budget = monthlyBudget;
    const payments: MonthlyScheduleItem['payments'] = [];

    for (let i = 1; i < active.length; i++) {
      const s = active[i];
      const pmt = Math.min(s.minPayment, s.balance);
      s.balance = Math.max(0, s.balance - pmt);
      budget -= pmt;
      if (s.balance < 0.01) { s.balance = 0; if (!s.paidMonth) s.paidMonth = month; }
      payments.push({ debtId: s.id, payment: pmt, interest: 0, principal: pmt, balance: s.balance });
    }

    if (active.length > 0) {
      const target = active[0];
      const pmt = Math.min(Math.max(0, budget), target.balance);
      target.balance = Math.max(0, target.balance - pmt);
      budget -= pmt;
      if (target.balance < 0.01) { target.balance = 0; if (!target.paidMonth) target.paidMonth = month; }
      payments.push({ debtId: target.id, payment: pmt, interest: 0, principal: pmt, balance: target.balance });
    }

    const totalBalance = states.reduce((s, d) => s + Math.max(0, d.balance), 0);
    schedule.push({ month, payments, totalPayment: monthlyBudget - Math.max(0, budget), totalBalance, totalInterest: interestThisMonth });
  }

  const now = new Date();
  const payoffDate = new Date(now);
  payoffDate.setMonth(payoffDate.getMonth() + month);

  const debtPayoffInfo: DebtPayoffInfo[] = states
    .filter((s) => s.paidMonth > 0)
    .sort((a, b) => a.paidMonth - b.paidMonth)
    .map((s) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + s.paidMonth);
      return {
        debtId: s.id,
        debtName: s.name,
        month: s.paidMonth,
        date: d.toISOString().slice(0, 10),
        totalInterestPaid: s.interestPaid,
      };
    });

  return {
    strategy,
    totalInterestPaid: globalInterest,
    totalMonths: month,
    payoffDate: payoffDate.toISOString().slice(0, 10),
    monthlySchedule: schedule,
    debtPayoffInfo,
    monthlyPayment: monthlyBudget,
  };
}

export function getPayoffChartData(
  plans: { label: string; result: AttackPlanResult; color: string }[],
  samplePoints = 60
): { month: number; [key: string]: number }[] {
  if (plans.length === 0) return [];
  const maxMonths = Math.max(...plans.map((p) => p.result.totalMonths));
  if (maxMonths === 0) return [];

  const step = Math.max(1, Math.floor(maxMonths / samplePoints));
  const dataMap = new Map<number, { month: number; [key: string]: number }>();

  dataMap.set(0, { month: 0, ...Object.fromEntries(plans.map((p) => [p.label, p.result.monthlySchedule[0] ? plans[0].result.monthlySchedule[0].totalBalance + plans[0].result.monthlyPayment : 0])) });

  for (const plan of plans) {
    const schedule = plan.result.monthlySchedule;
    for (let i = 0; i < schedule.length; i += step) {
      const item = schedule[i];
      const existing = dataMap.get(item.month) || { month: item.month };
      existing[plan.label] = Math.round(item.totalBalance);
      dataMap.set(item.month, existing);
    }
    // Ensure last point is 0
    const last = schedule[schedule.length - 1];
    if (last) {
      const existing = dataMap.get(last.month) || { month: last.month };
      existing[plan.label] = 0;
      dataMap.set(last.month, existing);
    }
  }

  return Array.from(dataMap.values()).sort((a, b) => a.month - b.month);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate);
  if (thisMonth < today) thisMonth.setMonth(thisMonth.getMonth() + 1);
  return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDebtProgress(debt: Debt): number {
  if (debt.originalBalance <= 0) return 0;
  const paid = debt.originalBalance - debt.balance;
  return Math.min(100, Math.max(0, (paid / debt.originalBalance) * 100));
}

export function getTotalPaid(debt: Debt): number {
  return debt.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function generateDebtContext(debts: Debt[], budget?: { income: number; totalExpenses: number }): string {
  if (debts.length === 0) return 'The user has no debts entered yet.';

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);

  let ctx = `Current Financial Situation:
Total Debt: $${totalDebt.toLocaleString()}
Number of Debts: ${debts.length}
Total Minimum Monthly Payments: $${totalMin.toLocaleString()}

Debts:
${debts
  .map(
    (d) =>
      `- ${d.name} (${d.creditor}): $${d.balance.toLocaleString()} balance, ${d.interestRate}% APR, $${d.minimumPayment}/mo minimum`
  )
  .join('\n')}`;

  if (budget) {
    const surplus = budget.income - budget.totalExpenses;
    ctx += `\n\nMonthly Budget:
Income: $${budget.income.toLocaleString()}
Total Expenses: $${budget.totalExpenses.toLocaleString()}
Monthly Surplus: $${surplus.toLocaleString()}`;
  }

  return ctx;
}
