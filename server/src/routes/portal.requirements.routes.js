import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticateCustomer } from '../middleware/auth.js';

const router = Router();

// ─── CREATE REQUIREMENT ─────────────────────────────────────
router.post('/requirements', authenticateCustomer, async (req, res, next) => {
  try {
    const { title, notes, desiredItems } = req.body;

    if (!title || !desiredItems || !Array.isArray(desiredItems) || desiredItems.length === 0) {
      return res.status(400).json({ error: 'Title and at least one desired item are required' });
    }

    // Validate product IDs exist
    const productIds = desiredItems.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validIds = new Set(products.map(p => p.id));
    const invalidItems = desiredItems.filter(i => !validIds.has(i.productId));
    if (invalidItems.length > 0) {
      return res.status(400).json({ error: 'Some product IDs are invalid' });
    }

    const requirement = await prisma.requirement.create({
      data: {
        customerId: req.customer.id,
        title,
        notes: notes || '',
        desiredItems,
      },
      include: {
        customer: { select: { id: true, name: true, company: true } },
      },
    });

    res.status(201).json(requirement);
  } catch (err) {
    next(err);
  }
});

// ─── LIST MY REQUIREMENTS ───────────────────────────────────
router.get('/requirements', authenticateCustomer, async (req, res, next) => {
  try {
    const requirements = await prisma.requirement.findMany({
      where: { customerId: req.customer.id },
      include: {
        assignedRep: { select: { name: true, email: true } },
        quotations: {
          select: { id: true, status: true, orderTotal: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requirements);
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE REQUIREMENT ────────────────────────────────
router.get('/requirements/:id', authenticateCustomer, async (req, res, next) => {
  try {
    const requirement = await prisma.requirement.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      include: {
        assignedRep: { select: { name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        quotations: {
          include: {
            lines: {
              include: {
                product: { select: { name: true, category: true } },
              },
            },
          },
        },
      },
    });

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    res.json(requirement);
  } catch (err) {
    next(err);
  }
});

// ─── PRODUCT CATALOG (read-only, no prices) ─────────────────
router.get('/products', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        description: true,
      },
      orderBy: { category: 'asc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

export default router;
