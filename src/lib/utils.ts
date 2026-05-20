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
