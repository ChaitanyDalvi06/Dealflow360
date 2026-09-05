import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateInvoices, recordPayment, getInvoices } from '../services/billing.service.js';

const router = Router();

// ─── GENERATE INVOICES FOR A CONFIRMED QUOTATION ────────────
router.post('/generate/:quotationId', authenticate, async (req, res, next) => {
  try {
    const invoices = await generateInvoices(req.params.quotationId);
    res.status(201).json({ invoices, message: 'Invoices generated successfully' });
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

export default router;
