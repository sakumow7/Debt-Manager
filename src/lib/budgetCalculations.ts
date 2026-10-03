import type { Debt, MonthlyBudget } from '../types';
export function budgetSurplus(budget: MonthlyBudget | undefined, debts: Debt[]) {
  if (!budget) return { recurring: 0, total: 0, unlistedMinimums: 0 };
  const expenses = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  const listedDebtPayments = budget.expenses.filter(e => e.category === 'Debt Payments').reduce((sum, e) => sum + e.amount, 0);
  const minimums = debts.filter(d => d.balance > 0).reduce((sum, d) => sum + d.minimumPayment, 0);
  const unlistedMinimums = Math.max(0, minimums - listedDebtPayments);
  const recurring = Math.round((budget.income - expenses - unlistedMinimums) * 100) / 100;
  const extra = (budget.extraIncomes ?? []).reduce((sum, e) => sum + e.amount, 0);
  return { recurring, total: Math.round((recurring + extra) * 100) / 100, unlistedMinimums };
}
