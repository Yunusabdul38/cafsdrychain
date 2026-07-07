import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createUserSchema } from '../schemas/index.js';
import * as userService from '../services/userService.js';

const router = Router();

// All user-management endpoints are admin-only.
router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ users: await userService.listUsers() });
  })
);

router.post(
  '/',
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    // Provisioning a user derives their deterministic wallet automatically.
    const result = await userService.createUser(req.body);
    res.status(201).json(result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  })
);

export default router;
