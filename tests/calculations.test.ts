import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayoffPlan, getPayoffChartData, projectionDate, generateDebtContext, effectiveExtraPayment } from '../src/lib/calculations.ts';
import type { Debt } from '../src/types/index.ts';
const debt = (id: string, balance: number, minimumPayment: number, interestRate = 0): Debt => ({ id, name: 'Private Name', creditor: 'Private Creditor', type: 'credit_card', balance, originalBalance: balance, minimumPayment, interestRate, dueDate: 31, color: '#ff0000', createdAt: '2026-01-01', updatedAt: '2026-01-01', payments: [] });

test('zero APR is paid exactly in cents with a capped final payment', () => {
  const result = calculatePayoffPlan([debt('a', 100.01, 25)], 0, 'minimum');
  assert.equal(result.isPaidOff, true); assert.equal(result.totalMonths, 5);
  assert.equal(result.monthlySchedule.at(-1)?.totalPayment, 0.01);
  assert.equal(result.totalInterestPaid, 0);
});
test('avalanche covers minimums then rolls same-month unused funds to the next debt', () => {
  const result = calculatePayoffPlan([debt('a', 40, 10, 12), debt('b', 200, 10)], 80, 'avalanche');
  const first = result.monthlySchedule[0];
  assert.equal(first.totalPayment, 100);
  assert.equal(first.payments.find(p => p.debtId === 'a')?.payment, 40.4);
  assert.equal(first.payments.find(p => p.debtId === 'b')?.payment, 59.6);
  assert.equal(first.totalBalance, 140.4);
});
test('minimum-only does not transfer freed payments', () => {
  const result = calculatePayoffPlan([debt('a', 10, 10), debt('b', 100, 10)], 100, 'minimum');
  assert.equal(result.totalMonths, 10); assert.equal(result.monthlySchedule[1].totalPayment, 10);
});
test('interest and principal payment breakdown reconciles', () => {
  const result = calculatePayoffPlan([debt('a', 1000, 100, 12)], 0, 'minimum');
  assert.deepEqual(result.monthlySchedule[0].payments[0], { debtId: 'a', payment: 100, interest: 10, principal: 90, balance: 910 });
  const paid = result.monthlySchedule.reduce((sum, m) => sum + Math.round(m.totalPayment * 100), 0);
  assert.equal(paid, 100000 + Math.round(result.totalInterestPaid * 100));
});
test('insufficient payment retains outstanding debt and chart never invents zero', () => {
  const result = calculatePayoffPlan([debt('a', 1000, 1, 12)], 0, 'minimum');
  assert.equal(result.isPaidOff, false); assert.equal(result.payoffDate, null);
  assert.ok(result.remainingBalance > 1000);
  const chart = getPayoffChartData([{ label: 'Minimum', result, color: '#000000' }]);
  assert.equal(chart[0].Minimum, 1000); assert.equal(chart.at(-1)?.Minimum, result.remainingBalance);
});
test('lump sums appear in the schedule and preserve chart starting balance', () => {
  const result = calculatePayoffPlan([debt('a', 1000, 100, 12)], 0, 'avalanche', [{ debtId: 'a', amount: 500, month: 1 }]);
  assert.deepEqual(result.monthlySchedule[0].payments[0], { debtId: 'a', payment: 600, interest: 5, principal: 595, balance: 405 });
  assert.equal(result.monthlySchedule[0].totalPayment, 600);
  assert.equal(getPayoffChartData([{ label: 'Plan', result, color: '#000000' }])[0].Plan, 1000);
});
test('full lump payoff is recorded without fictitious interest', () => {
  const result = calculatePayoffPlan([debt('a', 100, 0, 12)], 0, 'minimum', [{ debtId: 'a', amount: 200, month: 1 }]);
  assert.equal(result.totalMonths, 1); assert.equal(result.monthlySchedule[0].totalPayment, 100);
  assert.equal(result.totalInterestPaid, 0); assert.equal(result.debtPayoffInfo[0].month, 1);
});
test('invalid inputs cannot create misleading plans', () => {
  for (const amount of [-1, Infinity, NaN]) assert.throws(() => calculatePayoffPlan([debt('a', 100, 10)], amount, 'snowball'));
  assert.throws(() => calculatePayoffPlan([debt('a', 100, 10, -1)], 0, 'minimum'));
  assert.throws(() => calculatePayoffPlan([debt('a', 100, 10), debt('a', 100, 10)], 0, 'minimum'));
});
test('month-end payoff dates clamp instead of skipping February', () => {
  assert.equal(projectionDate(new Date(2026, 0, 31), 1), '2026-02-28');
  assert.equal(projectionDate(new Date(2028, 0, 31), 1), '2028-02-29');
});
test('AI summary excludes user debt and creditor names', () => {
  const context = generateDebtContext([debt('a', 100, 10)]);
  assert.ok(!context.includes('Private Name')); assert.ok(!context.includes('Private Creditor'));
  assert.ok(context.includes('Debt 1'));
});
test('biweekly approximation budgets an extra annual payment', () => {
  assert.equal(effectiveExtraPayment([debt('a', 1000, 120)], 0, true), 10);
});
test('deterministic portfolios conserve money for every monthly record', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const debts = [debt('a', seed * 123.45, 20 + seed, seed % 30), debt('b', seed * 56.78, 30, 12)];
    for (const strategy of ['avalanche', 'snowball', 'minimum'] as const) {
      const plan = calculatePayoffPlan(debts, 100, strategy);
      let balance = Math.round(plan.startingBalance * 100);
      for (const month of plan.monthlySchedule) {
        assert.equal(Math.round(month.totalBalance * 100), balance + Math.round(month.totalInterest * 100) - Math.round(month.totalPayment * 100));
        assert.ok(month.totalPayment <= plan.monthlyPayment + 0.00001);
        for (const payment of month.payments) assert.equal(Math.round(payment.payment * 100), Math.round(payment.interest * 100) + Math.round(payment.principal * 100));
        balance = Math.round(month.totalBalance * 100);
      }
      assert.equal(plan.isPaidOff, plan.remainingBalance === 0);
    }
  }
});

test('due dates include today and clamp missing month-end days', async () => {
  const { getDaysUntilDue } = await import('../src/lib/calculations.ts');
  assert.equal(getDaysUntilDue(new Date().getDate()), 0);
  const days = getDaysUntilDue(31); assert.ok(days >= 0 && days <= 31);
});
