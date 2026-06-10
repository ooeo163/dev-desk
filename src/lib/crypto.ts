import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KDF_ITERATIONS = 600_000;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive an AES-256 encryption key from a master password using PBKDF2.
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Generate a random salt for KDF.
 */
export function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH);
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a Base64-encoded string: salt(32) + iv(16) + authTag(16) + ciphertext
 */
export function encrypt(plaintext: string, dek: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, dek, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: iv + authTag + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a Base64-encoded ciphertext using AES-256-GCM.
 * Expects format: iv(16) + authTag(16) + ciphertext
 */
export function decrypt(cipherBase64: string, dek: Buffer): string {
  const packed = Buffer.from(cipherBase64, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = packed.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}

/**
 * Hash the master password for storage/verification using PBKDF2.
 * Returns salt:hash as a single string.
 */
export function hashPassword(password: string): string {
  const salt = generateSalt();
  const hash = deriveKey(password, salt);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a master password against a stored hash.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = deriveKey(password, salt);
  return hash.toString('hex') === hashHex;
}
