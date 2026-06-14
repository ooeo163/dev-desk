'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { workLogs } from '@/lib/db/schema';
import { createWorkLogSchema, updateWorkLogSchema } from '@/lib/validation';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getCurrentWeekRange(): Promise<{ start: Date; end: Date }> {
  return getWeekRange(new Date());
}

export async function getWorkLogs() {
  const rows = db
    .select()
    .from(workLogs)
    .orderBy(desc(workLogs.weekStart))
    .all();

  return rows;
}

export async function getWorkLogById(id: string) {
  const row = db.select().from(workLogs).where(eq(workLogs.id, id)).get();
  return row ?? null;
}

export async function getOrCreateCurrentWeekWorkLog(): Promise<string> {
  const { start, end } = await getCurrentWeekRange();

  const existing = db
    .select()
    .from(workLogs)
    .where(
      and(
        lte(workLogs.weekStart, end),
        gte(workLogs.weekEnd, start)
      )
    )
    .get();

  if (existing) return existing.id;

  const id = nanoid();
  const now = new Date();

  db.insert(workLogs).values({
    id,
    weekStart: start,
    weekEnd: end,
    projectProgress: null,
    taskDetails: null,
    createdAt: now,
    updatedAt: now,
  }).execute();

  return id;
}

export async function createWorkLog(
  input: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const parsed = createWorkLogSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const data = parsed.data;
  const weekStart = new Date(data.weekStart);
  const weekEnd = new Date(data.weekEnd);

  // 检查是否存在重叠周的记录
  const existing = db
    .select()
    .from(workLogs)
    .where(
      and(
        lte(workLogs.weekStart, weekEnd),
        gte(workLogs.weekEnd, weekStart)
      )
    )
    .get();

  if (existing) {
    return { success: false, error: '该周已有工作记录，不能重复创建' };
  }

  const now = new Date();
  const id = nanoid();

  db.insert(workLogs).values({
    id,
    weekStart,
    weekEnd,
    projectProgress: data.projectProgress || null,
    taskDetails: data.taskDetails || null,
    createdAt: now,
    updatedAt: now,
  }).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true, id };
}

export async function updateWorkLog(
  id: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateWorkLogSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.weekStart !== undefined) updates.weekStart = new Date(data.weekStart);
  if (data.weekEnd !== undefined) updates.weekEnd = new Date(data.weekEnd);
  if (data.projectProgress !== undefined) updates.projectProgress = data.projectProgress ?? null;
  if (data.taskDetails !== undefined) updates.taskDetails = data.taskDetails ?? null;

  db.update(workLogs).set(updates).where(eq(workLogs.id, id)).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}

export async function deleteWorkLog(id: string): Promise<{ success: boolean }> {
  db.delete(workLogs).where(eq(workLogs.id, id)).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}
