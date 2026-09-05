import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { processApproval, getApprovalTrail } from '../services/approval.service.js';
import { predictNegotiationAcceptance } from '../services/ml.service.js';

const router = Router();

// ─── LIST PENDING APPROVALS ─────────────────────────────────
router.get('/pending', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const where = { status: 'PENDING' };

    // Filter by approver role
    if (req.user.role === 'SALES_MANAGER') {
      where.approverRole = 'SALES_MANAGER';
    } else if (req.user.role === 'FINANCE') {
      where.approverRole = 'FINANCE';
    }

    const steps = await prisma.approvalStep.findMany({
      where,
      include: {
        quotation: {
          include: {
            customer: { select: { id: true, name: true, tier: true, company: true } },
            rep: { select: { id: true, name: true } },
            lines: { include: { product: { select: { name: true, category: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(steps);
  } catch (err) {
    next(err);
  }
});

// ─── APPROVE / REJECT / RETURN ──────────────────────────────
router.post('/:quotationId/action', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'APPROVED' | 'REJECTED' | 'RETURNED'

    if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVED, REJECTED, or RETURNED' });
    }
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for all approval actions' });
    }

    const result = await processApproval(
      req.params.quotationId,
      req.user.id,
      req.user.role,
      action,
      reason
    );

    res.json(result);
  } catch (err) {
    if (err.message.includes('No pending approval')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── GET APPROVAL TRAIL ─────────────────────────────────────
router.get('/:quotationId/trail', authenticate, async (req, res, next) => {
  try {
    const trail = await getApprovalTrail(req.params.quotationId);
    res.json(trail);
  } catch (err) {
    next(err);
  }
});

// ─── GET NEGOTIATION ACCEPTANCE PREDICTION ──────────────────
router.post('/:quotationId/predict-acceptance', authenticate, authorize('SALES_MANAGER', 'SALES_REP', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.quotationId },
      include: {
        customer: true,
        negotiations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const latestNegotiation = quotation.negotiations[0];

    const features = {
      discountRequestedPct: latestNegotiation?.discountRequestedPct ? Number(latestNegotiation.discountRequestedPct) : req.body.discountRequestedPct || 0,
      discountGap: req.body.discountGap || 0,
      customerTier: quotation.customer.tier,
      dealSize: Number(quotation.orderTotal),
      negotiationRounds: quotation.negotiations.length,
      sentimentScore: latestNegotiation?.sentimentScore ? Number(latestNegotiation.sentimentScore) : 0,
      currentDiscount: req.body.currentDiscount || 0,
    };

    const prediction = await predictNegotiationAcceptance(features);
    res.json(prediction);
  } catch (err) {
    next(err);
  }
});

// ─── GET AUDIT LOG ──────────────────────────────────────────
router.get('/:quotationId/audit', authenticate, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: req.params.quotationId },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { timestamp: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
