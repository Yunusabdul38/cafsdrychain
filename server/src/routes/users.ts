import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createUserSchema, updateUserStatusSchema } from '../schemas/index.js';
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
    const { user } = await userService.createUser(req.body);
    res.status(201).json({ user });
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

router.patch(
  '/:id/status',
  validate({ body: updateUserStatusSchema }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user?.sub) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrator account.' });
    }
    const updated = await userService.updateUserStatus(req.params.id, req.body.status);
    res.json({ user: updated });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user?.sub) {
      return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    }
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  })
);

export default router;
