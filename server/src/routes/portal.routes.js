import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticateCustomer } from '../middleware/auth.js';
import { computeBlendedRiskScore, recalculateQuotationTotals } from '../services/discount.service.js';
import { routeForApproval } from '../services/approval.service.js';
import { createAuditLog } from '../middleware/audit.js';
import { getUpsellRecommendations } from '../services/ml.service.js';

const router = Router();

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

// ─── GET PUBLIC QUOTE BY TOKEN ──────────────────────────────
router.get('/quote/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: token },
          { id: { startsWith: token } }
        ]
      },
      include: {
        customer: true,
        rep: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: true
          }
        },
        negotiations: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    let gross = 0;
    let totalDisc = 0;
    for (const l of quotation.lines) {
      const price = Number(l.unitPrice);
      const qty = Number(l.quantity);
      const disc = Number(l.discountPct);
      gross += price * qty;
      totalDisc += (price * qty * disc) / 100;
    }

    res.json({
      ...quotation,
      quoteNumber: 'Q-' + quotation.id.slice(0, 8).toUpperCase(),
      totalAmount: Number(quotation.orderTotal) || Math.max(0, gross - totalDisc),
      totalDiscount: totalDisc,
      grossAmount: gross
    });
  } catch (err) {
    next(err);
  }
});

// ─── UPSELL RECOMMENDATIONS FOR BUYER PORTAL (Model 1) ──────
router.post(['/upsell-recommendations', '/quote/:token/upsell-recommendations'], async (req, res, next) => {
  try {
    const { productIds = [] } = req.body;
    if (productIds.length === 0) return res.json([]);

    const mlResult = await getUpsellRecommendations(productIds);
    const recList = Array.isArray(mlResult) ? mlResult : (mlResult.recommendations || []);

    const recommendations = recList.map(rec => ({
      id: rec.productId || rec.product?.id,
      name: rec.productName || rec.name || rec.product?.name,
      basePrice: rec.basePrice || rec.product?.basePrice || 0,
      category: rec.category || rec.product?.category,
      lift: rec.liftScore || rec.lift,
      liftScore: rec.liftScore || rec.lift,
      marginDelta: rec.marginDelta,
      reason: (rec.liftScore || rec.lift) ? `Frequently paired with selected items (${rec.liftScore || rec.lift}x affinity)` : 'Popular companion product',
    }));

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

// ─── SUBMIT COUNTER-DISCOUNT / NEGOTIATION VIA PORTAL TOKEN ─
router.post('/quote/:token/negotiate', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { counterDiscountPct, message } = req.body;
    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: token },
          { id: { startsWith: token } }
        ]
      }
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const event = await prisma.negotiationEvent.create({
      data: {
        quotationId: quotation.id,
        messageText: message || 'Buyer requested counter discount',
        discountRequestedPct: Number(counterDiscountPct) || 0,
        senderType: 'customer',
        outcome: 'pending'
      }
    });

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'UNDER_NEGOTIATION' },
      include: {
        customer: true,
        rep: { select: { id: true, name: true, email: true } },
        lines: { include: { product: true } }
      }
    });

    res.json({ quotation: updated, event, message: 'Counter-offer submitted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── SIGN QUOTATION VIA PORTAL TOKEN (ODOO SIGN PROTOCOL) ─────
router.post('/quote/:token/sign', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { signerName, signerDesignation, signatureData } = req.body;

    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: token },
          { id: { startsWith: token } }
        ]
      },
      include: { customer: true, rep: true }
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    // 1. Generate SHA-256 Cryptographic Seal
    const crypto = await import('crypto');
    const timestamp = new Date().toISOString();
    const cleanSigner = (signerName || quotation.customer?.name || 'Authorized Signatory').trim();
    const cleanRole = (signerDesignation || 'Authorized Officer').trim();
    const sha256Hash = crypto.createHash('sha256')
      .update(`${quotation.id}:${cleanSigner}:${timestamp}:ODOO_SIGN_PROTOCOL_V2`)
      .digest('hex');

    // 2. Setup signatures storage directory
    const path = await import('path');
    const fs = await import('fs');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sigDir = path.resolve(__dirname, '../../storage/signatures');
    if (!fs.existsSync(sigDir)) {
      fs.mkdirSync(sigDir, { recursive: true });
    }

    // 3. Save signature PNG image if drawn
    let imagePath = null;
    if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:image/')) {
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
      imagePath = path.join(sigDir, `sig_${quotation.id}.png`);
      fs.writeFileSync(imagePath, base64Data, 'base64');
    }

    // 4. Save signature metadata JSON
    const metaPath = path.join(sigDir, `sig_${quotation.id}.json`);
    const sigRecord = {
      quotationId: quotation.id,
      signerName: cleanSigner,
      signerDesignation: cleanRole,
      signedAt: timestamp,
      sha256Hash,
      signatureImagePath: imagePath,
      hasDrawnSignature: !!imagePath,
      protocol: 'Odoo Sign Protocol v2.4 (SHA-256 Sealed)',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    };
    fs.writeFileSync(metaPath, JSON.stringify(sigRecord, null, 2));

    // 5. Update quotation status to CONFIRMED
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'CONFIRMED' }
    });

    // 6. Audit Trail
    if (quotation.repId) {
      await createAuditLog({
        entityType: 'Quotation',
        entityId: quotation.id,
        actorId: quotation.repId,
        action: 'ODOO_SIGN_CONFIRMED',
        reason: `Legally executed by ${cleanSigner} (${cleanRole}) via Odoo Sign Protocol. SHA-256: ${sha256Hash.slice(0, 16)}...`,
        metadata: sigRecord
      }).catch(err => console.warn('Audit log creation warning:', err.message));
    }

    // 7. Generate counter-signed PDF & sync to live Odoo instance in background
    try {
      const { generateQuotationInvoicePdf } = await import('../services/pdf.service.js');
      const { syncQuotationToOdoo } = await import('../services/odoo.service.js');
      generateQuotationInvoicePdf(quotation.id)
        .then(pdfInfo => syncQuotationToOdoo(quotation.id, pdfInfo?.filePath))
        .catch(e => console.warn('[Odoo Sign Sync Warning]:', e.message));
    } catch (e) {
      console.warn('[Odoo Sign Init Warning]:', e.message);
    }

    res.json({ 
      message: 'Quotation digitally executed via Odoo Sign Protocol',
      status: 'CONFIRMED',
      signature: sigRecord,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
