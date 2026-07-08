import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(500),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  role: z.enum(['ADMIN', 'OPERATOR']),
  location: z.string().min(2).max(120),
});

export const createBatchSchema = z.object({
  product: z.string().min(2).max(120),
  sourceType: z.enum(['Farm', 'Market']),
  source: z.string().min(2).max(160),
  supplier: z.string().min(2).max(160),
  freshWeight: z.number().positive().max(1_000_000),
  deliveryDate: z.coerce.date(),
  location: z.string().min(2).max(120),
});

export const advanceBatchSchema = z.object({
  dryingStart: z.coerce.date().optional(),
  dryingEnd: z.coerce.date().optional(),
  finalWeight: z.number().positive().max(1_000_000).optional(),
  moisture: z.number().min(0).max(100).optional(),
  quality: z.string().max(300).optional(),
  storageLocation: z.string().max(200).optional(),
  packaging: z.string().max(200).optional(),
  transport: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const batchIdParam = z.object({
  batchId: z.string().regex(/^[A-Za-z0-9-]{3,40}$/, 'Invalid batch id'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type AdvanceBatchInput = z.infer<typeof advanceBatchSchema>;
