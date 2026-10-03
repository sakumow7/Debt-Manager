import { updateData } from './dataStore';
export async function ensureAIConsent(): Promise<boolean> {
  if (!window.electronAPI) { alert('AI features require the desktop app.'); return false; }
  try {
    const config = await window.electronAPI.getConfig();
    if (config.aiConsent) return true;
    if (!confirm('Use optional AI? Debt balances, rates, payments, budget totals, and your messages will be sent to Anthropic. Debt names and creditors use numbered labels. Avoid personal details in messages. Provider terms and API charges apply. AI guidance may be incorrect. You can disable this in Settings.')) return false;
    await window.electronAPI.setConfig({ aiConsent: true });
    updateData(prev => ({ ...prev, settings: { ...prev.settings, aiConsent: true } }));
    return true;
  } catch (error) { alert(error instanceof Error ? error.message : 'AI configuration is unavailable.'); return false; }
}
