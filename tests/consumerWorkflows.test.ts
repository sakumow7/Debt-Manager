import test from 'node:test';
import assert from 'node:assert/strict';
import { debtsFromCSV, parseCSVNumber } from '../src/lib/csvImport.ts';
import { budgetSurplus } from '../src/lib/budgetCalculations.ts';
import { checkPaymentReminders } from '../src/lib/reminders.ts';

test('CSV imports every parsed row, including after the file input is reset', () => {
  const rows = Array.from({ length: 6 }, (_, index) => [`Card ${index + 1}`, '$1,234.56', '0%', '25', 'credit_card', '31']);
  const debts = debtsFromCSV(rows, ['name', 'balance', 'interestRate', 'minimumPayment', 'type', 'dueDate']);
  assert.equal(debts.length, 6); assert.equal(debts[5].balance, 1234.56); assert.equal(debts[0].interestRate, 0);
  assert.equal(new Set(debts.map(d => d.id)).size, 6);
});
test('CSV rejects ambiguous mappings and invalid numeric fields without replacing them with zero', () => {
  for (const value of ['garbage', '-10', 'Infinity', '12oops', '']) assert.throws(() => parseCSVNumber(value));
  assert.throws(() => debtsFromCSV([['Card', '100', '25']], ['name', 'balance', 'balance']));
  assert.throws(() => debtsFromCSV([['Card', '100', '125']], ['name', 'balance', 'interestRate']));
});
test('one-time income cannot inflate recurring payment capacity', () => {
  const debts = debtsFromCSV([['Card', '1000', '100']], ['name', 'balance', 'minimumPayment']);
  const budget = { id: 'b', month: '2026-10', income: 2000, expenses: [{ id: 'e', category: 'Housing/Rent', amount: 1800, type: 'fixed' as const }], extraIncomes: [{ id: 'x', category: 'Gift', amount: 1000 }] };
  assert.deepEqual(budgetSurplus(budget, debts), { recurring: 100, total: 1100, unlistedMinimums: 100 });
  budget.expenses.push({ id: 'p', category: 'Debt Payments', amount: 100, type: 'fixed' });
  assert.deepEqual(budgetSurplus(budget, debts), { recurring: 100, total: 1100, unlistedMinimums: 0 });
});
test('payment reminders call the preload API with separate title and body and retry failed delivery', async () => {
  const memory = new Map<string, string>(); let delivered = false; const calls: unknown[][] = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { electronAPI: { showNotification: async (...args: unknown[]) => { calls.push(args); return delivered; } } } });
  const debts = debtsFromCSV([['Card', '100', '10', String(new Date().getDate())]], ['name', 'balance', 'minimumPayment', 'dueDate']);
  const settings = { extraMonthlyPayment: 0, currency: 'USD', preferredStrategy: 'avalanche' as const, plaidAccounts: [], notificationsEnabled: true };
  await checkPaymentReminders(debts, settings); assert.equal(memory.size, 0);
  delivered = true; await checkPaymentReminders(debts, settings);
  assert.equal(calls.length, 2); assert.equal(calls[0].length, 2); assert.equal(typeof calls[0][0], 'string');
  await checkPaymentReminders(debts, settings); assert.equal(calls.length, 2);
});

test('malformed AI tips cannot crash the tips renderer', async () => {
  const { parseSavingsTips } = await import('../src/lib/aiResponses.ts');
  const valid = { title: 'Reduce expenses', description: 'Review recurring costs', potentialSavings: 'Depends on spending', difficulty: 'easy', category: 'other', actionSteps: ['Review statements'] };
  assert.equal(parseSavingsTips(JSON.stringify({ tips: [valid] }))[0].title, valid.title);
  assert.throws(() => parseSavingsTips(JSON.stringify({ tips: [{ ...valid, actionSteps: 'bad' }] })));
  assert.throws(() => parseSavingsTips(JSON.stringify({ tips: [{ ...valid, difficulty: 'impossible' }] })));
});
