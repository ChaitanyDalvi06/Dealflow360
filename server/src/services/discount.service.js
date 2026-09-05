import prisma from '../config/db.js';

/**
 * Computes the blended discount risk score for a quotation.
 * 
 * Algorithm:
 * - For each line, compute overage = max(0, discountPct - categoryLimit)
 * - Weight each overage by line value (unitPrice * quantity)
 * - blendedScore = Σ(overage × lineValue) / Σ(lineValue)
 * 
 * This catches both single-line violations AND distributed small violations.
 */
export async function computeBlendedRiskScore(quotationId) {
  // Fetch quotation lines with product info
  const lines = await prisma.quotationLine.findMany({
    where: { quotationId },
    include: { product: true },
  });

  if (lines.length === 0) return 0;

  // Fetch all category discount limits
  const categoryLimits = await prisma.categoryDiscountLimit.findMany();
  const limitMap = {};
  for (const cl of categoryLimits) {
    limitMap[cl.category] = Number(cl.maxDiscountPct);
  }

  let totalWeightedOverage = 0;
  let totalLineValue = 0;

  for (const line of lines) {
    const categoryLimit = limitMap[line.product.category] ?? 10; // default 10% if not configured
    const discountPct = Number(line.discountPct);
    const overage = Math.max(0, discountPct - categoryLimit);
    const lineValue = Number(line.unitPrice) * line.quantity;

    totalWeightedOverage += overage * lineValue;
    totalLineValue += lineValue;
  }

  const blendedScore = totalLineValue > 0
    ? Math.round((totalWeightedOverage / totalLineValue) * 100) / 100
    : 0;

  // Update the quotation with the computed score
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { blendedRiskScore: blendedScore },
  });

  return blendedScore;
}

/**
 * Determines which approval level is required based on the blended risk score.
 * Returns: 'NONE' | 'MANAGER' | 'FINANCE'
 */
export async function getRequiredApprovalLevel(blendedScore) {
  const config = await prisma.approvalConfig.findFirst();
  if (!config) return 'NONE';

  const financeThreshold = Number(config.financeThreshold);

  // Exact PS decision tree:
  // blendedScore == 0 → auto-approve (no line exceeds its category limit)
  // blendedScore > 0 && < financeThreshold → MANAGER only
  // blendedScore >= financeThreshold → MANAGER first, then FINANCE
  if (blendedScore === 0) return 'NONE';
  if (blendedScore >= financeThreshold) return 'FINANCE';
  return 'MANAGER';
}

/**
 * Recalculates quotation totals (orderTotal, totalMargin) from its lines.
 */
export async function recalculateQuotationTotals(quotationId) {
  const lines = await prisma.quotationLine.findMany({
    where: { quotationId },
    include: { product: true },
  });

  let orderTotal = 0;
  let totalMargin = 0;

  for (const line of lines) {
    const unitPrice = Number(line.unitPrice);
    const discountPct = Number(line.discountPct);
    const quantity = line.quantity;
    const margin = Number(line.product.margin);

    const discountedPrice = unitPrice * (1 - discountPct / 100);
    const lineTotal = discountedPrice * quantity;
    const lineMargin = lineTotal * (margin / 100);

    // Update line totals
    await prisma.quotationLine.update({
      where: { id: line.id },
      data: {
        lineTotal: Math.round(lineTotal * 100) / 100,
        lineMargin: Math.round(lineMargin * 100) / 100,
      },
    });

    orderTotal += lineTotal;
    totalMargin += lineMargin;
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      orderTotal: Math.round(orderTotal * 100) / 100,
      totalMargin: Math.round(totalMargin * 100) / 100,
    },
  });

  return { orderTotal, totalMargin };
}
