'use server';

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { vaultMeta } from '@/lib/db/schema';
import { verifyPassword, generateSalt, deriveKey } from '@/lib/crypto';
import { masterPasswordSchema, unlockVaultSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';

const SESSION_COOKIE = 'vault_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'devvault-local-dev-secret';

function signToken(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}

function verifyToken(token: string, payload: string): boolean {
  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return token === expected;
}

/**
 * Check if the vault has been initialized (master password set).
 */
export async function checkVaultStatus(): Promise<{ initialized: boolean }> {
  const row = db.select().from(vaultMeta).where(eq(vaultMeta.key, 'password_hash')).get();
  return { initialized: !!row };
}

/**
 * Initialize the vault with a master password (first-time setup).
 */
export async function initializeVault(
  _prevState: { error?: string; success?: boolean; kdfSalt?: string },
  formData: FormData
): Promise<{ error?: string; success?: boolean; kdfSalt?: string }> {
  try {
    const password = formData.get('masterPassword') as string;
    const confirm = formData.get('confirmPassword') as string;

    if (!password || !confirm) {
      return { error: '请填写所有密码字段' };
    }

    if (password !== confirm) {
      return { error: '两次输入的密码不一致' };
    }

    const parsed = masterPasswordSchema.safeParse(password);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || '密码格式不正确' };
    }

    // Check if vault is already initialized
    const existing = db.select().from(vaultMeta).where(eq(vaultMeta.key, 'password_hash')).get();
    if (existing) {
      return { error: '工作台已初始化，请使用解锁模式' };
    }

    // Generate KDF salt, derive key for password hash
    const salt = generateSalt();
    const saltHex = salt.toString('hex');
    const key = deriveKey(password, salt);
    const passwordHash = `${saltHex}:${key.toString('hex')}`;

    // Store in vault_meta
    db.insert(vaultMeta).values([
      { key: 'password_hash', value: passwordHash },
      { key: 'kdf_salt', value: saltHex },
    ]).execute();

    // Set session cookie
    await setSessionCookie();

    return { success: true, kdfSalt: saltHex };
  } catch {
    return { error: '初始化失败，请重试' };
  }
}

/**
 * Unlock the vault with the master password.
 * Returns the KDF salt so the client can derive the DEK locally.
 */
export async function unlockVault(
  _prevState: { error?: string; success?: boolean; kdfSalt?: string },
  formData: FormData
): Promise<{ error?: string; success?: boolean; kdfSalt?: string }> {
  try {
    const password = formData.get('masterPassword') as string;

    const parsed = unlockVaultSchema.safeParse({ masterPassword: password });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || '密码格式不正确' };
    }

    // Get stored hash and verify
    const hashRow = db.select().from(vaultMeta).where(eq(vaultMeta.key, 'password_hash')).get();
    if (!hashRow) {
      return { error: '工作台未初始化' };
    }

    if (!verifyPassword(password, hashRow.value)) {
      return { error: '主密码错误' };
    }

    // Get KDF salt for client-side DEK derivation
    const saltRow = db.select().from(vaultMeta).where(eq(vaultMeta.key, 'kdf_salt')).get();
    if (!saltRow) {
      return { error: 'KDF 盐值缺失' };
    }

    // Set session cookie
    await setSessionCookie();

    return { success: true, kdfSalt: saltRow.value };
  } catch {
    return { error: '解锁失败，请重试' };
  }
}

/**
 * Lock the vault by clearing the session cookie.
 */
export async function lockVault(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true };
}

/**
 * Verify that the current session is valid.
 */
export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) return false;

  try {
    const [token, expiresStr] = session.value.split('.');
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return false;
    return verifyToken(token, expiresStr);
  } catch {
    return false;
  }
}

// ── Internal helpers ──────────────────────────────────

async function setSessionCookie() {
  const cookieStore = await cookies();
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const token = signToken(String(expires));
  cookieStore.set(SESSION_COOKIE, `${token}.${expires}`, {
    httpOnly: true,
    secure: false, // localhost
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}
