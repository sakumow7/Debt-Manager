import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { boundedText, record } from './security';

export interface Connection { id: string; token: string; accountIds: string[]; }
export interface AppConfig {
  anthropicKey?: string; plaidClientId?: string; plaidSecret?: string;
  plaidEnv?: string; aiConsent?: boolean; localUserId?: string; connections?: Connection[];
}
export interface Encryption {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
  getSelectedStorageBackend?(): string;
}
function validate(value: unknown): AppConfig {
  const config = record(value);
  const clean: AppConfig = {};
  for (const key of ['anthropicKey', 'plaidClientId', 'plaidSecret'] as const) {
    if (config[key] !== undefined) clean[key] = boundedText(config[key], key, 512);
  }
  const env = config.plaidEnv ?? 'sandbox';
  if (!['sandbox', 'development', 'production'].includes(String(env))) throw new Error('Invalid banking environment in credential file.');
  clean.plaidEnv = String(env);
  clean.aiConsent = config.aiConsent === true;
  clean.localUserId = config.localUserId === undefined ? undefined : boundedText(config.localUserId, 'local user ID', 200);
  const entries = config.connections ?? config.plaidAccessTokens ?? [];
  if (!Array.isArray(entries) || entries.length > 100) throw new Error('Invalid banking connections.');
  clean.connections = entries.map(value => {
    const entry = record(value);
    if (!Array.isArray(entry.accountIds) || entry.accountIds.length > 1000) throw new Error('Invalid linked accounts.');
    return { id: entry.id === undefined ? randomUUID() : boundedText(entry.id, 'connection ID', 200),
      token: boundedText(entry.token, 'bank token', 1024), accountIds: entry.accountIds.map(id => boundedText(id, 'account ID', 200)) };
  });
  return clean;
}
export function createVault(directory: string, encryption: Encryption) {
  const securePath = path.join(directory, 'credentials.v1.json');
  const legacyPath = path.join(directory, 'config.json');
  const available = () => encryption.isEncryptionAvailable() && encryption.getSelectedStorageBackend?.() !== 'basic_text';
  const save = (config: AppConfig) => {
    if (!available()) throw new Error('Secure OS credential storage is unavailable. Offline features remain available.');
    const clean = validate(config);
    const envelope = { version: 1, ciphertext: encryption.encryptString(JSON.stringify(clean)).toString('base64') };
    fs.mkdirSync(directory, { recursive: true });
    const temporary = securePath + '.' + randomUUID() + '.tmp';
    try {
      fs.writeFileSync(temporary, JSON.stringify(envelope), { mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, securePath);
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    // Only delete the legacy file after the encrypted replacement was committed.
    if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
  };
  const load = (): AppConfig => {
    if (fs.existsSync(securePath)) {
      if (!available()) throw new Error('Secure OS credential storage is unavailable.');
      try {
        const envelope = record(JSON.parse(fs.readFileSync(securePath, 'utf8')));
        if (envelope.version !== 1 || typeof envelope.ciphertext !== 'string') throw new Error();
        return validate(JSON.parse(encryption.decryptString(Buffer.from(envelope.ciphertext, 'base64'))));
      } catch { throw new Error('Saved credentials could not be decrypted. They have been preserved; clear and re-enter credentials to recover.'); }
    }
    if (fs.existsSync(legacyPath)) {
      let config: AppConfig;
      try { config = validate(JSON.parse(fs.readFileSync(legacyPath, 'utf8'))); }
      catch { throw new Error('Legacy credentials could not be read. They have been preserved.'); }
      save(config);
      return config;
    }
    return { plaidEnv: 'sandbox', connections: [], aiConsent: false };
  };
  const clear = () => {
    for (const file of [securePath, legacyPath]) if (fs.existsSync(file)) fs.unlinkSync(file);
  };
  return { load, save, clear, available };
}
