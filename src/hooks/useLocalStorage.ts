import { useCallback, useSyncExternalStore } from 'react';
import { getData, updateData, subscribeData, type ConsumerData } from '../lib/dataStore';

const fields: Record<string, keyof ConsumerData> = {
  'dm-debts': 'debts', 'dm-budgets': 'budgets', 'dm-settings': 'settings', 'dm-chat': 'chatMessages',
  'dm-scheduled': 'scheduledPayments', 'dm-assets': 'assets',
};
export function useLocalStorage<T>(key: string, _initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const data = useSyncExternalStore(subscribeData, getData);
  const field = fields[key];
  if (!field) throw new Error('Unknown data collection.');
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      updateData(prev => ({ ...prev, [field]: typeof value === 'function'
        ? (value as (value: T) => T)(prev[field] as T) : value }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('chisel-storage-error', { detail: error instanceof Error ? error.message : 'Could not save your changes.' }));
      throw error;
    }
  }, [field]);
  return [data[field] as T, setValue];
}
