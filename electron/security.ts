export function boundedText(value: unknown, label: string, max = 10000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`Invalid ${label}.`);
  return value;
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.');
  return value as Record<string, unknown>;
}
export function externalURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443');
  } catch { return false; }
}
export function validateChat(value: unknown): { messages: { role: string; content: string }[]; systemPrompt: string } {
  const input = record(value);
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 20) throw new Error('Chat must contain 1–20 messages.');
  const messages = input.messages.map(value => {
    const message = record(value);
    if (message.role !== 'user' && message.role !== 'assistant') throw new Error('Invalid message role.');
    return { role: message.role, content: boundedText(message.content, 'message', 20000) };
  });
  if (messages.reduce((n, m) => n + m.content.length, 0) > 100000) throw new Error('Conversation is too large.');
  return { messages, systemPrompt: boundedText(input.systemPrompt, 'system prompt', 20000) };
}
export function validateConfigUpdate(value: unknown): Record<string, unknown> {
  const update = record(value);
  const allowed = ['anthropicKey', 'plaidClientId', 'plaidSecret', 'plaidEnv', 'aiConsent'];
  if (Object.keys(update).some(key => !allowed.includes(key))) throw new Error('Unknown configuration field.');
  for (const key of ['anthropicKey', 'plaidClientId', 'plaidSecret']) {
    if (update[key] !== undefined) boundedText(update[key], key, 512);
  }
  if (update.plaidEnv !== undefined && !['sandbox', 'development', 'production'].includes(String(update.plaidEnv))) throw new Error('Invalid banking environment.');
  if (update.aiConsent !== undefined && typeof update.aiConsent !== 'boolean') throw new Error('Invalid AI consent.');
  return update;
}
