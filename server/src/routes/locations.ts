import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, requireLiveSession } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { createLocationSchema, locationIdParam, updateLocationSchema } from '../schemas/index.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ locations });
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  requireLiveSession,
  validate({ body: createLocationSchema }),
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const existing = await prisma.location.findUnique({
      where: { name },
    });
    if (existing) {
      return res.status(409).json({ error: 'A location with this name already exists' });
    }
    const location = await prisma.location.create({
      data: { name },
    });
    res.status(201).json({ location });
  })
);

// Rename a location - only ADMIN users can rename locations.
// `User.location` and `Batch.location` store the hub name as a denormalized
// string, so the rename cascades to them in the same transaction; otherwise
// every operator and batch at that hub would be orphaned from the list.
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  requireLiveSession,
  validate({ params: locationIdParam, body: updateLocationSchema }),
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    const location = await prisma.location.findUnique({ where: { id: req.params.id } });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (location.name === name) {
      return res.json({ location });
    }

    const clash = await prisma.location.findUnique({ where: { name } });
    if (clash) {
      return res.status(409).json({ error: 'A location with this name already exists' });
    }

    const previousName = location.name;
    const [updated, users, batches] = await prisma.$transaction([
      prisma.location.update({ where: { id: location.id }, data: { name } }),
      prisma.user.updateMany({ where: { location: previousName }, data: { location: name } }),
      prisma.batch.updateMany({ where: { location: previousName }, data: { location: name } }),
    ]);

    res.json({
      location: updated,
      moved: { users: users.count, batches: batches.count },
    });
  })
);

export default router;
