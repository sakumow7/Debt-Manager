/**
 * Shared TypeScript types, interfaces, and constants for the Debt Manager application.
 *
 * Sections:
 *   - Debt & payment models
 *   - Budget models
 *   - Payoff calculation result shapes
 *   - AI chat and tips models
 *   - App settings and Plaid integration
 *   - Display constants (colors, labels, expense categories)
 */

// ─── Debt & Payment Models ────────────────────────────────────────────────────

export type DebtType =
  | 'credit_card'
  | 'student_loan'
  | 'mortgage'
  | 'auto'
  | 'personal'
  | 'medical'
  | 'other';

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
  source?: 'manual' | 'plaid';
}

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  type: DebtType;
  balance: number;
  originalBalance: number;
  interestRate: number; // APR as a percentage, e.g. 24.99
  minimumPayment: number;
  dueDate: number; // day of month 1–31
  notes?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  payments: DebtPayment[];
  plaidAccountId?: string; // linked Plaid account
}

// ─── Budget Models ────────────────────────────────────────────────────────────

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  type: 'fixed' | 'variable';
}

export interface ExtraIncome {
  id: string;
  category: string;
  amount: number;
  note?: string;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  income: number;
  expenses: ExpenseItem[];
  extraIncomes?: ExtraIncome[]; // optional — absent on records created before this feature
}

// ─── Payoff Calculation Shapes ────────────────────────────────────────────────

export interface PaymentDetail {
  debtId: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface MonthlyScheduleItem {
  month: number;
  payments: PaymentDetail[];
  totalPayment: number;
  totalBalance: number;
  totalInterest: number;
}

export interface DebtPayoffInfo {
  debtId: string;
  debtName: string;
  month: number;
  date: string;
  totalInterestPaid: number;
}

export interface AttackPlanResult {
  strategy: 'avalanche' | 'snowball' | 'minimum';
  totalInterestPaid: number;
  totalMonths: number;
  payoffDate: string;
  monthlySchedule: MonthlyScheduleItem[];
  debtPayoffInfo: DebtPayoffInfo[];
  monthlyPayment: number;
}

// ─── Scheduled Payments ───────────────────────────────────────────────────────

/** A lump-sum payment the user intends to make against a specific debt on a future date. */
export interface ScheduledPayment {
  id: string;
  debtId: string;
  amount: number;
  scheduledDate: string; // YYYY-MM-DD
  note?: string;
  status: 'pending' | 'applied';
  createdAt: string;
  sourceExtraIncomeId?: string; // set when created from an ExtraIncome item
}

// ─── AI Chat & Tips Models ────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SavingsTip {
  title: string;
  description: string;
  potentialSavings: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'housing' | 'food' | 'transportation' | 'entertainment' | 'utilities' | 'income' | 'debt' | 'other';
  actionSteps?: string[];
}

// ─── App Settings & Plaid Integration ────────────────────────────────────────

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype: string;
  balances: {
    current: number;
    available?: number;
    limit?: number;
  };
  institution?: string;
  accessToken: string;
}

export interface AppSettings {
  extraMonthlyPayment: number;
  currency: string;
  preferredStrategy: 'avalanche' | 'snowball';
  plaidAccounts: PlaidAccount[];
}

// ─── Display Constants ────────────────────────────────────────────────────────

export const DEBT_COLORS: Record<DebtType, string> = {
  credit_card: '#ef4444',
  student_loan: '#3b82f6',
  mortgage: '#8b5cf6',
  auto: '#f59e0b',
  personal: '#ec4899',
  medical: '#06b6d4',
  other: '#6b7280',
};

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  personal: 'Personal Loan',
  medical: 'Medical Debt',
  other: 'Other',
};

export const EXTRA_INCOME_CATEGORIES = [
  'Gift',
  'Tax Refund',
  'Work Bonus',
  'Side Hustle',
  'Freelance',
  'Sold Items',
  'Cashback / Rebate',
  'Other',
];

export const EXPENSE_CATEGORIES = [
  'Housing/Rent',
  'Utilities',
  'Groceries',
  'Dining Out',
  'Transportation',
  'Insurance',
  'Healthcare',
  'Entertainment',
  'Subscriptions',
  'Clothing',
  'Personal Care',
  'Education',
  'Savings',
  'Debt Payments',
  'Other',
];
