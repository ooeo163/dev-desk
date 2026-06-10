'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { credentials, tasks } from '@/lib/db/schema';
import { encrypt, decrypt } from '@/lib/crypto';
import { createCredentialSchema, updateCredentialSchema } from '@/lib/validation';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { base64ToDek } from '@/lib/client-crypto';

/**
 * Create a new credential with encrypted sensitive fields.
 */
export async function createCredential(
  input: Record<string, unknown>,
  dekBase64: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = createCredentialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const dek = Buffer.from(base64ToDek(dekBase64));
  const now = new Date();
  const id = nanoid();

  const data = parsed.data;
  db.insert(credentials).values({
    id,
    title: data.title,
    username: data.username || null,
    passwordCipher: data.password ? encrypt(data.password, dek) : null,
    apiKeyCipher: data.apiKey ? encrypt(data.apiKey, dek) : null,
    totpSecretCipher: data.totpSecret ? encrypt(data.totpSecret, dek) : null,
    notes: data.notes ? encrypt(data.notes, dek) : null,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    createdAt: now,
    updatedAt: now,
  }).execute();

  revalidatePath('/dashboard/credentials');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Get all credentials (without decrypting sensitive fields).
 */
export async function getCredentials() {
  const rows = db
    .select({
      id: credentials.id,
      title: credentials.title,
      username: credentials.username,
      tags: credentials.tags,
      hasPassword: credentials.passwordCipher,
      hasApiKey: credentials.apiKeyCipher,
      hasTotp: credentials.totpSecretCipher,
      hasNotes: credentials.notes,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    })
    .from(credentials)
    .orderBy(desc(credentials.updatedAt))
    .all();

  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) as string[] : [],
    hasPassword: !!row.hasPassword,
    hasApiKey: !!row.hasApiKey,
    hasTotp: !!row.hasTotp,
    hasNotes: !!row.hasNotes,
  }));
}

/**
 * Get a single credential with selected decrypted fields.
 */
export async function getCredentialById(
  id: string,
  dekBase64: string,
  fields: string[] = ['password', 'apiKey', 'totpSecret', 'notes']
) {
  const row = db.select().from(credentials).where(eq(credentials.id, id)).get();
  if (!row) return null;

  const dek = Buffer.from(base64ToDek(dekBase64));
  const result: Record<string, unknown> = {
    id: row.id,
    title: row.title,
    username: row.username,
    tags: row.tags ? JSON.parse(row.tags) as string[] : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (fields.includes('password') && row.passwordCipher) {
    try { result.password = decrypt(row.passwordCipher, dek); } catch { result.password = null; }
  }
  if (fields.includes('apiKey') && row.apiKeyCipher) {
    try { result.apiKey = decrypt(row.apiKeyCipher, dek); } catch { result.apiKey = null; }
  }
  if (fields.includes('totpSecret') && row.totpSecretCipher) {
    try { result.totpSecret = decrypt(row.totpSecretCipher, dek); } catch { result.totpSecret = null; }
  }
  if (fields.includes('notes') && row.notes) {
    try { result.notes = decrypt(row.notes, dek); } catch { result.notes = null; }
  }

  return result;
}

/**
 * Update a credential, re-encrypting changed sensitive fields.
 */
export async function updateCredential(
  id: string,
  input: Record<string, unknown>,
  dekBase64: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateCredentialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const dek = Buffer.from(base64ToDek(dekBase64));
  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.title !== undefined) updates.title = data.title;
  if (data.username !== undefined) updates.username = data.username ?? null;
  if (data.password !== undefined) updates.passwordCipher = data.password ? encrypt(data.password, dek) : null;
  if (data.apiKey !== undefined) updates.apiKeyCipher = data.apiKey ? encrypt(data.apiKey, dek) : null;
  if (data.totpSecret !== undefined) updates.totpSecretCipher = data.totpSecret ? encrypt(data.totpSecret, dek) : null;
  if (data.notes !== undefined) updates.notes = data.notes ? encrypt(data.notes, dek) : null;
  if (data.tags !== undefined) updates.tags = data.tags ? JSON.stringify(data.tags) : null;

  db.update(credentials).set(updates).where(eq(credentials.id, id)).execute();

  revalidatePath('/dashboard/credentials');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Delete a credential and unlink related tasks.
 */
export async function deleteCredential(id: string): Promise<{ success: boolean }> {
  // Unlink tasks that reference this credential
  db.update(tasks).set({ credentialId: null }).where(eq(tasks.credentialId, id)).execute();
  db.delete(credentials).where(eq(credentials.id, id)).execute();

  revalidatePath('/dashboard/credentials');
  revalidatePath('/dashboard');
  return { success: true };
}
