import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { computeWarehouseSplit, saveWarehouseSplit, getWarehouseSplit } from '../services/warehouse.service.js';
import { publishEvent, TOPICS } from '../services/event.service.js';

const router = Router();

// ─── LIST WAREHOUSES ────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        stockLevels: {
          include: { product: { select: { id: true, name: true, category: true } } },
        },
      },
      orderBy: { shippingCostWeight: 'asc' },
    });
    res.json(warehouses);
  } catch (err) {
    next(err);
  }
});

// ─── CREATE WAREHOUSE (Admin only) ─────────────────────────
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, location, shippingCostWeight = 1.0 } = req.body;
    const warehouse = await prisma.warehouse.create({
      data: { name, location, shippingCostWeight },
    });
    res.status(201).json(warehouse);
  } catch (err) {
    next(err);
  }
});

// ─── COMPUTE SPLIT RECOMMENDATION ──────────────────────────
router.post('/split/:quotationId', authenticate, async (req, res, next) => {
  try {
    const result = await computeWarehouseSplit(req.params.quotationId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── SAVE SPLIT (accept recommended or manual override) ────
router.post('/split/:quotationId/save', authenticate, async (req, res, next) => {
  try {
    const { splits } = req.body; // Array of { warehouseId, productId, quantityFulfilled }
    const saved = await saveWarehouseSplit(req.params.quotationId, splits);

    // Update quotation status to IN_FULFILLMENT
    await prisma.quotation.update({
      where: { id: req.params.quotationId },
      data: { status: 'IN_FULFILLMENT' },
    });

    // Publish stock events
    for (const split of splits) {
      publishEvent(TOPICS.STOCK_EVENTS, {
        warehouseId: split.warehouseId,
        productId: split.productId,
        quantityDeducted: split.quantityFulfilled,
        quotationId: req.params.quotationId,
      });
    }

    res.json({ saved, message: 'Warehouse split saved. Stock deducted. Order in fulfillment.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET EXISTING SPLIT ─────────────────────────────────────
router.get('/split/:quotationId', authenticate, async (req, res, next) => {
  try {
    const splits = await getWarehouseSplit(req.params.quotationId);
    res.json(splits);
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE STOCK (Admin only) ──────────────────────────────
router.patch('/stock', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { warehouseId, productId, quantity } = req.body;

    const stock = await prisma.stockLevel.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      update: { quantity },
      create: { warehouseId, productId, quantity },
    });

    publishEvent(TOPICS.STOCK_EVENTS, {
      warehouseId,
      productId,
      newQuantity: quantity,
      action: 'STOCK_UPDATE',
    });

    res.json(stock);
  } catch (err) {
    next(err);
  }
});

// ─── CONSOLIDATE REMAINING BACKORDER ────────────────────────
router.post('/consolidate/:quotationId', authenticate, authorize('SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const { consolidateBackorders } = await import('../services/warehouse.service.js');
    const result = await consolidateBackorders(req.params.quotationId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
