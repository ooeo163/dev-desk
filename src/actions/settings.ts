'use server';

import { db } from '@/lib/db';
import { vaultMeta } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const AUTO_LOCK_KEY = 'auto_lock_timeout';
const DEFAULT_TIMEOUT = '300000'; // 5 minutes

export async function getSettings(): Promise<{ autoLockTimeout: string }> {
  const row = db
    .select()
    .from(vaultMeta)
    .where(eq(vaultMeta.key, AUTO_LOCK_KEY))
    .get();

  return {
    autoLockTimeout: row?.value ?? DEFAULT_TIMEOUT,
  };
}

export async function saveAutoLockTimeout(
  timeoutMs: string
): Promise<{ success: boolean }> {
  const valid = ['60000', '300000', '600000', '1800000', '0'];
  if (!valid.includes(timeoutMs)) {
    return { success: false };
  }

  const existing = db
    .select()
    .from(vaultMeta)
    .where(eq(vaultMeta.key, AUTO_LOCK_KEY))
    .get();

  if (existing) {
    db.update(vaultMeta)
      .set({ value: timeoutMs })
      .where(eq(vaultMeta.key, AUTO_LOCK_KEY))
      .execute();
  } else {
    db.insert(vaultMeta)
      .values({ key: AUTO_LOCK_KEY, value: timeoutMs })
      .execute();
  }

  return { success: true };
}
