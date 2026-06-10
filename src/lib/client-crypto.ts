/**
 * Client-side cryptography using Web Crypto API.
 * Derives the Data Encryption Key (DEK) from master password + salt using PBKDF2.
 * Parameters match the server-side crypto.ts exactly for compatibility.
 */

const KDF_ITERATIONS = 600_000;
const KEY_LENGTH_BITS = 256;

/**
 * Derive a DEK from master password and salt using PBKDF2 (Web Crypto API).
 * Returns a Uint8Array (32 bytes / 256 bits).
 */
export async function deriveDek(
  password: string,
  saltHex: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const saltBytes = hexToBytes(saltHex);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_LENGTH_BITS
  );

  return new Uint8Array(derivedBits);
}

/**
 * Convert a DEK (Uint8Array) to a Base64 string for transmission to Server Actions.
 */
export function dekToBase64(dek: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < dek.length; i++) {
    binary += String.fromCharCode(dek[i]);
  }
  return btoa(binary);
}

/**
 * Convert a Base64 DEK string back to Uint8Array.
 */
export function base64ToDek(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert hex string to Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
