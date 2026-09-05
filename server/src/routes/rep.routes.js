import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const repOnly = [authenticate, authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN')];

// ─── LIST UNASSIGNED REQUIREMENTS ───────────────────────────
router.get('/requirements/unassigned', ...repOnly, async (req, res, next) => {
  try {
    const requirements = await prisma.requirement.findMany({
      where: { status: 'NEW', assignedRepId: null },
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requirements);
  } catch (err) {
    next(err);
  }
});

// ─── CLAIM A REQUIREMENT ────────────────────────────────────
// Atomic: only succeeds if still unassigned
router.post('/requirements/:id/claim', ...repOnly, async (req, res, next) => {
  try {
    // Use updateMany with a WHERE guard to prevent race conditions
    const result = await prisma.requirement.updateMany({
      where: { id: req.params.id, status: 'NEW', assignedRepId: null },
      data: { assignedRepId: req.user.id, status: 'ASSIGNED' },
    });

    if (result.count === 0) {
      return res.status(409).json({ error: 'Requirement is no longer available — already claimed or does not exist' });
    }

    const requirement = await prisma.requirement.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
      },
    });

    res.json({ message: 'Requirement claimed successfully', requirement });
  } catch (err) {
    next(err);
  }
});

// ─── LIST MY ASSIGNED REQUIREMENTS ──────────────────────────
router.get('/requirements/mine', ...repOnly, async (req, res, next) => {
  try {
    const requirements = await prisma.requirement.findMany({
      where: { assignedRepId: req.user.id },
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requirements);
  } catch (err) {
    next(err);
  }
});

export default router;
