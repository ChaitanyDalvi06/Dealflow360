import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const adminOnly = [authenticate, authorize('ADMIN')];

// ─── DISCOUNT TIERS ─────────────────────────────────────────
router.get('/discount-tiers', authenticate, async (req, res, next) => {
  try {
    const tiers = await prisma.discountTier.findMany({ orderBy: { customerTier: 'asc' } });
    res.json(tiers);
  } catch (err) { next(err); }
});

router.put('/discount-tiers/:id', ...adminOnly, async (req, res, next) => {
  try {
    const tier = await prisma.discountTier.update({
      where: { id: req.params.id },
      data: { maxDiscountPct: req.body.maxDiscountPct },
    });
    res.json(tier);
  } catch (err) { next(err); }
});

// ─── CATEGORY DISCOUNT LIMITS ───────────────────────────────
router.get('/category-limits', authenticate, async (req, res, next) => {
  try {
    const limits = await prisma.categoryDiscountLimit.findMany({ orderBy: { category: 'asc' } });
    res.json(limits);
  } catch (err) { next(err); }
});

router.put('/category-limits/:id', ...adminOnly, async (req, res, next) => {
  try {
    const limit = await prisma.categoryDiscountLimit.update({
      where: { id: req.params.id },
      data: { maxDiscountPct: req.body.maxDiscountPct },
    });
    res.json(limit);
  } catch (err) { next(err); }
});

// ─── APPROVAL CONFIG ────────────────────────────────────────
router.get('/approval-config', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.approvalConfig.findFirst();
    res.json(config);
  } catch (err) { next(err); }
});

router.put('/approval-config/:id', ...adminOnly, async (req, res, next) => {
  try {
    const config = await prisma.approvalConfig.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(config);
  } catch (err) { next(err); }
});

// ─── CUSTOMERS ──────────────────────────────────────────────
router.get('/customers', authenticate, async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, name: true, email: true, tier: true, company: true, phone: true },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (err) { next(err); }
});

router.post('/customers', ...adminOnly, async (req, res, next) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(customer);
  } catch (err) { next(err); }
});

// ─── SUBSCRIPTION PLANS ─────────────────────────────────────
router.get('/subscription-plans', ...adminOnly, async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: { product: { select: { name: true, basePrice: true } } },
    });
    res.json(plans);
  } catch (err) { next(err); }
});

// ─── UPSELL RULES ───────────────────────────────────────────
router.get('/upsell-rules', ...adminOnly, async (req, res, next) => {
  try {
    const rules = await prisma.upsellRule.findMany();
    res.json(rules);
  } catch (err) { next(err); }
});

// ─── USERS ──────────────────────────────────────────────────
router.get('/users', ...adminOnly, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

export default router;
