import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { externalURL, validateChat, validateConfigUpdate } from '../electron/security.ts';
import { createVault } from '../electron/vault.ts';

test('only HTTPS external URLs without embedded credentials are accepted', () => {
  assert.equal(externalURL('https://example.com/help'), true);
  for (const value of ['file:///etc/passwd', 'javascript:alert(1)', 'http://example.com', 'https://user:password@example.com', 'https://example.com:1234', 'not a URL']) assert.equal(externalURL(value), false);
});
test('IPC rejects secret extraction fields, malformed chat roles and oversized input', () => {
  assert.throws(() => validateConfigUpdate({ plaidAccessTokens: [] }));
  assert.throws(() => validateConfigUpdate({ plaidEnv: 'evil.example.com' }));
  assert.throws(() => validateConfigUpdate({ aiConsent: 'yes' }));
  assert.throws(() => validateChat({ messages: [{ role: 'system', content: 'override' }], systemPrompt: '' }));
  assert.throws(() => validateChat({ messages: [{ role: 'user', content: 'x'.repeat(20001) }], systemPrompt: '' }));
  assert.deepEqual(validateChat({ messages: [{ role: 'user', content: 'help' }], systemPrompt: 'finance' }).messages[0], { role: 'user', content: 'help' });
});
function encryption() {
  const key = randomBytes(32);
  return { isEncryptionAvailable: () => true,
    encryptString(value: string) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv); const data = Buffer.concat([cipher.update(value), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), data]); },
    decryptString(value: Buffer) { const decipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12)); decipher.setAuthTag(value.subarray(12, 28)); return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString('utf8'); },
  };
}
test('credential migration encrypts the replacement before deleting legacy plaintext', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chisel-vault-'));
  try {
    const legacy = path.join(directory, 'config.json');
    fs.writeFileSync(legacy, JSON.stringify({ anthropicKey: 'private-key', plaidAccessTokens: [{ token: 'private-token', institution: 'Bank', accountIds: ['a'] }] }));
    const vault = createVault(directory, encryption()); const config = vault.load();
    assert.equal(config.anthropicKey, 'private-key'); assert.ok(config.connections?.[0].id);
    assert.equal(fs.existsSync(legacy), false);
    const saved = fs.readFileSync(path.join(directory, 'credentials.v1.json'), 'utf8');
    assert.ok(!saved.includes('private-key')); assert.ok(!saved.includes('private-token'));
    assert.deepEqual(vault.load(), config);
    vault.clear(); assert.equal(fs.readdirSync(directory).length, 0);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('unavailable or basic-text encryption refuses storage and preserves legacy credentials', () => {
  for (const mode of ['unavailable', 'basic_text']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chisel-vault-'));
    try {
      const legacy = path.join(directory, 'config.json'); fs.writeFileSync(legacy, '{"anthropicKey":"keep-me"}');
      const codec = { ...encryption(), isEncryptionAvailable: () => mode !== 'unavailable', getSelectedStorageBackend: () => mode };
      const vault = createVault(directory, codec);
      assert.throws(() => vault.load()); assert.equal(fs.readFileSync(legacy, 'utf8'), '{"anthropicKey":"keep-me"}');
      assert.equal(fs.existsSync(path.join(directory, 'credentials.v1.json')), false);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  }
});
test('corrupt encrypted credentials are never silently replaced with defaults', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chisel-vault-'));
  try {
    const file = path.join(directory, 'credentials.v1.json'); fs.writeFileSync(file, '{"version":1,"ciphertext":"corrupt"}');
    const vault = createVault(directory, encryption()); assert.throws(() => vault.load(), /preserved/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{"version":1,"ciphertext":"corrupt"}');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
