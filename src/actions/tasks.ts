'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tasks, credentials } from '@/lib/db/schema';
import { createTaskSchema, updateTaskSchema, taskStatusSchema } from '@/lib/validation';
import { eq, desc, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { TaskStatus } from '@/lib/validation';

export async function createTask(
  input: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const data = parsed.data;

  // Verify credential exists if linked
  if (data.credentialId) {
    const cred = db.select().from(credentials).where(eq(credentials.id, data.credentialId)).get();
    if (!cred) return { success: false, error: '关联的凭证不存在' };
  }

  db.insert(tasks).values({
    id: nanoid(),
    title: data.title,
    description: data.description || null,
    status: data.status as TaskStatus,
    priority: data.priority,
    credentialId: data.credentialId || null,
    createdAt: new Date(),
  }).execute();

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getTasks(filter?: { status?: TaskStatus }) {
  let query = db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      credentialId: tasks.credentialId,
      createdAt: tasks.createdAt,
      credentialTitle: credentials.title,
    })
    .from(tasks)
    .leftJoin(credentials, eq(tasks.credentialId, credentials.id));

  if (filter?.status) {
    query = query.where(eq(tasks.status, filter.status)) as typeof query;
  }

  const rows = query.orderBy(desc(tasks.priority), desc(tasks.createdAt)).all();

  return rows;
}

export async function updateTaskStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { success: false, error: '无效的状态值' };
  }

  db.update(tasks).set({ status: parsed.data as TaskStatus }).where(eq(tasks.id, id)).execute();

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateTask(
  id: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {};

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description ?? null;
  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.credentialId !== undefined) updates.credentialId = data.credentialId ?? null;

  db.update(tasks).set(updates).where(eq(tasks.id, id)).execute();

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
  db.delete(tasks).where(eq(tasks.id, id)).execute();

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard');
  return { success: true };
}
