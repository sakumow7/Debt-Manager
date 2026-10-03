import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, parseBackup, emptyData, validateData, replaceData, getData, DATA_KEY, updateData } from '../src/lib/dataStore.ts';
const timestamp = '2026-10-02T12:00:00.000Z';
const fixture = () => ({ ...emptyData(), debts: [{ id: 'd', name: 'Card', creditor: 'Bank', type: 'credit_card' as const, balance: 100, originalBalance: 100, interestRate: 12, minimumPayment: 10, dueDate: 31, color: '#ff0000', createdAt: timestamp, updatedAt: timestamp, payments: [] }],
  assets: [{ id: 'a', name: 'Savings', type: 'savings' as const, value: 200, createdAt: timestamp, updatedAt: timestamp }],
  chatMessages: [{ id: 'm', role: 'user' as const, content: 'Help', timestamp }],
  scheduledPayments: [{ id: 'p', debtId: 'd', amount: 50, scheduledDate: '2026-11-01', status: 'pending' as const, createdAt: timestamp }], onboardingComplete: true });
test('backup round trip includes every consumer collection', () => {
  assert.deepEqual(parseBackup(createBackup(fixture())), validateData(fixture()));
});
test('backup excludes bank tokens and unknown secret fields', () => {
  const data: any = fixture(); data.settings.anthropicKey = 'sensitive-key';
  data.settings.plaidAccounts = [{ account_id: 'acc', name: 'Card', type: 'credit', subtype: 'credit card', balances: { current: 100 }, accessToken: 'secret-bank-token' }];
  const backup = createBackup(data);
  assert.ok(!backup.includes('sensitive-key')); assert.ok(!backup.includes('secret-bank-token'));
  assert.deepEqual(parseBackup(backup).settings.plaidAccounts, []);
});
test('legacy backups remain importable without pretending missing records were saved', () => {
  const source = fixture(); const restored = parseBackup(JSON.stringify({ debts: source.debts, budgets: [], settings: source.settings }));
  assert.deepEqual(restored.assets, []); assert.deepEqual(restored.scheduledPayments, []);
  assert.equal(restored.debts.length, 1);
});
test('unsupported versions, duplicate IDs, malformed amounts and dates are rejected', () => {
  assert.throws(() => parseBackup('{"format":"chisel-finance","version":99,"data":{}}'));
  const data = fixture(); data.debts[0].balance = -1; assert.throws(() => validateData(data));
  const duplicate = fixture(); duplicate.debts.push(duplicate.debts[0]); assert.throws(() => validateData(duplicate));
  const malformed = fixture(); malformed.scheduledPayments[0].scheduledDate = '2026-02-31'; assert.throws(() => validateData(malformed));
  assert.throws(() => parseBackup('{}'));
});
test('one snapshot commits all records; failed persistence preserves memory and disk', () => {
  const memory = new Map<string, string>(); let fail = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { if (fail) throw new Error('Quota exceeded'); memory.set(key, value); },
    removeItem: (key: string) => memory.delete(key),
  } });
  replaceData(fixture()); const previous = getData(); const stored = memory.get(DATA_KEY);
  fail = true; assert.throws(() => replaceData(emptyData()));
  assert.equal(getData(), previous); assert.equal(memory.get(DATA_KEY), stored);
  fail = false;
  updateData(prev => ({ ...prev, debts: prev.debts.map(d => ({ ...d, balance: 50 })), scheduledPayments: [] }));
  const committed = JSON.parse(memory.get(DATA_KEY)!);
  assert.equal(committed.debts[0].balance, 50); assert.equal(committed.scheduledPayments.length, 0);
});

test('legacy data migrates all collections and removes secrets from the renderer snapshot', async () => {
  const memory = new Map<string, string>(); const source: any = fixture();
  source.settings.plaidAccounts = [{ account_id: 'acc', name: 'Card', type: 'credit', subtype: 'credit card', balances: { current: 100 }, accessToken: 'legacy-bank-token' }];
  for (const [key, value] of Object.entries({ 'dm-debts': source.debts, 'dm-budgets': source.budgets, 'dm-settings': source.settings, 'dm-chat': source.chatMessages, 'dm-assets': source.assets, 'dm-scheduled': source.scheduledPayments })) memory.set(key, JSON.stringify(value));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key),
  } });
  const fresh = await import('../src/lib/dataStore.ts?migration');
  const migrated = fresh.getData(); assert.equal(fresh.getDataError(), undefined);
  assert.equal(migrated.assets.length, 1); assert.equal(migrated.chatMessages.length, 1); assert.equal(migrated.scheduledPayments.length, 1);
  assert.ok(!memory.get(DATA_KEY)!.includes('legacy-bank-token')); assert.equal(memory.has('dm-settings'), false);
});
test('corrupt saved data is preserved and regular writes are blocked until recovery', async () => {
  const memory = new Map([[DATA_KEY, '{broken-json']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key),
  } });
  const fresh = await import('../src/lib/dataStore.ts?corrupt');
  fresh.getData(); assert.ok(fresh.getDataError());
  assert.throws(() => fresh.updateData(() => fixture())); assert.equal(memory.get(DATA_KEY), '{broken-json');
  assert.ok(fresh.recoveryCopy().includes('{broken-json'));
});
test('migration quota failures keep legacy records available for recovery', async () => {
  const memory = new Map([['dm-debts', JSON.stringify(fixture().debts)]]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null, setItem: () => { throw new Error('Quota exceeded'); }, removeItem: (key: string) => memory.delete(key),
  } });
  const fresh = await import('../src/lib/dataStore.ts?quota'); fresh.getData(); assert.ok(fresh.getDataError());
  assert.equal(memory.has('dm-debts'), true); assert.equal(memory.has(DATA_KEY), false);
});
