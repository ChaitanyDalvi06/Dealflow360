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
            customer: true,
            rep: { select: { id: true, name: true, email: true } },
            lines: { include: { product: true } },
            approvalSteps: {
              include: { approver: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = steps.map(step => {
      const q = step.quotation;
      let gross = 0;
      let totalDiscount = 0;
      let totalCost = 0;

      for (const l of q.lines) {
        const qty = l.quantity;
        const up = Number(l.unitPrice);
        const disc = Number(l.discountPct);
        const cost = Number(l.product?.costPrice || (up * (1 - (Number(l.product?.margin || 20) / 100))));
        gross += qty * up;
        totalDiscount += qty * up * (disc / 100);
        totalCost += cost * qty;
      }

      const net = Number(q.orderTotal || Math.max(0, gross - totalDiscount));
      const marginPct = net > 0 ? Math.round(((net - totalCost) / net) * 1000) / 10 : 0;
      const riskScore = Number(q.blendedRiskScore || 0);
      const riskLevel = riskScore > 60 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW';

      return {
        id: step.id,
        quotationId: step.quotationId,
        level: step.approverRole,
        status: step.status,
        createdAt: step.createdAt,
        escalationReason: step.reason || `Quotation exceeds standard discount or margin thresholds. Requires ${step.approverRole} sign-off.`,
        quotation: {
          ...q,
          quoteNumber: q.id.slice(0, 8).toUpperCase(),
          totalAmount: net,
          totalDiscount: Math.round(totalDiscount),
          marginPct,
          riskScore,
          riskLevel,
          salesRep: q.rep,
          customer: {
            ...q.customer,
            companyName: q.customer?.company || q.customer?.name,
          },
          lines: q.lines.map(l => ({
            id: l.id,
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: Number(l.unitPrice),
            discountPct: Number(l.discountPct),
            total: Number(l.lineTotal),
            product: l.product,
          })),
          approvalChain: q.approvalSteps?.map(s => ({
            level: s.approverRole,
            status: s.status,
            actionBy: s.approver,
            comments: s.reason,
            createdAt: s.createdAt,
          })),
        },
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// ─── HELPER FOR DECISION ACTIONS ────────────────────────────
async function handleApprovalAction(req, res, next, action) {
  try {
    const targetId = req.params.id || req.params.quotationId;
    const reason = req.body.comments || req.body.reason || (action === 'APPROVE' ? 'Approved by manager' : 'Decision recorded');

    // Check if targetId is step ID or quotation ID
    let quotationId = targetId;
    const step = await prisma.approvalStep.findUnique({ where: { id: targetId } });
    if (step) {
      quotationId = step.quotationId;
    }

    const actionKey = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'RETURNED';

    const result = await processApproval(
      quotationId,
      req.user.id,
      req.user.role,
      actionKey,
      reason
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

router.post('/:id/approve', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), (req, res, next) => handleApprovalAction(req, res, next, 'APPROVE'));
router.post('/:id/reject', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), (req, res, next) => handleApprovalAction(req, res, next, 'REJECT'));
router.post('/:id/return', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), (req, res, next) => handleApprovalAction(req, res, next, 'RETURN'));
router.post('/:quotationId/action', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const result = await processApproval(req.params.quotationId, req.user.id, req.user.role, action, reason || 'Decision processed');
    res.json(result);
  } catch (err) {
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
