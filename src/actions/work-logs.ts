'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { workLogs, workLogItems } from '@/lib/db/schema';
import { createWorkLogSchema, updateWorkLogSchema, createWorkLogItemSchema, updateWorkLogItemSchema } from '@/lib/validation';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
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
    .select({
      id: workLogs.id,
      weekStart: workLogs.weekStart,
      weekEnd: workLogs.weekEnd,
      projectProgress: workLogs.projectProgress,
      createdAt: workLogs.createdAt,
      updatedAt: workLogs.updatedAt,
    })
    .from(workLogs)
    .orderBy(desc(workLogs.weekStart))
    .all();

  const result = await Promise.all(
    rows.map(async (row) => {
      const items = db
        .select()
        .from(workLogItems)
        .where(eq(workLogItems.workLogId, row.id))
        .orderBy(asc(workLogItems.sortOrder))
        .all();

      return {
        ...row,
        items: items.map((item) => ({
          id: item.id,
          content: item.content,
          isCancelled: !!item.isCancelled,
          sortOrder: item.sortOrder ?? 0,
          sourceTaskId: item.sourceTaskId,
        })),
      };
    })
  );

  return result;
}

export async function getWorkLogById(id: string) {
  const row = db.select().from(workLogs).where(eq(workLogs.id, id)).get();
  if (!row) return null;

  const items = db
    .select()
    .from(workLogItems)
    .where(eq(workLogItems.workLogId, row.id))
    .orderBy(asc(workLogItems.sortOrder))
    .all();

  return {
    ...row,
    items: items.map((item) => ({
      id: item.id,
      content: item.content,
      isCancelled: !!item.isCancelled,
      sortOrder: item.sortOrder ?? 0,
      sourceTaskId: item.sourceTaskId,
    })),
  };
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

  const prevWeekStart = new Date(start);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekStart.getDate() + 6);

  const prevWeek = db
    .select()
    .from(workLogs)
    .where(
      and(
        lte(workLogs.weekStart, prevWeekEnd),
        gte(workLogs.weekEnd, prevWeekStart)
      )
    )
    .get();

  const id = nanoid();
  const now = new Date();

  db.insert(workLogs).values({
    id,
    weekStart: start,
    weekEnd: end,
    projectProgress: prevWeek?.projectProgress ?? null,
    createdAt: now,
    updatedAt: now,
  }).execute();

  if (prevWeek) {
    const prevItems = db
      .select()
      .from(workLogItems)
      .where(eq(workLogItems.workLogId, prevWeek.id))
      .orderBy(asc(workLogItems.sortOrder))
      .all();

    if (prevItems.length > 0) {
      db.insert(workLogItems)
        .values(
          prevItems.map((item, idx) => ({
            id: nanoid(),
            workLogId: id,
            content: item.content,
            isCancelled: item.isCancelled,
            sortOrder: idx,
            sourceTaskId: null,
            createdAt: now,
          }))
        )
        .execute();
    }
  }

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
    createdAt: now,
    updatedAt: now,
  }).execute();

  if (data.items && data.items.length > 0) {
    db.insert(workLogItems)
      .values(
        data.items.map((item, idx) => ({
          id: nanoid(),
          workLogId: id,
          content: item.content,
          isCancelled: false,
          sortOrder: idx,
          sourceTaskId: null,
          createdAt: now,
        }))
      )
      .execute();
  }

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

  db.update(workLogs).set(updates).where(eq(workLogs.id, id)).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}

export async function deleteWorkLog(id: string): Promise<{ success: boolean }> {
  db.delete(workLogItems).where(eq(workLogItems.workLogId, id)).execute();
  db.delete(workLogs).where(eq(workLogs.id, id)).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}

export async function addWorkLogItem(
  workLogId: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const parsed = createWorkLogItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const data = parsed.data;
  const now = new Date();
  const id = nanoid();

  const maxSort = db
    .select({ max: workLogItems.sortOrder })
    .from(workLogItems)
    .where(eq(workLogItems.workLogId, workLogId))
    .orderBy(desc(workLogItems.sortOrder))
    .get();

  db.insert(workLogItems).values({
    id,
    workLogId,
    content: data.content,
    isCancelled: data.isCancelled,
    sortOrder: (maxSort?.max ?? -1) + 1,
    sourceTaskId: null,
    createdAt: now,
  }).execute();

  db.update(workLogs).set({ updatedAt: now }).where(eq(workLogs.id, workLogId)).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true, id };
}

export async function updateWorkLogItem(
  id: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateWorkLogItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '验证失败' };
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {};

  if (data.content !== undefined) updates.content = data.content;
  if (data.isCancelled !== undefined) updates.isCancelled = data.isCancelled;
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

  db.update(workLogItems).set(updates).where(eq(workLogItems.id, id)).execute();

  const item = db.select({ workLogId: workLogItems.workLogId }).from(workLogItems).where(eq(workLogItems.id, id)).get();
  if (item) {
    db.update(workLogs).set({ updatedAt: new Date() }).where(eq(workLogs.id, item.workLogId)).execute();
  }

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}

export async function deleteWorkLogItem(id: string): Promise<{ success: boolean }> {
  const item = db.select({ workLogId: workLogItems.workLogId }).from(workLogItems).where(eq(workLogItems.id, id)).get();
  db.delete(workLogItems).where(eq(workLogItems.id, id)).execute();

  if (item) {
    db.update(workLogs).set({ updatedAt: new Date() }).where(eq(workLogs.id, item.workLogId)).execute();
  }

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}

export async function syncTaskToWorkLog(taskTitle: string, taskId: string): Promise<{ success: boolean }> {
  const { start, end } = await getCurrentWeekRange();

  let workLog = db
    .select()
    .from(workLogs)
    .where(
      and(
        lte(workLogs.weekStart, end),
        gte(workLogs.weekEnd, start)
      )
    )
    .get();

  if (!workLog) {
    const id = nanoid();
    const now = new Date();
    db.insert(workLogs).values({
      id,
      weekStart: start,
      weekEnd: end,
      projectProgress: null,
      createdAt: now,
      updatedAt: now,
    }).execute();
    workLog = db.select().from(workLogs).where(eq(workLogs.id, id)).get()!;
  }

  const existing = db
    .select()
    .from(workLogItems)
    .where(
      and(
        eq(workLogItems.workLogId, workLog.id),
        eq(workLogItems.sourceTaskId, taskId)
      )
    )
    .get();

  if (existing) {
    if (existing.isCancelled) {
      db.update(workLogItems)
        .set({ isCancelled: false })
        .where(eq(workLogItems.id, existing.id))
        .execute();
    }
    return { success: true };
  }

  const maxSort = db
    .select({ max: workLogItems.sortOrder })
    .from(workLogItems)
    .where(eq(workLogItems.workLogId, workLog.id))
    .orderBy(desc(workLogItems.sortOrder))
    .get();

  const now = new Date();
  db.insert(workLogItems).values({
    id: nanoid(),
    workLogId: workLog.id,
    content: taskTitle,
    isCancelled: false,
    sortOrder: (maxSort?.max ?? -1) + 1,
    sourceTaskId: taskId,
    createdAt: now,
  }).execute();

  db.update(workLogs).set({ updatedAt: now }).where(eq(workLogs.id, workLog.id)).execute();

  revalidatePath('/dashboard/work-logs');
  return { success: true };
}
