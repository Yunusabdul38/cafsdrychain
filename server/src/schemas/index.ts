import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
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

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const locationNameSchema = z
  .string()
  .trim()
  .min(2, 'Location name must be at least 2 characters')
  .max(100);

export const createLocationSchema = z.object({ name: locationNameSchema });

export const updateLocationSchema = z.object({ name: locationNameSchema });

export const locationIdParam = z.object({
  id: z.string().uuid('Invalid location id'),
});

/** Admin-configurable payment rules. */
export const updateSettingsSchema = z
  .object({
    feesEnabled: z.boolean().optional(),
    /** Floor an operator may charge, entered in whole naira (stored as kobo). */
    minimumFee: z.number().int().min(0).max(100_000_000).optional(),
  })
  .refine((v) => v.feesEnabled !== undefined || v.minimumFee !== undefined, {
    message: 'Nothing to update',
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().toLowerCase(),
  organization: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, 'Please tell us a little more').max(4000),
});

export const createBatchSchema = z.object({
  category: z.string().trim().min(2).max(80),
  product: z.string().trim().min(2).max(120),
  sourceType: z.enum(['Farm', 'Market']),
  source: z.string().min(2).max(160),
  freshWeight: z.number().positive().max(1_000_000),
  location: z.string().min(2).max(120),
});

export const BATCH_STAGES = ['REGISTERED', 'AWAITING_PAYMENT', 'DRYING', 'DRIED', 'STORED', 'IN_TRANSIT', 'DELIVERED'] as const;
export const BatchStageEnum = z.enum(BATCH_STAGES);

/**
 * Dates recorded against a batch may not be in the past.
 *
 * A small grace window is allowed because the operator's form is pre-filled
 * with the time it was opened: without it, spending a few minutes entering
 * weights would make the form's own default value invalid on submit.
 */
const NOT_PAST_GRACE_MS = 60 * 60 * 1000;

const notInThePast = z.coerce
  .date()
  .refine((d) => d.getTime() >= Date.now() - NOT_PAST_GRACE_MS, {
    message: 'Date and time cannot be in the past',
  });

export const advanceBatchSchema = z.object({
  // Optimistic-lock guard: if supplied, the server rejects the advance if the
  // batch has already moved past this stage (catches duplicate/concurrent submits).
  expectedStage: BatchStageEnum.optional(),
  dryingStart: notInThePast.optional(),
  dryingEnd: notInThePast.optional(),
  dryingMethod: z.string().trim().max(120).optional(),
  finalWeight: z.number().positive().max(1_000_000).optional(),
  moisture: z.number().min(0).max(100).optional(),
  quality: z.string().max(300).optional(),
  storageLocation: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

/** Drying fee, entered by the operator in whole naira. */
export const createPaymentSchema = z.object({
  amount: z
    .number()
    .int('Amount must be a whole number of naira')
    .positive('Amount must be greater than zero')
    .max(100_000_000, 'Amount is too large'),
});

export const paymentReferenceParam = z.object({
  reference: z.string().min(4).max(120),
});

export const batchIdParam = z.object({
  batchId: z.string().regex(/^[A-Za-z0-9-]{3,40}$/, 'Invalid batch id'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type AdvanceBatchInput = z.infer<typeof advanceBatchSchema>;

