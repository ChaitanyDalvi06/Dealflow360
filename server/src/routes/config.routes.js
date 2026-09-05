import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── GET COMBINED DISCOUNT LIMITS ───────────────────────────
// Single endpoint consumed by the frontend risk bar (Feature 4).
// Do not duplicate this logic elsewhere.
router.get('/discount-limits', authenticate, async (req, res, next) => {
  try {
    const [categoryLimits, tierLimits, approvalConfig] = await Promise.all([
      prisma.categoryDiscountLimit.findMany({ orderBy: { category: 'asc' } }),
      prisma.discountTier.findMany({ orderBy: { customerTier: 'asc' } }),
      prisma.approvalConfig.findFirst(),
    ]);

    res.json({
      categoryLimits: categoryLimits.map(cl => ({
        category: cl.category,
        maxDiscountPct: Number(cl.maxDiscountPct),
      })),
      tierLimits: tierLimits.map(tl => ({
        tier: tl.customerTier,
        maxDiscountPct: Number(tl.maxDiscountPct),
      })),
      approvalConfig: approvalConfig ? {
        managerThreshold: Number(approvalConfig.managerThreshold),
        financeThreshold: Number(approvalConfig.financeThreshold),
      } : { managerThreshold: 0, financeThreshold: 5 },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
