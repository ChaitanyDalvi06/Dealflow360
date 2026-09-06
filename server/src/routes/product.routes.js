import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ─── LIST ALL PRODUCTS ──────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const where = {};

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: true,
        priceListEntries: true,
        subscriptionPlan: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE PRODUCT ─────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        priceListEntries: true,
        subscriptionPlan: true,
        stockLevels: { include: { warehouse: true } },
      },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ─── CREATE PRODUCT (Admin only) ────────────────────────────
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, category, basePrice, unit, taxRate, margin, description, isPromoted, isRecurring } = req.body;

    const product = await prisma.product.create({
      data: { name, category, basePrice, unit, taxRate: taxRate || 0, margin, description, isPromoted: isPromoted || false, isRecurring: isRecurring || false },
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE PRODUCT (Admin only) ────────────────────────────
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ─── GET PRODUCT CATEGORIES ─────────────────────────────────
router.get('/meta/categories', authenticate, async (req, res, next) => {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
    });
    res.json(categories.map(c => c.category));
  } catch (err) {
    next(err);
  }
});

export default router;
