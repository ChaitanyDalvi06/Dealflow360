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

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { customer: true },
  });

  // Fetch all category discount limits
  const categoryLimits = await prisma.categoryDiscountLimit.findMany();
  const limitMap = {};
  for (const cl of categoryLimits) {
    limitMap[cl.category] = Number(cl.maxDiscountPct);
  }

  // Customer tier limit (Gold: 15%, Silver: 10%, Bronze: 5%)
  const tierLimit = quotation?.customer?.tier === 'GOLD' ? 15 : quotation?.customer?.tier === 'SILVER' ? 10 : 5;

  let totalWeightedOverage = 0;
  let totalLineValue = 0;
  let totalCost = 0;

  for (const line of lines) {
    const categoryLimit = limitMap[line.product.category] ?? 10;
    const effectiveLimit = Math.min(categoryLimit, tierLimit);
    const discountPct = Number(line.discountPct);
    const overage = Math.max(0, discountPct - effectiveLimit);
    const lineValue = Number(line.unitPrice) * line.quantity;
    const cost = Number(line.product.costPrice || (Number(line.unitPrice) * (1 - (Number(line.product.margin || 20) / 100))));

    totalWeightedOverage += overage * lineValue;
    totalLineValue += lineValue;
    totalCost += cost * line.quantity;
  }

  // Discount overage risk
  let discountRisk = totalLineValue > 0 ? (totalWeightedOverage / totalLineValue) * 8 : 0;

  // Margin compression risk: B2B governance triggers if gross margin < 25%
  const netAmount = Number(quotation?.orderTotal || totalLineValue);
  const grossMarginPct = netAmount > 0 ? ((netAmount - totalCost) / netAmount) * 100 : 30;
  let marginRisk = grossMarginPct < 15 ? 45 : grossMarginPct < 25 ? 25 : 0;

  const blendedScore = Math.min(100, Math.round(discountRisk + marginRisk));

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
  const managerThreshold = config ? Number(config.managerThreshold) : 0;
  const financeThreshold = config ? Number(config.financeThreshold) : 35;

  if (blendedScore >= 40 || blendedScore > financeThreshold) return 'FINANCE';
  if (blendedScore > 15 || blendedScore > managerThreshold) return 'MANAGER';
  return 'NONE';
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
