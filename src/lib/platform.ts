// Platform abstraction — same interface whether running in Electron or Android/web.
// All feature code imports from here, never from window.electronAPI directly.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI;

export const isAndroid = (): boolean =>
  Capacitor.getPlatform() === 'android';

export const isWeb = (): boolean =>
  !isElectron() && !isAndroid();

// ── Config / secure storage ──────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  if (isElectron()) {
    const cfg = await window.electronAPI.getConfig();
    return cfg?.[key] ?? null;
  }
  const { value } = await Preferences.get({ key });
  return value;
}

export async function setConfig(key: string, value: string): Promise<void> {
  if (isElectron()) {
    const cfg = await window.electronAPI.getConfig();
    await window.electronAPI.setConfig({ ...cfg, [key]: value });
    return;
  }
  await Preferences.set({ key, value });
}

// ── Anthropic AI ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendAIChat(messages: ChatMessage[], apiKey: string): Promise<string> {
  if (isElectron()) {
    return window.electronAPI.aiChat(messages);
  }
  // Direct API call on Android/web — key stored locally, never transmitted elsewhere
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content[0]?.text ?? '';
}

export async function getAITips(debts: unknown[], apiKey: string): Promise<string> {
  const prompt = `You are a financial advisor. Based on these debts: ${JSON.stringify(debts)}, provide 3 specific, actionable saving tips to accelerate payoff. Be concise.`;
  return sendAIChat([{ role: 'user', content: prompt }], apiKey);
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (isElectron()) return true;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function showNotification(title: string, body: string): Promise<void> {
  if (isElectron()) {
    window.electronAPI?.showNotification?.({ title, body });
    return;
  }
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await LocalNotifications.schedule({
    notifications: [{
      id: Date.now(),
      title,
      body,
      schedule: { at: new Date(Date.now() + 100) },
    }],
  });
}
