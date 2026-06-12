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

export const vaultMeta = sqliteTable('vault_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
