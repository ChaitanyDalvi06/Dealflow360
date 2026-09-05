import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const adminOnly = [authenticate, authorize('ADMIN', 'SALES_MANAGER')];

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
    const data = {};
    if (req.body.managerThreshold !== undefined) data.managerThreshold = Number(req.body.managerThreshold);
    if (req.body.financeThreshold !== undefined) data.financeThreshold = Number(req.body.financeThreshold);
    if (req.body.minMarginFloor !== undefined) data.minMarginFloor = Number(req.body.minMarginFloor);

    const config = await prisma.approvalConfig.update({
      where: { id: req.params.id },
      data,
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

// ─── PRODUCTS & GROSS MARGIN MANAGEMENT ────────────────────
router.get('/products', authenticate, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: { select: { quantity: true, warehouse: { select: { name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) { next(err); }
});

router.post('/products', ...adminOnly, async (req, res, next) => {
  try {
    const { name, category, basePrice, margin, description, isPromoted, isRecurring } = req.body;

    if (!name || !category || basePrice === undefined || margin === undefined) {
      return res.status(400).json({ error: 'Name, category, base price, and gross margin are required' });
    }

    const priceNum = Number(basePrice);
    const marginNum = Number(margin);

    if (priceNum <= 0) {
      return res.status(400).json({ error: 'Base price must be greater than 0' });
    }
    if (marginNum < 0 || marginNum > 100) {
      return res.status(400).json({ error: 'Gross margin percentage must be between 0 and 100' });
    }

    // 1. Create the product
    const product = await prisma.product.create({
      data: {
        name,
        category,
        basePrice: priceNum,
        margin: marginNum,
        description: description || null,
        isPromoted: Boolean(isPromoted),
        isRecurring: Boolean(isRecurring),
      },
    });

    // 2. Ensure CategoryDiscountLimit exists for this category
    const existingCat = await prisma.categoryDiscountLimit.findUnique({ where: { category } });
    if (!existingCat) {
      await prisma.categoryDiscountLimit.create({
        data: {
          category,
          maxDiscountPct: category.toLowerCase().includes('service') ? 10 : 15,
        },
      });
    }

    // 3. Create default PriceListEntry for each customer tier
    const tiers = ['BRONZE', 'SILVER', 'GOLD'];
    const tierMultipliers = { BRONZE: 1.0, SILVER: 0.95, GOLD: 0.90 };

    for (const tier of tiers) {
      await prisma.priceListEntry.create({
        data: {
          productId: product.id,
          customerTier: tier,
          currency: 'INR',
          price: Math.round(priceNum * tierMultipliers[tier] * 100) / 100,
        },
      });
    }

    // 4. Create initial stock in existing warehouses
    const warehouses = await prisma.warehouse.findMany();
    for (const wh of warehouses) {
      await prisma.stockLevel.create({
        data: {
          productId: product.id,
          warehouseId: wh.id,
          quantity: 50,
        },
      });
    }

    res.status(201).json(product);
  } catch (err) { next(err); }
});

router.put('/products/:id', ...adminOnly, async (req, res, next) => {
  try {
    const { name, category, basePrice, margin, description, isPromoted, isRecurring } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice);
    if (margin !== undefined) updateData.margin = Number(margin);
    if (description !== undefined) updateData.description = description;
    if (isPromoted !== undefined) updateData.isPromoted = Boolean(isPromoted);
    if (isRecurring !== undefined) updateData.isRecurring = Boolean(isRecurring);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // If basePrice changed, update price list entries
    if (basePrice !== undefined) {
      const priceNum = Number(basePrice);
      const tierMultipliers = { BRONZE: 1.0, SILVER: 0.95, GOLD: 0.90 };
      for (const [tier, mult] of Object.entries(tierMultipliers)) {
        await prisma.priceListEntry.upsert({
          where: {
            productId_customerTier_currency: {
              productId: product.id,
              customerTier: tier,
              currency: 'INR',
            },
          },
          update: { price: Math.round(priceNum * mult * 100) / 100 },
          create: {
            productId: product.id,
            customerTier: tier,
            currency: 'INR',
            price: Math.round(priceNum * mult * 100) / 100,
          },
        });
      }
    }

    res.json(product);
  } catch (err) { next(err); }
});

router.delete('/products/:id', ...adminOnly, async (req, res, next) => {
  try {
    const quotationLines = await prisma.quotationLine.count({
      where: { productId: req.params.id },
    });

    if (quotationLines > 0) {
      return res.status(400).json({
        error: `Cannot delete product: it is currently referenced in ${quotationLines} quotation(s). You can set its margin or price instead.`,
      });
    }

    // Clean up relations first
    await prisma.priceListEntry.deleteMany({ where: { productId: req.params.id } });
    await prisma.stockLevel.deleteMany({ where: { productId: req.params.id } });
    await prisma.upsellRule.deleteMany({
      where: { OR: [{ triggerProductId: req.params.id }, { suggestedProductId: req.params.id }] },
    });

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted successfully' });
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
