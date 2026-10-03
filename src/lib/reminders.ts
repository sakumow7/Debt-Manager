import type { Debt, AppSettings } from '../types';
import { getDaysUntilDue, formatCurrency } from './calculations';
const STORAGE_KEY = 'dm-reminder-last-check';
export async function checkPaymentReminders(debts: Debt[], settings: AppSettings): Promise<void> {
  if (!settings.notificationsEnabled || !window.electronAPI?.showNotification) return;
  try {
    const today = new Date().toDateString();
    if (localStorage.getItem(STORAGE_KEY) === today) return;
    const due = debts.filter(d => d.balance > 0 && getDaysUntilDue(d.dueDate) <= 3);
    let delivered = true;
    for (const debt of due) {
      const days = getDaysUntilDue(debt.dueDate);
      delivered = await window.electronAPI.showNotification(
        days === 0 ? `Payment Due Today — ${debt.name}` : `Upcoming Payment — ${debt.name}`,
        `${formatCurrency(debt.minimumPayment, settings.currency)} due ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}.`
      ) && delivered;
    }
    if (delivered && due.length) localStorage.setItem(STORAGE_KEY, today);
  } catch { /* Notification failure must not prevent offline use; retry on next check. */ }
}
