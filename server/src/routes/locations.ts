import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { createLocationSchema } from '../schemas/index.js';

const router = Router();

// Get all locations - any authenticated user can view the locations list
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

// Create a location - only ADMIN users can create locations
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
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

export default router;
