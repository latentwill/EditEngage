/**
 * @behavior API key encryption utility encrypts/decrypts strings using AES-256-GCM
 * @business_rule API keys must be encrypted at rest. Encryption produces unique
 * ciphertext per call (random IV). Decryption recovers the original plaintext.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
  env: {
    API_KEY_ENCRYPTION_KEY: 'a'.repeat(64)
  }
}));

describe('crypto utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts a string to a base64 ciphertext different from plaintext', async () => {
    const { encryptApiKey } = await import('./crypto.js');
    const plaintext = 'sk-or-v1-abc123def456';
    const ciphertext = encryptApiKey(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(typeof ciphertext).toBe('string');
    // Base64 encoded
    expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('decrypts ciphertext back to the original plaintext', async () => {
    const { encryptApiKey, decryptApiKey } = await import('./crypto.js');
    const plaintext = 'sk-or-v1-abc123def456';
    const ciphertext = encryptApiKey(plaintext);
    const recovered = decryptApiKey(ciphertext);

    expect(recovered).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', async () => {
    const { encryptApiKey } = await import('./crypto.js');
    const plaintext = 'sk-abc123';
    const ct1 = encryptApiKey(plaintext);
    const ct2 = encryptApiKey(plaintext);

    expect(ct1).not.toBe(ct2);
  });

  it('throws on tampered ciphertext', async () => {
    const { encryptApiKey, decryptApiKey } = await import('./crypto.js');
    const ciphertext = encryptApiKey('test-key');
    // Flip a character in the middle
    const tampered = ciphertext.slice(0, 10) + 'X' + ciphertext.slice(11);

    expect(() => decryptApiKey(tampered)).toThrow();
  });
});
