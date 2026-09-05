import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticateCustomer } from '../middleware/auth.js';
import { computeBlendedRiskScore, recalculateQuotationTotals } from '../services/discount.service.js';
import { routeForApproval } from '../services/approval.service.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();

// ─── PUBLIC PORTAL: VIEW QUOTE BY TOKEN / ID ───────────────
router.get('/quote/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    // Token can be the quotation ID or a customer magicToken
    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: token },
          { customer: { magicToken: token } },
        ],
      },
      include: {
        customer: true,
        rep: { select: { name: true, email: true } },
        lines: { include: { product: true } },
        negotiations: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found for this token' });

    res.json({
      ...quotation,
      quoteNumber: quotation.id.slice(0, 8).toUpperCase(),
      totalAmount: Number(quotation.orderTotal),
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUBLIC PORTAL: SUBMIT COUNTER-OFFER VIA TOKEN ─────────
router.post('/quote/:token/negotiate', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { counterDiscountPct = 0, message = '' } = req.body;

    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: token },
          { customer: { magicToken: token } },
        ],
      },
      include: { customer: true },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    // Record negotiation event
    const event = await prisma.negotiationEvent.create({
      data: {
        quotationId: quotation.id,
        messageText: message,
        discountRequestedPct: counterDiscountPct,
        senderType: 'CUSTOMER',
        outcome: 'pending',
      },
    });

    // Update quote status to UNDER_NEGOTIATION
    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'UNDER_NEGOTIATION' },
      include: {
        customer: true,
        rep: { select: { name: true, email: true } },
        lines: { include: { product: true } },
        negotiations: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.json({
      success: true,
      event,
      quotation: {
        ...updated,
        quoteNumber: updated.id.slice(0, 8).toUpperCase(),
        totalAmount: Number(updated.orderTotal),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET CUSTOMER'S QUOTATIONS ──────────────────────────────
router.get('/quotations', authenticateCustomer, async (req, res, next) => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { customerId: req.customer.id },
      include: {
        rep: { select: { name: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, category: true, basePrice: true } },
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
    res.json(quotations);
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE QUOTATION (customer's own only) ─────────────
router.get('/quotations/:id', authenticateCustomer, async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      include: {
        rep: { select: { name: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, category: true } },
          },
        },
        negotiations: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    next(err);
  }
});

// ─── SUBMIT COUNTER-DISCOUNT / COMMENT ──────────────────────
router.post('/quotations/:id/negotiate', authenticateCustomer, async (req, res, next) => {
  try {
    const { messageText, discountRequestedPct, lineId } = req.body;

    const quotation = await prisma.quotation.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    // Create negotiation event
    const event = await prisma.negotiationEvent.create({
      data: {
        quotationId: req.params.id,
        messageText,
        discountRequestedPct,
        senderType: 'customer',
        outcome: 'pending',
      },
    });

    // If line-level comment, update the line comment
    if (lineId && messageText) {
      await prisma.quotationLine.update({
        where: { id: lineId },
        data: { comment: messageText },
      });
    }

    // Update status to UNDER_NEGOTIATION
    await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'UNDER_NEGOTIATION' },
    });

    res.json({ event, message: 'Negotiation request submitted' });
  } catch (err) {
    next(err);
  }
});

// ─── CONFIRM QUOTATION (by customer) ───────────────────────
router.post('/quotations/:id/confirm', authenticateCustomer, async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      include: { lines: true },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    // Recalculate risk score with current terms
    const riskScore = await computeBlendedRiskScore(req.params.id);

    // Check if re-approval is needed
    const approvalConfig = await prisma.approvalConfig.findFirst();
    const managerThreshold = Number(approvalConfig?.managerThreshold || 0);

    if (riskScore > managerThreshold) {
      // Re-enter approval flow
      // We need a system user ID for the routeForApproval — use the rep's ID
      const result = await routeForApproval(req.params.id, quotation.repId);

      await createAuditLog({
        entityType: 'Quotation',
        entityId: req.params.id,
        actorId: req.customer.id,
        action: 'CUSTOMER_CONFIRM_RE_APPROVAL',
        reason: `Customer confirmed but blended risk score ${riskScore} exceeds threshold. Re-entering approval.`,
      });

      return res.json({
        status: 'RE_APPROVAL_REQUIRED',
        blendedRiskScore: riskScore,
        message: 'Your confirmation has been received. The quotation requires re-approval due to updated terms.',
        approvalResult: result,
      });
    }

    // Within thresholds — confirm directly
    await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED' },
    });

    await createAuditLog({
      entityType: 'Quotation',
      entityId: req.params.id,
      actorId: req.customer.id,
      action: 'CUSTOMER_CONFIRMED',
      reason: 'Customer confirmed quotation. Proceeding to fulfillment.',
    });

    res.json({
      status: 'CONFIRMED',
      message: 'Quotation confirmed! It will now proceed to fulfillment.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
