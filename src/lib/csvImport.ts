import type { Debt, DebtType } from '../types';
import { DEBT_COLORS } from '../types';
import { generateId } from './utils';
export type ColumnKey = 'name' | 'balance' | 'interestRate' | 'minimumPayment' | 'type' | 'dueDate' | 'creditor' | 'notes' | 'ignore';
const typeMap: Record<string, DebtType> = { 'credit card': 'credit_card', credit_card: 'credit_card', credit: 'credit_card', cc: 'credit_card',
  student: 'student_loan', 'student loan': 'student_loan', student_loan: 'student_loan', mortgage: 'mortgage', home: 'mortgage',
  auto: 'auto', car: 'auto', vehicle: 'auto', personal: 'personal', medical: 'medical', hospital: 'medical', other: 'other' };
export function parseCSVNumber(value: string | undefined): number {
  const clean = (value ?? '').trim().replace(/[$,%\s]/g, '');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean)) throw new Error('Expected a non-negative number.');
  const amount = Number(clean);
  if (!Number.isFinite(amount) || amount > 1e9) throw new Error('Amount is too large.');
  return Math.round(amount * 100) / 100;
}
export function debtsFromCSV(rows: string[][], mapping: ColumnKey[]): Debt[] {
  if (rows.length === 0 || rows.length > 10000) throw new Error('Import must contain 1–10,000 debt rows.');
  const used = mapping.filter(key => key !== 'ignore');
  if (new Set(used).size !== used.length) throw new Error('Map each field to only one column.');
  if (!mapping.includes('name') || !mapping.includes('balance')) throw new Error('Map Debt Name and Current Balance.');
  const now = new Date().toISOString();
  return rows.map((row, index) => {
    try {
      const cell = (key: ColumnKey) => row[mapping.indexOf(key)]?.trim();
      const name = cell('name'); if (!name || name.length > 10000) throw new Error('Debt name is missing or too long.');
      const balance = parseCSVNumber(cell('balance'));
      const apr = mapping.includes('interestRate') ? parseCSVNumber(cell('interestRate')) : 0;
      const minimumPayment = mapping.includes('minimumPayment') ? parseCSVNumber(cell('minimumPayment')) : 0;
      const dueDate = mapping.includes('dueDate') ? Number(cell('dueDate')) : 15;
      if (apr > 100 || !Number.isInteger(dueDate) || dueDate < 1 || dueDate > 31) throw new Error('APR must be 0–100 and due day 1–31.');
      const type = typeMap[(cell('type') || 'other').toLowerCase()];
      if (!type) throw new Error('Unknown debt type.');
      return { id: generateId(), name, creditor: cell('creditor') ?? '', type, balance, originalBalance: balance,
        interestRate: apr, minimumPayment, dueDate, notes: cell('notes'), color: DEBT_COLORS[type], createdAt: now, updatedAt: now, payments: [] };
    } catch (error) { throw new Error(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid debt.'}`); }
  });
}
