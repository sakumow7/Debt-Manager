import type { AppSettings, Asset, ChatMessage, Debt, MonthlyBudget, ScheduledPayment } from '../types';

export const DATA_KEY = 'chisel-data-v1';
export const DEFAULT_SETTINGS: AppSettings = {
  extraMonthlyPayment: 0, currency: 'USD', preferredStrategy: 'avalanche', plaidAccounts: [],
  theme: 'dark', biweeklyPayments: false, notificationsEnabled: false, aiConsent: false,
};
export interface ConsumerData {
  debts: Debt[]; budgets: MonthlyBudget[]; settings: AppSettings; chatMessages: ChatMessage[];
  scheduledPayments: ScheduledPayment[]; assets: Asset[]; onboardingComplete: boolean;
}
export const emptyData = (): ConsumerData => ({ debts: [], budgets: [], settings: { ...DEFAULT_SETTINGS },
  chatMessages: [], scheduledPayments: [], assets: [], onboardingComplete: false });

function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a record.');
  return value as Record<string, any>;
}
function text(value: unknown, max = 10000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid text field.');
  return value;
}
function money(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e9) throw new Error('Invalid monetary amount.');
  return Math.round(value * 100) / 100;
}
function choice<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) throw new Error('Invalid record type.');
  return value as T;
}
function boolean(value: unknown, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error('Invalid toggle.');
  return value;
}
function optional(value: unknown): string | undefined { return value === undefined ? undefined : text(value); }
function date(value: unknown): string {
  const result = text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error('Invalid date.');
  const day = result.slice(0, 10);
  if (new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) !== day) throw new Error('Invalid calendar date.');
  return result;
}
function list<T>(value: unknown, parse: (record: Record<string, any>) => T): T[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error('Invalid record list.');
  const seen = new Set<string>();
  return value.map(item => {
    const record = object(item);
    const id = text(record.id || record.account_id, 200);
    if (!id || seen.has(id)) throw new Error('Missing or duplicate ID.');
    seen.add(id);
    return parse(record);
  });
}

// Construct only known fields: untrusted backups cannot inject credentials or arbitrary settings.
export function validateData(value: unknown): ConsumerData {
  const d = object(value); const s = { ...DEFAULT_SETTINGS, ...object(d.settings) };
  const settings: AppSettings = {
    extraMonthlyPayment: money(s.extraMonthlyPayment), currency: choice(s.currency, ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
    preferredStrategy: choice(s.preferredStrategy, ['avalanche', 'snowball'] as const), theme: choice(s.theme ?? 'dark', ['dark', 'light'] as const),
    biweeklyPayments: boolean(s.biweeklyPayments), notificationsEnabled: boolean(s.notificationsEnabled), aiConsent: boolean(s.aiConsent),
    // Legacy bank tokens are discarded; reconnect banks after restoring a backup.
    plaidAccounts: list(s.plaidAccounts ?? [], a => {
      const balances = object(a.balances);
      return { account_id: text(a.account_id), name: text(a.name), official_name: optional(a.official_name ?? undefined),
        type: text(a.type), subtype: text(a.subtype ?? ''), institution: optional(a.institution),
        connectionId: typeof a.connectionId === 'string' ? text(a.connectionId) : '',
        balances: { current: balances.current == null ? 0 : money(Math.abs(balances.current)),
          available: balances.available == null ? undefined : money(Math.abs(balances.available)),
          limit: balances.limit == null ? undefined : money(balances.limit) } };
    }),
  };
  const debts: Debt[] = list(d.debts, r => {
    const apr = money(r.interestRate);
    if (apr > 100 || !Number.isInteger(r.dueDate) || r.dueDate < 1 || r.dueDate > 31) throw new Error('Invalid APR or due day.');
    return { id: text(r.id), name: text(r.name), creditor: text(r.creditor),
      type: choice(r.type, ['credit_card', 'student_loan', 'mortgage', 'auto', 'personal', 'medical', 'other'] as const),
      balance: money(r.balance), originalBalance: money(r.originalBalance), interestRate: apr, minimumPayment: money(r.minimumPayment),
      dueDate: r.dueDate, creditLimit: r.creditLimit === undefined ? undefined : money(r.creditLimit),
      notes: optional(r.notes), color: /^#[\da-f]{6}$/i.test(r.color) ? r.color : '#6b7280',
      createdAt: date(r.createdAt), updatedAt: date(r.updatedAt), plaidAccountId: optional(r.plaidAccountId),
      payments: list(r.payments, p => ({ id: text(p.id), amount: money(p.amount), date: date(p.date), note: optional(p.note),
        source: choice(p.source ?? 'manual', ['manual', 'plaid'] as const) })),
    };
  });
  const budgets: MonthlyBudget[] = list(d.budgets, r => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)) throw new Error('Invalid budget month.');
    return { id: text(r.id), month: r.month, income: money(r.income),
      expenses: list(r.expenses, e => ({ id: text(e.id), category: text(e.category), amount: money(e.amount), type: choice(e.type, ['fixed', 'variable'] as const) })),
      extraIncomes: list(r.extraIncomes ?? [], e => ({ id: text(e.id), category: text(e.category), amount: money(e.amount), note: optional(e.note) })),
    };
  });
  if (new Set(budgets.map(b => b.month)).size !== budgets.length) throw new Error('Duplicate budget month.');
  const assets: Asset[] = list(d.assets ?? [], r => ({ id: text(r.id), name: text(r.name),
    type: choice(r.type, ['checking', 'savings', 'investment', 'property', 'vehicle', 'other'] as const), value: money(r.value),
    note: optional(r.note), createdAt: date(r.createdAt), updatedAt: date(r.updatedAt) }));
  const chatMessages: ChatMessage[] = list(d.chatMessages ?? [], r => ({ id: text(r.id), role: choice(r.role, ['user', 'assistant'] as const),
    content: text(r.content, 100000), timestamp: date(r.timestamp) }));
  const scheduledPayments: ScheduledPayment[] = list(d.scheduledPayments ?? [], r => ({ id: text(r.id), debtId: text(r.debtId),
    amount: money(r.amount), scheduledDate: date(r.scheduledDate), note: optional(r.note), status: choice(r.status, ['pending', 'applied'] as const),
    createdAt: date(r.createdAt), sourceExtraIncomeId: optional(r.sourceExtraIncomeId) }));
  // Older versions leave schedules behind after debt deletion; omit those orphan records.
  return { debts, budgets, settings, assets, chatMessages,
    scheduledPayments: scheduledPayments.filter(p => debts.some(d => d.id === p.debtId)), onboardingComplete: boolean(d.onboardingComplete) };
}

export function createBackup(data: ConsumerData): string {
  const clean = validateData(data);
  clean.settings.plaidAccounts = [];
  clean.settings.aiConsent = false;
  return JSON.stringify({ format: 'chisel-finance', version: 1, exportedAt: new Date().toISOString(), data: clean }, null, 2);
}
export function parseBackup(raw: string): ConsumerData {
  if (raw.length > 20 * 1024 * 1024) throw new Error('Backup exceeds 20 MB.');
  const backup = object(JSON.parse(raw));
  if (backup.format !== undefined || backup.version !== undefined) {
    if (backup.format !== 'chisel-finance' || backup.version !== 1) throw new Error('Unsupported backup version.');
    const data = validateData(backup.data);
    data.settings.plaidAccounts = []; data.settings.aiConsent = false;
    return data;
  }
  // Original exports contained debts, budgets and settings only.
  if (!Array.isArray(backup.debts) || !Array.isArray(backup.budgets) || !backup.settings) throw new Error('Missing backup collections.');
  const data = validateData({ ...emptyData(), ...backup });
  data.settings.plaidAccounts = []; data.settings.aiConsent = false;
  return data;
}

export const legacyKeys = ['dm-debts', 'dm-budgets', 'dm-settings', 'dm-chat', 'dm-scheduled', 'dm-assets', 'dm-onboarding-complete'];
let cached: ConsumerData | undefined;
let initializationError: string | undefined;
const listeners = new Set<() => void>();
export function getData(): ConsumerData {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw !== null) cached = validateData(JSON.parse(raw));
    else {
      const read = (key: string, fallback: unknown) => { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); };
      cached = validateData({ debts: read('dm-debts', []), budgets: read('dm-budgets', []), settings: read('dm-settings', DEFAULT_SETTINGS),
        chatMessages: read('dm-chat', []), scheduledPayments: read('dm-scheduled', []), assets: read('dm-assets', []),
        onboardingComplete: localStorage.getItem('dm-onboarding-complete') === '1' });
      localStorage.setItem(DATA_KEY, JSON.stringify(cached));
      for (const key of legacyKeys) localStorage.removeItem(key);
    }
  } catch {
    initializationError = 'Your saved data could not be read or migrated. It has been preserved. Export a recovery copy before restoring a backup.';
    cached = emptyData();
  }
  return cached;
}
export function getDataError(): string | undefined { getData(); return initializationError; }
export function subscribeData(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== DATA_KEY && event.key !== null) return;
    cached = undefined; initializationError = undefined; getData(); listener();
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
export function replaceData(next: ConsumerData): void {
  const clean = validateData(next);
  // A single write commits every collection; failed validation or quota leaves the previous snapshot intact.
  localStorage.setItem(DATA_KEY, JSON.stringify(clean));
  cached = clean; initializationError = undefined;
  // Cleanup is best effort after the snapshot is committed; it must not report a successful save as failed.
  for (const key of legacyKeys) { try { localStorage.removeItem(key); } catch { /* snapshot is authoritative */ } }
  listeners.forEach(fn => fn());
}
export function updateData(update: (prev: ConsumerData) => ConsumerData): void {
  if (getDataError()) throw new Error(getDataError());
  replaceData(update(getData()));
}
export function recoveryCopy(): string {
  const result: Record<string, string | null> = {};
  for (const key of [DATA_KEY, ...legacyKeys]) result[key] = localStorage.getItem(key);
  return JSON.stringify(result, null, 2);
}
