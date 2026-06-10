import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────
export const masterPasswordSchema = z
  .string()
  .min(8, '主密码至少需要8个字符')
  .max(128, '主密码不能超过128个字符');

export const initVaultSchema = z.object({
  masterPassword: masterPasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.masterPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export const unlockVaultSchema = z.object({
  masterPassword: masterPasswordSchema,
});

// ── Credentials ───────────────────────────────────────
export const createCredentialSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  username: z.string().max(200).optional().or(z.literal('')),
  password: z.string().optional().or(z.literal('')),
  apiKey: z.string().optional().or(z.literal('')),
  totpSecret: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateCredentialSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100).optional(),
  username: z.string().max(200).nullish(),
  password: z.string().nullish(),
  apiKey: z.string().nullish(),
  totpSecret: z.string().nullish(),
  notes: z.string().nullish(),
  tags: z.array(z.string().max(50)).max(10).nullish(),
});

// ── Tasks ─────────────────────────────────────────────
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);

export const createTaskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(200),
  description: z.string().optional().or(z.literal('')),
  status: taskStatusSchema.default('todo'),
  priority: z.number().int().min(0).max(3).default(0),
  credentialId: z.string().optional().or(z.literal('')),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(200).optional(),
  description: z.string().nullish(),
  status: taskStatusSchema.optional(),
  priority: z.number().int().min(0).max(3).optional(),
  credentialId: z.string().nullish(),
});

// ── Type exports ──────────────────────────────────────
export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
