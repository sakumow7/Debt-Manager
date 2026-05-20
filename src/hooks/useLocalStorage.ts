/**
 * Generic hook for state that must survive page reloads.
 * All application data (debts, budgets, settings, chat history) flows through here.
 */
import { useState, useCallback } from 'react';

/**
 * Persists state to localStorage and keeps it in sync across re-renders.
 * Safe against quota errors and private-mode restrictions.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next =
          typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Silently ignore quota exceeded or private-mode errors
        }
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
