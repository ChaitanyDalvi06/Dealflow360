import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── LIST NOTIFICATIONS ─────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    // Retrieve notifications matching user role, userId, or broadcast to 'ALL'
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetRole: userRole },
          { userId: userId },
          { targetRole: 'ALL' },
          ...(req.user.type === 'customer' ? [{ targetRole: 'CUSTOMER' }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// ─── MARK NOTIFICATION AS READ ──────────────────────────────
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── MARK ALL AS READ ───────────────────────────────────────
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        OR: [
          { targetRole: userRole },
          { userId: userId },
          { targetRole: 'ALL' },
          ...(req.user.type === 'customer' ? [{ targetRole: 'CUSTOMER' }] : []),
        ],
        read: false,
      },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
