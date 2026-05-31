/**
 * Shared utility helpers used across the application.
 */

/** Generates a collision-resistant unique ID using timestamp + random suffix. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Returns the current month as a YYYY-MM string. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Returns the English ordinal suffix for a day-of-month (1–31).
 * Handles the 11th/12th/13th exception so e.g. 21 → "st", 22 → "nd", 31 → "st".
 */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
