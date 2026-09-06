import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { computeBlendedRiskScore, recalculateQuotationTotals } from '../services/discount.service.js';
import { routeForApproval } from '../services/approval.service.js';
import { getUpsellRecommendations, predictNegotiationAcceptance } from '../services/ml.service.js';
import { publishEvent, TOPICS } from '../services/event.service.js';

const router = Router();

// ─── CALCULATE RISK PREVIEW (for Workspace real-time panel) ─
router.post('/calculate-risk', authenticate, async (req, res, next) => {
  try {
    const { customerId, lines = [] } = req.body;
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let grossAmount = 0;
    let totalDiscountAmount = 0;
    let totalCost = 0;
    let maxLineDiscount = 0;

    for (const l of lines) {
      const product = await prisma.product.findUnique({ where: { id: l.productId } });
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice) || Number(product?.basePrice || 0);
      const disc = Number(l.discountPct) || 0;
      const cost = Number(product?.costPrice || (price * (1 - (Number(product?.margin || 30) / 100))));

      const lineGross = qty * price;
      const lineDisc = lineGross * (disc / 100);

      grossAmount += lineGross;
      totalDiscountAmount += lineDisc;
      totalCost += qty * cost;

      if (disc > maxLineDiscount) maxLineDiscount = disc;
    }

    const netAmount = Math.max(0, grossAmount - totalDiscountAmount);
    const effectiveDiscountPct = grossAmount > 0 ? (totalDiscountAmount / grossAmount) * 100 : 0;
    const grossMargin = netAmount > 0 ? ((netAmount - totalCost) / netAmount) * 100 : 0;

    // Blended risk score calculation (0 - 100)
    const tierLimit = customer.tier === 'GOLD' ? 15 : customer.tier === 'SILVER' ? 10 : 5;
    let discountRisk = Math.min(60, (effectiveDiscountPct / (tierLimit * 2)) * 60);
    let marginRisk = grossMargin < 20 ? 40 : grossMargin < 35 ? 20 : 5;
    let blendedRiskScore = Math.min(100, Math.round(discountRisk + marginRisk));

    let riskLevel = 'LOW';
    if (blendedRiskScore > 60 || effectiveDiscountPct > tierLimit * 1.5) riskLevel = 'HIGH';
    else if (blendedRiskScore > 30 || effectiveDiscountPct > tierLimit) riskLevel = 'MEDIUM';

    let requiredApprovalLevel = 'LEVEL_1_AUTO';
    if (effectiveDiscountPct > tierLimit * 1.5 || grossMargin < 20) {
      requiredApprovalLevel = 'LEVEL_3_DIRECTOR';
    } else if (effectiveDiscountPct > tierLimit || grossMargin < 35) {
      requiredApprovalLevel = 'LEVEL_2_MANAGER';
    }

    // Model 2: Compute predicted buyer acceptance probability for the Sales Rep
    let acceptancePrediction = null;
    try {
      const { requirementId } = req.body;

      // 1. Fetch live buyer chat messages to run VADER sentiment analysis
      let liveMessages = [];
      if (requirementId) {
        liveMessages = await prisma.message.findMany({
          where: { requirementId, senderRole: 'CUSTOMER' },
          orderBy: { createdAt: 'desc' },
          take: 6,
        });
      }
      if (liveMessages.length === 0 && customerId) {
        const customerReqs = await prisma.requirement.findMany({
          where: { customerId },
          select: { id: true },
        });
        const reqIds = customerReqs.map(r => r.id);
        if (reqIds.length > 0) {
          liveMessages = await prisma.message.findMany({
            where: { requirementId: { in: reqIds }, senderRole: 'CUSTOMER' },
            orderBy: { createdAt: 'desc' },
            take: 6,
          });
        }
      }

      // Combine buyer's messages into transcript text
      const buyerTranscript = liveMessages.map(m => m.content).reverse().join('. ');

      // 2. Parse any discount request or churn signal in buyer's text
      let targetDiscount = effectiveDiscountPct;
      if (buyerTranscript) {
        const percentMatch = buyerTranscript.match(/(\d+(?:\.\d+)?)\s*%/);
        if (percentMatch) {
          targetDiscount = parseFloat(percentMatch[1]);
        } else if (/lower.*price|cancel|too\s*much|expensive|budget|nah|cheaper/i.test(buyerTranscript)) {
          // Buyer explicitly complaining about price / threatening cancellation
          targetDiscount = Math.max(effectiveDiscountPct + 8, tierLimit + 5);
        }
      }

      const discountGap = Math.max(0, targetDiscount - effectiveDiscountPct);

      acceptancePrediction = await predictNegotiationAcceptance({
        discountRequestedPct: targetDiscount,
        discountGap: discountGap,
        customerTier: customer.tier,
        dealSize: netAmount,
        negotiationRounds: Math.max(1, liveMessages.length),
        message: buyerTranscript, // Passes live transcript to VADER NLP in Python!
        currentDiscount: effectiveDiscountPct
      });
    } catch (predErr) {
      console.warn('Prediction error in calculate-risk:', predErr.message);
      acceptancePrediction = null;
    }

    res.json({
      grossAmount,
      totalDiscountAmount,
      netAmount,
      effectiveDiscountPct: Math.round(effectiveDiscountPct * 10) / 10,
      marginPct: Math.round(grossMargin * 10) / 10,
      blendedRiskScore,
      riskLevel,
      requiredApprovalLevel,
      acceptancePrediction, // <-- Model 2 for Sales Rep
    });
  } catch (err) {
    next(err);
  }
});

// ─── UPSELL RECOMMENDATIONS ─────────────────────────────────
router.post('/upsell-recommendations', authenticate, async (req, res, next) => {
  try {
    const { productIds = [] } = req.body;
    if (productIds.length === 0) return res.json([]);

    const rules = await prisma.upsellRule.findMany({
      where: { sourceProductId: { in: productIds } },
      take: 4,
    });

    const targetProductIds = rules.map(r => r.targetProductId).filter(id => !productIds.includes(id));
    const products = await prisma.product.findMany({
      where: { id: { in: targetProductIds } },
    });

    const recommendations = products.map(prod => {
      const rule = rules.find(r => r.targetProductId === prod.id);
      return {
        product: prod,
        reason: 'Frequently bundled with selected items (+ ₹' + Number(rule?.marginDelta || 5000).toLocaleString('en-IN') + ' margin)',
        marginDelta: Number(rule?.marginDelta || 0),
      };
    });

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, customerId } = req.query;
    const where = {};

    // Sales reps see only their own quotes; managers/admins see all
    if (req.user.role === 'SALES_REP') {
      where.repId = req.user.id;
    }
    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }
    if (customerId) where.customerId = customerId;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
        rep: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, name: true, category: true } } } },
        invoices: { select: { id: true, type: true, amount: true, status: true, issuedAt: true } },
        _count: { select: { approvalSteps: true } },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    res.json(quotations);
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE QUOTATION ──────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        rep: { select: { id: true, name: true, email: true, role: true } },
        lines: {
          include: {
            product: { include: { subscriptionPlan: true, variants: true } },
            variant: true,
            subscription: true,
          },
        },
        approvalSteps: {
          include: { approver: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        warehouseSplits: { include: { warehouse: true } },
        invoices: { include: { payments: true } },
        creditNotes: true,
        negotiations: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    next(err);
  }
});

// Helper to save/replace quotation line items and recalculate totals
async function saveQuotationLines(quotationId, lines) {
  if (!lines || !Array.isArray(lines) || lines.length === 0) return;

  // Clear existing lines
  await prisma.quotationLine.deleteMany({ where: { quotationId } });

  for (const item of lines) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) continue;

    const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.basePrice);
    const quantity = Number(item.quantity || 1);
    const discountPct = Number(item.discountPct || 0);

    const discountedPrice = unitPrice * (1 - discountPct / 100);
    const lineTotal = discountedPrice * quantity;
    const lineMargin = lineTotal * (Number(product.margin) / 100);

    await prisma.quotationLine.create({
      data: {
        quotationId,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity,
        unitPrice,
        discountPct,
        lineTotal: Math.round(lineTotal * 100) / 100,
        lineMargin: Math.round(lineMargin * 100) / 100,
        isRecurring: product.isRecurring,
      },
    });
  }

  await recalculateQuotationTotals(quotationId);
}

// ─── CREATE QUOTATION ──────────────────────────────────────
router.post('/', authenticate, authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { customerId, notes, requirementId, lines, currency = 'INR', deliveryPromiseDate } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const quotationData = {
      customerId,
      repId: req.user.id,
      status: 'DRAFT',
      notes,
      currency,
      deliveryPromiseDate: deliveryPromiseDate ? new Date(deliveryPromiseDate) : null,
      orderTotal: 0,
      totalMargin: 0,
    };

    // Link to requirement if provided
    if (requirementId) {
      const requirement = await prisma.requirement.findUnique({ where: { id: requirementId } });
      if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
      quotationData.requirementId = requirementId;

      // Update requirement status
      await prisma.requirement.update({
        where: { id: requirementId },
        data: { status: 'QUOTED' },
      });
    }

    const quotation = await prisma.quotation.create({
      data: quotationData,
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
        rep: { select: { id: true, name: true } },
      },
    });

    // If lines provided, save them
    if (lines && Array.isArray(lines) && lines.length > 0) {
      await saveQuotationLines(quotation.id, lines);
    }

    await createAuditLog({
      entityType: 'Quotation',
      entityId: quotation.id,
      actorId: req.user.id,
      action: 'CREATED',
      reason: `New quotation for ${customer.name}${requirementId ? ' (from requirement)' : ''}`,
    });

    const fullQuotation = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
        rep: { select: { id: true, name: true } },
        lines: { include: { product: true, variant: true } },
        creditNotes: true,
      },
    });

    res.status(201).json(fullQuotation);
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE QUOTATION (DRAFT) ──────────────────────────────
router.put('/:id', authenticate, authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { customerId, notes, lines, currency, deliveryPromiseDate } = req.body;
    const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const updateData = {};
    if (customerId) updateData.customerId = customerId;
    if (notes !== undefined) updateData.notes = notes;
    if (currency) updateData.currency = currency;
    if (deliveryPromiseDate !== undefined) {
      updateData.deliveryPromiseDate = deliveryPromiseDate ? new Date(deliveryPromiseDate) : null;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.quotation.update({
        where: { id: req.params.id },
        data: updateData,
      });
    }

    if (lines && Array.isArray(lines)) {
      await saveQuotationLines(req.params.id, lines);
    }

    const updated = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, tier: true, company: true } },
        rep: { select: { id: true, name: true } },
        lines: { include: { product: true, variant: true } },
        creditNotes: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── ADD LINE TO QUOTATION ──────────────────────────────────
router.post('/:id/lines', authenticate, async (req, res, next) => {
  try {
    const { productId, quantity = 1, discountPct = 0 } = req.body;

    const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (!['DRAFT', 'UNDER_NEGOTIATION', 'NEEDS_REVISION'].includes(quotation.status)) {
      return res.status(400).json({ error: 'Can only add lines to draft, negotiating, or revision-needed quotations' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Get tier-based price for this customer
    const customer = await prisma.customer.findUnique({ where: { id: quotation.customerId } });
    const priceEntry = await prisma.priceListEntry.findFirst({
      where: { productId, customerTier: customer.tier },
    });

    const unitPrice = priceEntry ? Number(priceEntry.price) : Number(product.basePrice);
    const discountedPrice = unitPrice * (1 - discountPct / 100);
    const lineTotal = discountedPrice * quantity;
    const lineMargin = lineTotal * (Number(product.margin) / 100);

    const line = await prisma.quotationLine.create({
      data: {
        quotationId: req.params.id,
        productId,
        quantity,
        unitPrice,
        discountPct,
        lineTotal: Math.round(lineTotal * 100) / 100,
        lineMargin: Math.round(lineMargin * 100) / 100,
        isRecurring: product.isRecurring,
      },
      include: { product: true },
    });

    // Recalculate totals and risk score
    const totals = await recalculateQuotationTotals(req.params.id);
    const riskScore = await computeBlendedRiskScore(req.params.id);

    // Publish discount event if discount applied
    if (discountPct > 0) {
      publishEvent(TOPICS.DISCOUNT_EVENTS, {
        quotationId: req.params.id,
        repId: req.user.id,
        productCategory: product.category,
        discountPct,
        lineValue: lineTotal,
      });
    }

    res.status(201).json({ line, totals, blendedRiskScore: riskScore });
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE LINE DISCOUNT ───────────────────────────────────
router.patch('/:id/lines/:lineId', authenticate, async (req, res, next) => {
  try {
    const { quantity, discountPct } = req.body;

    const line = await prisma.quotationLine.findUnique({
      where: { id: req.params.lineId },
      include: { product: true },
    });

    if (!line) return res.status(404).json({ error: 'Line not found' });

    const updates = {};
    if (quantity !== undefined) updates.quantity = quantity;
    if (discountPct !== undefined) updates.discountPct = discountPct;

    const newQty = quantity ?? line.quantity;
    const newDiscount = discountPct ?? Number(line.discountPct);
    const unitPrice = Number(line.unitPrice);
    const discountedPrice = unitPrice * (1 - newDiscount / 100);
    updates.lineTotal = Math.round(discountedPrice * newQty * 100) / 100;
    updates.lineMargin = Math.round(updates.lineTotal * (Number(line.product.margin) / 100) * 100) / 100;

    const updated = await prisma.quotationLine.update({
      where: { id: req.params.lineId },
      data: updates,
      include: { product: true },
    });

    const totals = await recalculateQuotationTotals(req.params.id);
    const riskScore = await computeBlendedRiskScore(req.params.id);

    if (discountPct !== undefined && discountPct > 0) {
      publishEvent(TOPICS.DISCOUNT_EVENTS, {
        quotationId: req.params.id,
        repId: req.user.id,
        productCategory: line.product.category,
        discountPct: newDiscount,
        lineValue: updates.lineTotal,
      });
    }

    res.json({ line: updated, totals, blendedRiskScore: riskScore });
  } catch (err) {
    next(err);
  }
});

// ─── REMOVE LINE ────────────────────────────────────────────
router.delete('/:id/lines/:lineId', authenticate, async (req, res, next) => {
  try {
    await prisma.quotationLine.delete({ where: { id: req.params.lineId } });
    const totals = await recalculateQuotationTotals(req.params.id);
    const riskScore = await computeBlendedRiskScore(req.params.id);
    res.json({ totals, blendedRiskScore: riskScore });
  } catch (err) {
    next(err);
  }
});

// ─── SUBMIT FOR APPROVAL ───────────────────────────────────
router.post('/:id/submit', authenticate, async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (quotation.lines.length === 0) {
      return res.status(400).json({ error: 'Cannot submit an empty quotation' });
    }

    const result = await routeForApproval(req.params.id, req.user.id);

    // Update status to SENT if auto-approved
    if (result.approved) {
      await prisma.quotation.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED' },
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET UPSELL RECOMMENDATIONS ─────────────────────────────
router.get('/:id/recommendations', authenticate, async (req, res, next) => {
  try {
    const lines = await prisma.quotationLine.findMany({
      where: { quotationId: req.params.id },
      select: { productId: true },
    });

    const productIds = lines.map(l => l.productId);
    const recommendations = await getUpsellRecommendations(productIds);

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

// ─── CONFIRM QUOTATION (after approval) ────────────────────
router.post('/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (quotation.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Quotation must be approved before confirmation' });
    }

    await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED' },
    });

    await createAuditLog({
      entityType: 'Quotation',
      entityId: req.params.id,
      actorId: req.user.id,
      action: 'CONFIRMED',
      reason: 'Quotation confirmed for fulfillment',
    });

    res.json({ status: 'CONFIRMED', message: 'Quotation confirmed. Ready for fulfillment and billing.' });
  } catch (err) {
    next(err);
  }
});

export default router;
