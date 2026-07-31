'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tasks, credentials } from '@/lib/db/schema';
import { createTaskSchema, updateTaskSchema, taskStatusSchema } from '@/lib/validation';
import { eq, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { TaskStatus } from '@/lib/validation';
import {
  createWorkbook,
  addSheetWithColumns,
  formatDateCN,
  workbookToUint8Array,
} from '@/lib/excel-export';

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

export async function getTasks(filter?: { 
  status?: TaskStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // 查询总数
  let countQuery = db.select({ total: count() }).from(tasks);
  if (filter?.status) {
    countQuery = countQuery.where(eq(tasks.status, filter.status)) as typeof countQuery;
  }
  const countResult = countQuery.get();
  const total = countResult?.total ?? 0;

  // 分页查询
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

  const rows = query
    .orderBy(desc(tasks.priority), desc(tasks.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  return { data: rows, total, page, pageSize };
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

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
};

const priorityLabels: Record<number, string> = {
  0: '无',
  1: '低',
  2: '中',
  3: '高',
};

/**
 * Export all tasks as an Excel workbook.
 */
export async function exportTasks(): Promise<Uint8Array> {
  const rows = db
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
    .leftJoin(credentials, eq(tasks.credentialId, credentials.id))
    .orderBy(desc(tasks.createdAt))
    .all();

  const wb = createWorkbook();
  const ws = addSheetWithColumns(wb, '任务管理', [
    { header: '标题', key: 'title', width: 25 },
    { header: '描述', key: 'description', width: 40 },
    { header: '状态', key: 'status', width: 12 },
    { header: '优先级', key: 'priority', width: 10 },
    { header: '关联凭证', key: 'credentialTitle', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ]);

  for (const row of rows) {
    ws.addRow({
      title: row.title,
      description: row.description?.replace(/<[^>]+>/g, '') ?? '',
      status: statusLabels[row.status ?? 'todo'] ?? row.status,
      priority: priorityLabels[row.priority ?? 0] ?? String(row.priority),
      credentialTitle: row.credentialTitle ?? '',
      createdAt: formatDateCN(row.createdAt),
    });
  }

  return workbookToUint8Array(wb);
}
