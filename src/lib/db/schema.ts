import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const credentials = sqliteTable('credentials', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  username: text('username'),
  address: text('address'),
  // SENSITIVE: Must be AES-256-GCM encrypted before saving
  passwordCipher: text('password_cipher'),
  apiKeyCipher: text('api_key_cipher'),
  totpSecretCipher: text('totp_secret_cipher'),
  notes: text('notes'), // Encrypted markdown
  tags: text('tags'), // JSON array of strings
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).default('todo'),
  priority: integer('priority').default(0),
  credentialId: text('credential_id').references(() => credentials.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const workLogs = sqliteTable('work_logs', {
  id: text('id').primaryKey(),
  weekStart: integer('week_start', { mode: 'timestamp' }).notNull(),
  weekEnd: integer('week_end', { mode: 'timestamp' }).notNull(),
  projectProgress: text('project_progress'), // 项目进度
  taskDetails: text('task_details'), // 任务详情
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const workLogItems = sqliteTable('work_log_items', {
  id: text('id').primaryKey(),
  workLogId: text('work_log_id').notNull().references(() => workLogs.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isCancelled: integer('is_cancelled', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  sourceTaskId: text('source_task_id'), // 关联任务ID，用于去重
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const vaultMeta = sqliteTable('vault_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
