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
  // Fetch quotation with customer to apply customer tier discount ceiling
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { customer: true },
  });

  const lines = await prisma.quotationLine.findMany({
    where: { quotationId },
    include: { product: true },
  });

  if (lines.length === 0) return 0;

  // Customer tier limit: Bronze 5%, Silver 10%, Gold 15%
  const customerTier = quotation?.customer?.tier || 'BRONZE';
  const tierLimitObj = await prisma.discountTier.findUnique({ where: { customerTier } });
  const tierLimit = tierLimitObj ? Number(tierLimitObj.maxDiscountPct) : 5;

  // Fetch all category discount limits
  const categoryLimits = await prisma.categoryDiscountLimit.findMany();
  const limitMap = {};
  for (const cl of categoryLimits) {
    limitMap[cl.category] = Number(cl.maxDiscountPct);
  }

  let totalWeightedOverage = 0;
  let totalLineValue = 0;

  for (const line of lines) {
    const categoryLimit = limitMap[line.product.category] ?? 10;
    // Strictness rule: take stricter of customer tier ceiling and category limit
    const effectiveLimit = Math.min(tierLimit, categoryLimit);

    const discountPct = Number(line.discountPct);
    const overage = Math.max(0, discountPct - effectiveLimit);
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
 * Determines which approval level is required based on the blended risk score, gross margin, and discounts.
 * Returns: { level: 'NONE' | 'MANAGER' | 'FINANCE', marginBreach: boolean, minMarginFloor?: number, marginPct?: number }
 */
export async function getRequiredApprovalLevel(blendedScore, totalMarginPct = null, hasDiscounts = true) {
  const config = await prisma.approvalConfig.findFirst();
  if (!config) return { level: 'NONE', marginBreach: false };

  const financeThreshold = Number(config.financeThreshold);
  const minMarginFloor = config.minMarginFloor ? Number(config.minMarginFloor) : 20;

  // 1. Margin floor breach check: if total deal margin % is below the minimum threshold, automatically escalate to FINANCE!
  if (totalMarginPct !== null && totalMarginPct < minMarginFloor) {
    return {
      level: 'FINANCE',
      marginBreach: true,
      minMarginFloor,
      marginPct: totalMarginPct,
    };
  }

  // 2. If high blended risk score >= financeThreshold, escalate to FINANCE (after Manager)
  if (blendedScore >= financeThreshold) {
    return { level: 'FINANCE', marginBreach: false, blendedScore };
  }

  // 3. If there are NO discounts at all (0% discount across all lines) and score is 0, auto-approve
  if (blendedScore === 0 && !hasDiscounts) {
    return { level: 'NONE', marginBreach: false };
  }

  // 4. Any quotation with discounts or submitted for review requires SALES_MANAGER sign-off
  return { level: 'MANAGER', marginBreach: false, blendedScore };
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
