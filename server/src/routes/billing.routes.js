import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateInvoices, recordPayment, getInvoices } from '../services/billing.service.js';
import { generateQuotationInvoicePdf } from '../services/pdf.service.js';

const router = Router();

// ─── GENERATE INVOICES & PDF FOR A CONFIRMED/APPROVED QUOTATION ────────────
router.post('/generate/:quotationId', authenticate, async (req, res, next) => {
  try {
    const invoices = await generateInvoices(req.params.quotationId);
    const pdfInfo = await generateQuotationInvoicePdf(req.params.quotationId);
    res.status(201).json({ 
      invoices, 
      pdfUrl: `/api/billing/pdf/${req.params.quotationId}`,
      fileName: pdfInfo.fileName,
      invoiceNumber: pdfInfo.invoiceNumber,
      message: 'Invoice & official PDF generated successfully' 
    });
  } catch (err) {
    next(err);
  }
});

// ─── STREAM / DOWNLOAD INVOICE PDF ──────────────────────────
router.get('/pdf/:quotationId', authenticate, async (req, res, next) => {
  try {
    const pdfInfo = await generateQuotationInvoicePdf(req.params.quotationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfInfo.fileName}"`);
    res.sendFile(pdfInfo.filePath);
  } catch (err) {
    next(err);
  }
});

// ─── GET INVOICES FOR A QUOTATION ───────────────────────────
router.get('/:quotationId', authenticate, async (req, res, next) => {
  try {
    const invoices = await getInvoices(req.params.quotationId);
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

// ─── RECORD PAYMENT ─────────────────────────────────────────
router.post('/pay/:invoiceId', authenticate, async (req, res, next) => {
  try {
    const { amount, method = 'BANK_TRANSFER' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const result = await recordPayment(req.params.invoiceId, amount, method);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── MODIFY SUBSCRIPTION (MID-CYCLE PRORATION) ──────────────
router.post('/subscriptions/:id/modify', authenticate, async (req, res, next) => {
  try {
    const { newQuantity } = req.body;
    if (!newQuantity || newQuantity <= 0) {
      return res.status(400).json({ error: 'Valid new quantity is required' });
    }
    const { modifySubscription } = await import('../services/billing.service.js');
    const result = await modifySubscription(req.params.id, Number(newQuantity));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── CANCEL SUBSCRIPTION (CREDIT NOTE / REFUND) ─────────────
router.post('/subscriptions/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { cancelSubscription } = await import('../services/billing.service.js');
    const result = await cancelSubscription(req.params.id, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET CREDIT NOTES FOR A QUOTATION ───────────────────────
router.get('/credit-notes/:quotationId', authenticate, async (req, res, next) => {
  try {
    const prisma = (await import('../config/db.js')).default;
    const creditNotes = await prisma.creditNote.findMany({
      where: { quotationId: req.params.quotationId },
      orderBy: { issuedAt: 'desc' },
    });
    res.json(creditNotes);
  } catch (err) {
    next(err);
  }
});

export default router;
