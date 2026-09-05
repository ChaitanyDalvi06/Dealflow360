import { config } from '../config/env.js';
import prisma from '../config/db.js';

/**
 * Calls the ML service for upsell/cross-sell recommendations.
 * Falls back to static upsell rules if ML service is unavailable.
 */
export async function getUpsellRecommendations(cartProductIds) {
  try {
    const response = await fetch(`${config.mlService.url}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: cartProductIds }),
      signal: AbortSignal.timeout(2000), // 2s timeout
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error(`ML service returned ${response.status}`);
  } catch (err) {
    console.warn('⚠️ ML recommendation service unavailable, using static rules:', err.message);
    return getStaticRecommendations(cartProductIds);
  }
}

/**
 * Static fallback: returns pre-configured upsell rules.
 */
async function getStaticRecommendations(cartProductIds) {
  const rules = await prisma.upsellRule.findMany({
    where: { sourceProductId: { in: cartProductIds } },
  });

  // Get target product details
  const targetIds = rules.map(r => r.targetProductId);
  const products = await prisma.product.findMany({
    where: { id: { in: targetIds } },
  });

  const productMap = {};
  for (const p of products) productMap[p.id] = p;

  // Filter out products already in cart
  const recommendations = rules
    .filter(r => !cartProductIds.includes(r.targetProductId))
    .map(r => {
      const product = productMap[r.targetProductId];
      return {
        productId: r.targetProductId,
        productName: product?.name || 'Unknown',
        category: product?.category || '',
        basePrice: Number(product?.basePrice || 0),
        marginDelta: Number(r.marginDelta),
        isPromoted: r.isPromoted,
        source: 'static_rules',
      };
    })
    .sort((a, b) => b.marginDelta - a.marginDelta)
    .slice(0, 5);

  return { recommendations, source: 'static_fallback' };
}

/**
 * Calls the ML service for negotiation acceptance prediction.
 * Falls back to a simple formula if ML service is unavailable.
 */
export async function predictNegotiationAcceptance(features) {
  try {
    const response = await fetch(`${config.mlService.url}/api/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: AbortSignal.timeout(2000),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error(`ML service returned ${response.status}`);
  } catch (err) {
    console.warn('⚠️ ML negotiation service unavailable, using fallback formula:', err.message);
    return fallbackAcceptancePrediction(features);
  }
}

/**
 * Fallback acceptance prediction.
 * acceptance% = clamp(100 - discount_gap * 5, 0, 100)
 */
function fallbackAcceptancePrediction(features) {
  const discountGap = features.discountGap || 0;
  const acceptance = Math.max(0, Math.min(100, 100 - discountGap * 5));

  let recommendation;
  if (acceptance > 70) {
    recommendation = `High acceptance likelihood. Consider countering at ${features.currentDiscount + discountGap * 0.5}%`;
  } else if (acceptance > 40) {
    recommendation = `Moderate acceptance. Counter at ${features.currentDiscount + discountGap * 0.3}% for better chances`;
  } else {
    recommendation = `Low acceptance probability. Consider significant concession or alternative terms`;
  }

  return {
    acceptanceProbability: Math.round(acceptance),
    recommendation,
    source: 'formula_fallback',
  };
}
