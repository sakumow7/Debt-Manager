import type { Debt, AppSettings } from '../types';

interface ReminderWindow {
  electronAPI?: {
    showNotification?: (opts: { title: string; body: string }) => void;
  };
}

const STORAGE_KEY = 'dm-reminder-last-check';

function dayOfMonthDueIn(dueDay: number, withinDays: number): boolean {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), dueDay);
  // Roll to next month if already past this month
  if (target < today) target.setMonth(target.getMonth() + 1);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= withinDays;
}

function shouldRunToday(): boolean {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return true;
  const lastDate = new Date(last).toDateString();
  return lastDate !== new Date().toDateString();
}

function notify(title: string, body: string): void {
  const win = window as ReminderWindow;
  if (win.electronAPI?.showNotification) {
    win.electronAPI.showNotification({ title, body });
  }
}

export function checkPaymentReminders(debts: Debt[], settings: AppSettings): void {
  if (!settings.notificationsEnabled) return;
  if (!shouldRunToday()) return;

  localStorage.setItem(STORAGE_KEY, new Date().toISOString());

  const dueSoon = debts.filter(d => d.balance > 0 && dayOfMonthDueIn(d.dueDate, 3));
  const dueToday = dueSoon.filter(d => {
    const today = new Date();
    return d.dueDate === today.getDate();
  });
  const upcoming = dueSoon.filter(d => {
    const today = new Date();
    return d.dueDate !== today.getDate();
  });

  dueToday.forEach(d => {
    notify(
      `Payment Due Today — ${d.name}`,
      `Minimum payment of $${d.minimumPayment.toFixed(0)} is due today. Don't miss it!`
    );
  });

  if (upcoming.length === 1) {
    const d = upcoming[0];
    const daysLeft = d.dueDate - new Date().getDate();
    notify(
      `Upcoming Payment — ${d.name}`,
      `$${d.minimumPayment.toFixed(0)} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (day ${d.dueDate}).`
    );
  } else if (upcoming.length > 1) {
    notify(
      `${upcoming.length} Payments Due Soon`,
      upcoming.map(d => `${d.name} (day ${d.dueDate})`).join(', ')
    );
  }
}
