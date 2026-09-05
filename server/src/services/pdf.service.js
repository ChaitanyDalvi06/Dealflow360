import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directory for generated invoice PDFs
const STORAGE_DIR = path.resolve(__dirname, '../../storage/invoices');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const PYTHON_SCRIPT_PATH = path.resolve(__dirname, 'invoice_pdf.py');

/**
 * Generates an official invoice PDF for a quotation using Python ReportLab.
 * @param {string} quotationId
 * @returns {Promise<{ filePath: string, fileName: string, quotation: any }>}
 */
export async function generateQuotationInvoicePdf(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: true,
      rep: { select: { id: true, name: true, email: true, role: true } },
      lines: {
        include: {
          product: true,
        },
      },
      invoices: {
        orderBy: { issuedAt: 'desc' },
      },
      approvalSteps: {
        include: { approver: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  const quoteNumber = `QT-${quotation.id.slice(-6).toUpperCase()}`;
  const invoiceNumber = quotation.invoices?.[0]?.id 
    ? `INV-2026-${quotation.invoices[0].id.slice(-6).toUpperCase()}`
    : `INV-2026-${quotation.id.slice(-6).toUpperCase()}`;

  // Date formatting
  const issuedDate = quotation.invoices?.[0]?.issuedAt 
    ? new Date(quotation.invoices[0].issuedAt)
    : new Date();
  
  const dueDate = new Date(issuedDate);
  dueDate.setDate(dueDate.getDate() + 30); // Net 30 default

  const formatDateStr = (d) => {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calculate gross line totals & discounts
  let grossTotal = 0;
  const linesPayload = quotation.lines.map((l) => {
    const unitPrice = Number(l.unitPrice || 0);
    const qty = l.quantity || 1;
    const lineGross = unitPrice * qty;
    grossTotal += lineGross;
    const lineTotal = Number(l.lineTotal || (lineGross * (1 - (Number(l.discountPct || 0) / 100))));

    return {
      name: l.product?.name || 'Product',
      sku: l.product?.sku || '',
      category: l.product?.category || '',
      quantity: qty,
      unitPrice,
      discountPct: Number(l.discountPct || 0),
      lineTotal,
      billingType: l.isRecurring ? 'Recurring' : 'One-Time',
    };
  });

  const orderTotal = Number(quotation.orderTotal || grossTotal);
  const totalDiscount = Math.max(0, grossTotal - orderTotal);
  const taxAmount = Math.round(orderTotal * 0.18 * 100) / 100; // 18% standard IGST

  // Load customer signature metadata if quotation is confirmed/signed
  const sigMetaPath = path.resolve(__dirname, `../../storage/signatures/sig_${quotation.id}.json`);
  let signatureInfo = null;
  if (fs.existsSync(sigMetaPath)) {
    try {
      signatureInfo = JSON.parse(fs.readFileSync(sigMetaPath, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse signature metadata:', e);
    }
  }

  const payload = {
    invoiceNumber,
    quotationNumber: quoteNumber,
    date: formatDateStr(issuedDate),
    dueDate: formatDateStr(dueDate),
    paymentTerms: 'Net 30',
    status: quotation.status === 'APPROVED' ? 'APPROVED & AUTHORIZED' : quotation.status,
    customer: {
      name: quotation.customer?.name || 'Valued Customer',
      company: quotation.customer?.company || quotation.customer?.name || 'Enterprise Customer',
      email: quotation.customer?.email || 'customer@company.com',
      phone: quotation.customer?.phone || '+91 98765 43210',
      tier: quotation.customer?.tier || 'STANDARD',
      address: quotation.customer?.address || 'Corporate Headquarters',
    },
    rep: {
      name: quotation.rep?.name || 'Enterprise Sales Representative',
      email: quotation.rep?.email || 'rep@dealflow360.io',
    },
    lines: linesPayload,
    grossTotal,
    totalDiscount,
    orderTotal,
    taxAmount,
    signature: signatureInfo,
  };

  const fileName = `DealFlow360-Invoice-${quoteNumber}.pdf`;
  const outputPath = path.join(STORAGE_DIR, fileName);

  // Call python script
  await new Promise((resolve, reject) => {
    const py = spawn('python3', [PYTHON_SCRIPT_PATH, JSON.stringify(payload), outputPath]);

    let stderr = '';
    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Python PDF generation failed (code ${code}): ${stderr}`));
      }
    });

    py.on('error', (err) => {
      reject(err);
    });
  });

  return {
    filePath: outputPath,
    fileName,
    invoiceNumber,
    quoteNumber,
    quotation,
  };
}
