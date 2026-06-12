'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tags, credentials } from '@/lib/db/schema';
import { createTagSchema, updateTagSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function getTags() {
  return db.select().from(tags).orderBy(tags.name).all();
}

export async function getTagsWithCount() {
  const allTags = db.select().from(tags).orderBy(tags.name).all();
  const allCredentials = db
    .select({ tags: credentials.tags })
    .from(credentials)
    .all();

  const tagCountMap = new Map<string, number>();
  for (const cred of allCredentials) {
    if (cred.tags) {
      try {
        const tagIds = JSON.parse(cred.tags) as string[];
        for (const id of tagIds) {
          tagCountMap.set(id, (tagCountMap.get(id) || 0) + 1);
        }
      } catch {}
    }
  }

  return allTags.map((tag) => ({
    ...tag,
    count: tagCountMap.get(tag.id) || 0,
  }));
}

export async function createTag(
  input: Record<string, unknown>
): Promise<{ success: boolean; error?: string; id?: string }> {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const { name } = parsed.data;
  const existing = db.select().from(tags).where(eq(tags.name, name)).get();
  if (existing) {
    return { success: false, error: '标签已存在' };
  }

  const id = nanoid();
  db.insert(tags).values({ id, name, createdAt: new Date() }).execute();

  revalidatePath('/dashboard/credentials');
  return { success: true, id };
}

export async function updateTag(
  id: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateTagSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const { name } = parsed.data;
  const existing = db.select().from(tags).where(eq(tags.name, name)).get();
  if (existing && existing.id !== id) {
    return { success: false, error: '标签名称已存在' };
  }

  db.update(tags).set({ name }).where(eq(tags.id, id)).execute();

  revalidatePath('/dashboard/credentials');
  return { success: true };
}

export async function deleteTag(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const allCredentials = db
    .select({ tags: credentials.tags })
    .from(credentials)
    .all();

  for (const cred of allCredentials) {
    if (cred.tags) {
      try {
        const tagIds = JSON.parse(cred.tags) as string[];
        if (tagIds.includes(id)) {
          return { success: false, error: '该标签正在被凭证使用，无法删除' };
        }
      } catch {}
    }
  }

  db.delete(tags).where(eq(tags.id, id)).execute();

  revalidatePath('/dashboard/credentials');
  return { success: true };
}
