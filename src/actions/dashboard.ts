'use server';

import { db } from '@/lib/db';
import { credentials, tasks } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';

export async function getDashboardStats() {
  const credentialCount = db.select({ count: count() }).from(credentials).get()?.count ?? 0;

  const todoCount = db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'todo')).get()?.count ?? 0;
  const inProgressCount = db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'in_progress')).get()?.count ?? 0;
  const doneCount = db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'done')).get()?.count ?? 0;

  const recentCredentials = db
    .select({
      id: credentials.id,
      title: credentials.title,
      username: credentials.username,
      updatedAt: credentials.updatedAt,
    })
    .from(credentials)
    .orderBy(desc(credentials.updatedAt))
    .limit(5)
    .all();

  return {
    credentialCount,
    todoCount,
    inProgressCount,
    doneCount,
    recentCredentials,
  };
}
