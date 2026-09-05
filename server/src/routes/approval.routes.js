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
      orderBy: { createdAt: 'desc' },
    });

    // Enrich steps with financial metrics, real audit chain, and accurate tier reasons
    const enrichedSteps = await Promise.all(steps.map(async (step) => {
      const q = step.quotation;
      if (!q) return step;

      const lines = q.lines || [];
      let totalDiscount = 0;
      for (const line of lines) {
        const unitPrice = Number(line.unitPrice || 0);
        const qty = Number(line.quantity || 0);
        const discPct = Number(line.discountPct || 0);
        totalDiscount += unitPrice * qty * (discPct / 100);
      }

      const orderTotal = Number(q.orderTotal || 0);
      const totalMargin = Number(q.totalMargin || 0);
      const marginPct = orderTotal > 0 ? (totalMargin / orderTotal) * 100 : 0;
      const quoteNumber = q.quoteNumber || `QT-${q.id.slice(-6).toUpperCase()}`;

      // Customer tier limits: Bronze 5%, Silver 10%, Gold 15%
      const tierLimits = { BRONZE: 5, SILVER: 10, GOLD: 15 };
      const tierCeiling = tierLimits[q.customer?.tier] ?? 10;

      // Find latest audit log
      const latestLog = await prisma.auditLog.findFirst({
        where: { entityId: q.id },
        orderBy: { timestamp: 'desc' },
      });

      // Get audit history
      const auditTrail = await prisma.auditLog.findMany({
        where: { entityId: q.id },
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { timestamp: 'asc' },
      });

      const maxDiscountOnLine = Math.max(0, ...lines.map(l => Number(l.discountPct || 0)));
      let escalationReason = latestLog?.reason;
      if (!escalationReason || escalationReason.includes('auto-approval')) {
        if (maxDiscountOnLine > tierCeiling) {
          escalationReason = `Discount (${maxDiscountOnLine}%) exceeded ${q.customer?.tier} tier standard threshold of ${tierCeiling}%.`;
        } else if (maxDiscountOnLine === tierCeiling) {
          escalationReason = `Discount (${maxDiscountOnLine}%) reached maximum allowable ${q.customer?.tier} tier ceiling of ${tierCeiling}%.`;
        } else {
          escalationReason = `Quotation submitted by sales rep with ${maxDiscountOnLine}% discount. Requires Sales Manager authorization.`;
        }
      }

      return {
        ...step,
        escalationReason,
        level: step.approverRole === 'FINANCE' ? 'LEVEL_3_FINANCE' : 'LEVEL_2_MANAGER',
        quotation: {
          ...q,
          quoteNumber,
          totalAmount: orderTotal,
          orderTotal,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          marginPct: Math.round(marginPct * 10) / 10,
          totalMargin,
          riskScore: Number(q.blendedRiskScore || 0),
          riskLevel: Number(q.blendedRiskScore || 0) >= 15 ? 'HIGH' : Number(q.blendedRiskScore || 0) > 5 ? 'MEDIUM' : 'LOW',
          salesRep: q.rep,
          approvalChain: auditTrail.map(log => ({
            level: log.action,
            status: log.action.includes('APPROVED') ? 'APPROVED' : log.action.includes('REJECTED') ? 'REJECTED' : 'PENDING',
            actionBy: log.actor,
            comments: log.reason,
            createdAt: log.timestamp,
          })),
          lines: lines.map(line => {
            const lineVal = Number(line.lineTotal || (Number(line.unitPrice) * line.quantity * (1 - Number(line.discountPct) / 100)));
            return {
              ...line,
              total: lineVal,
              lineTotal: lineVal,
            };
          }),
        },
      };
    }));

    res.json(enrichedSteps);
  } catch (err) {
    next(err);
  }
});

async function resolveQuotationId(paramId) {
  const step = await prisma.approvalStep.findUnique({ where: { id: paramId } });
  if (step) return step.quotationId;
  return paramId;
}

// ─── APPROVE / REJECT / RETURN ──────────────────────────────
router.post('/:quotationId/action', authenticate, authorize('SALES_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'APPROVED' | 'REJECTED' | 'RETURNED'

    if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVED, REJECTED, or RETURNED' });
    }
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for all approval actions' });
    }

    const quotationId = await resolveQuotationId(req.params.quotationId);
    const result = await processApproval(
      quotationId,
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

router.post('/:id/approve', authenticate, authorize('SALES_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const quotationId = await resolveQuotationId(req.params.id);
    const reason = req.body.comments || req.body.reason || 'Approved by ' + req.user.role;
    const result = await processApproval(quotationId, req.user.id, req.user.role, 'APPROVED', reason);
    res.json(result);
  } catch (err) {
    if (err.message.includes('No pending approval')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/:id/reject', authenticate, authorize('SALES_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const quotationId = await resolveQuotationId(req.params.id);
    const reason = req.body.comments || req.body.reason || 'Rejected by ' + req.user.role;
    const result = await processApproval(quotationId, req.user.id, req.user.role, 'REJECTED', reason);
    res.json(result);
  } catch (err) {
    if (err.message.includes('No pending approval')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/:id/return', authenticate, authorize('SALES_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const quotationId = await resolveQuotationId(req.params.id);
    const reason = req.body.comments || req.body.reason || 'Returned for revision';
    const result = await processApproval(quotationId, req.user.id, req.user.role, 'RETURNED', reason);
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
        lines: true,
        negotiations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const grossAmount = (quotation.lines || []).reduce((sum, l) => sum + (Number(l.unitPrice) * l.quantity), 0);
    const netAmount = Number(quotation.orderTotal) || grossAmount;
    const totalDiscount = Math.max(0, grossAmount - netAmount);
    const effectiveDiscountPct = grossAmount > 0 ? (totalDiscount / grossAmount) * 100 : 0;
    const tierLimit = quotation.customer?.tier === 'GOLD' ? 15 : quotation.customer?.tier === 'SILVER' ? 10 : 5;

    // Fetch live buyer chat messages to run VADER NLP
    let liveMessages = [];
    if (quotation.requirementId) {
      liveMessages = await prisma.message.findMany({
        where: { requirementId: quotation.requirementId, senderRole: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
    }
    if (liveMessages.length === 0 && quotation.customerId) {
      const customerReqs = await prisma.requirement.findMany({
        where: { customerId: quotation.customerId },
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

    const buyerTranscript = liveMessages.map(m => m.content).reverse().join('. ');

    let targetDiscount = effectiveDiscountPct;
    if (buyerTranscript) {
      const percentMatch = buyerTranscript.match(/(\d+(?:\.\d+)?)\s*%/);
      if (percentMatch) {
        targetDiscount = parseFloat(percentMatch[1]);
      } else if (/lower.*price|cancel|too\s*much|expensive|budget|nah|cheaper/i.test(buyerTranscript)) {
        targetDiscount = Math.max(effectiveDiscountPct + 8, tierLimit + 5);
      }
    }

    const discountGap = Math.max(0, targetDiscount - effectiveDiscountPct);

    const prediction = await predictNegotiationAcceptance({
      discountRequestedPct: targetDiscount,
      discountGap: discountGap,
      customerTier: quotation.customer?.tier || 'SILVER',
      dealSize: netAmount,
      negotiationRounds: Math.max(1, liveMessages.length),
      message: buyerTranscript,
      currentDiscount: effectiveDiscountPct,
    });

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
