import prisma from '../config/db.js';

/**
 * Generates invoices for a confirmed quotation.
 * Separates one-time lines from recurring/subscription lines.
 */
export async function generateInvoices(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      lines: { include: { product: { include: { subscriptionPlan: true } } } },
    },
  });

  if (!quotation) throw new Error('Quotation not found');

  const oneTimeLines = quotation.lines.filter(l => !l.isRecurring && !l.product.isRecurring);
  const recurringLines = quotation.lines.filter(l => l.isRecurring || l.product.isRecurring);

  const invoices = [];

  // ─── ONE-TIME INVOICE ─────────────────────────────────────
  if (oneTimeLines.length > 0) {
    const oneTimeTotal = oneTimeLines.reduce((sum, l) => sum + Number(l.lineTotal), 0);

    const invoice = await prisma.invoice.create({
      data: {
        quotationId,
        type: 'ONE_TIME',
        amount: Math.round(oneTimeTotal * 100) / 100,
        status: 'SENT',
      },
    });
    invoices.push({ ...invoice, lineCount: oneTimeLines.length });
  }

  // ─── RECURRING INVOICES + SUBSCRIPTIONS ───────────────────
  for (const line of recurringLines) {
    const plan = line.product.subscriptionPlan;
    if (!plan) continue;

    const now = new Date();
    const intervalMonths = plan.intervalMonths;
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + intervalMonths);

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        quotationLineId: line.id,
        planType: plan.planType,
        startDate: now,
        nextBillingDate: nextBilling,
        status: 'ACTIVE',
      },
    });

    // Generate billing schedule (next 12 months)
    const scheduleEntries = [];
    let scheduleDate = new Date(now);
    const periods = Math.ceil(12 / intervalMonths);

    for (let i = 0; i < periods; i++) {
      scheduleDate = new Date(scheduleDate);
      scheduleDate.setMonth(scheduleDate.getMonth() + intervalMonths);

      scheduleEntries.push({
        subscriptionId: subscription.id,
        dueDate: new Date(scheduleDate),
        amount: Number(line.lineTotal),
        status: 'SCHEDULED',
      });
    }

    await prisma.billingSchedule.createMany({ data: scheduleEntries });

    // Create first recurring invoice
    const recurringInvoice = await prisma.invoice.create({
      data: {
        quotationId,
        type: 'RECURRING',
        amount: Number(line.lineTotal),
        status: 'SENT',
      },
    });

    invoices.push({
      ...recurringInvoice,
      subscriptionId: subscription.id,
      planType: plan.planType,
      nextBilling: nextBilling.toISOString(),
    });
  }

  return invoices;
}

/**
 * Records a payment against an invoice.
 */
export async function recordPayment(invoiceId, amount, method = 'BANK_TRANSFER') {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) throw new Error('Invoice not found');

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const invoiceAmount = Number(invoice.amount);

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      method,
      status: 'COMPLETED',
    },
  });

  // Update invoice status
  const newTotalPaid = totalPaid + amount;
  let newStatus;
  if (newTotalPaid >= invoiceAmount) {
    newStatus = 'PAID';
  } else if (newTotalPaid > 0) {
    newStatus = 'PARTIALLY_PAID';
  } else {
    newStatus = invoice.status;
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  });

  return { payment, invoiceStatus: newStatus, totalPaid: newTotalPaid, invoiceAmount };
}

/**
 * Calculates proration for a mid-cycle subscription change.
 */
export function calculateProration(lastBillingDate, nextBillingDate, changeDate, oldAmount, newAmount) {
  const totalDays = Math.ceil((nextBillingDate - lastBillingDate) / (1000 * 60 * 60 * 24));
  const daysUsed = Math.ceil((changeDate - lastBillingDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = totalDays - daysUsed;

  const creditForOld = (daysRemaining / totalDays) * oldAmount;
  const chargeForNew = (daysRemaining / totalDays) * newAmount;
  const proratedAdjustment = Math.round((chargeForNew - creditForOld) * 100) / 100;

  return {
    totalDays,
    daysUsed,
    daysRemaining,
    creditForOld: Math.round(creditForOld * 100) / 100,
    chargeForNew: Math.round(chargeForNew * 100) / 100,
    proratedAdjustment,
  };
}

/**
 * Gets all invoices for a quotation with their payments.
 */
export async function getInvoices(quotationId) {
  return prisma.invoice.findMany({
    where: { quotationId },
    include: { payments: true },
    orderBy: { issuedAt: 'desc' },
  });
}
