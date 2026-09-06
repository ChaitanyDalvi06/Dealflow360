/**
 * Transcript Analyzer for DealFlow360 Live Negotiation
 * Dynamically analyzes buyer chat history, detecting:
 * 1. Counter-offers & target prices (e.g., "make it 12lakh", "15k", "₹12,00,000")
 * 2. Percentage demands (e.g., "25%", "10% discount")
 * 3. Price resistance & pushback ("too high", "seems to high", "expensive", "over budget")
 * 4. Agreements ("il buy it", "deal", "agreed") with timeline precedence (agreements
 *    are invalidated if the buyer subsequently pushed back or made new demands).
 */

export function analyzeNegotiationTranscript(liveMessages, grossAmount, effectiveDiscountPct, tierLimit = 10) {
  if (!liveMessages || liveMessages.length === 0) {
    return {
      hasAgreed: false,
      hasHighPriceObjection: false,
      targetDiscount: effectiveDiscountPct,
      discountGap: 0,
      targetPrice: null,
      latestCustomerMsg: '',
      recentCustomerCluster: '',
      demandSource: 'no_messages',
    };
  }

  // Ensure messages are ordered chronologically ascending (oldest to newest)
  const sorted = [...liveMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const customerMsgs = sorted.filter(m => m.senderRole === 'CUSTOMER');

  if (customerMsgs.length === 0) {
    return {
      hasAgreed: false,
      hasHighPriceObjection: false,
      targetDiscount: effectiveDiscountPct,
      discountGap: 0,
      targetPrice: null,
      latestCustomerMsg: '',
      recentCustomerCluster: '',
      demandSource: 'no_customer_messages',
    };
  }

  const latestCustomerMsg = customerMsgs[customerMsgs.length - 1].content || '';
  const agreementRegex = /\b(i'?ll buy it|il buy it|buy it|agreed|agree|deal|accept|accepted|sounds good|go ahead|proceed|fine|ok i get it|we have a deal|let'?s do it|happy with this|send quote|ready to sign)\b/i;
  const objectionRegex = /\b(to high|too high|seems.*high|so high|very high|way.*high|over budget|above budget|out of budget|expensive|costly|cant afford|cannot afford|lower.*price|reduce.*price|give.*discount|more discount|not affordable|cheaper|too much|to much)\b/i;

  let lastAgreeIndex = -1;
  let lastObjectionIndex = -1;
  let lastTargetPrice = null;
  let lastTargetPriceIndex = -1;
  let lastPercentDemand = null;
  let lastPercentIndex = -1;

  customerMsgs.forEach((m, idx) => {
    const text = m.content || '';

    if (agreementRegex.test(text)) {
      lastAgreeIndex = idx;
    }
    if (objectionRegex.test(text)) {
      lastObjectionIndex = idx;
    }

    // Check for target price expressions:
    // e.g. "make it 12lakh", "want in 12 lakh", "12lakh", "15k", "budget is 12 lakh"
    const explicitPriceMatch = text.match(/(?:make it|want in|give in|give for|give it for|can do|do it for|budget is|budget|in|at|for)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs|l|k|thousand)?\b/i);

    if (explicitPriceMatch && !/%\s*$/.test(text)) {
      const isComplainAboutHigh = /(?:too high|to high|seems.*high|expensive)/i.test(text);
      const isExplicitTarget = /(?:make it|want in|give|can do|budget|in|at|for)\s*\d+/i.test(text);

      // Only treat as target price if it is an explicit target or not a complaint about a high price
      if (isExplicitTarget || !isComplainAboutHigh) {
        const num = parseFloat(explicitPriceMatch[1]);
        const unit = (explicitPriceMatch[2] || '').toLowerCase();
        let price = null;

        if (/lakh|lac|l/i.test(unit)) {
          price = num * 100000;
        } else if (/k|thousand/i.test(unit)) {
          price = num * 1000;
        } else if (num > 1000) {
          price = num;
        } else if (num <= 100 && grossAmount > 500000) {
          price = num * 100000; // e.g., "make it 12" when deal is in Lakhs
        }

        if (price && price < grossAmount && price > 0) {
          lastTargetPrice = price;
          lastTargetPriceIndex = idx;
        }
      }
    }

    // Check for percentage demand: e.g. "25%", "10% discount"
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      lastPercentDemand = parseFloat(percentMatch[1]);
      lastPercentIndex = idx;
    }
  });

  // Timeline check: Buyer is only considered agreed if agreement happened AFTER any objection or counter-offer
  const hasAgreed = lastAgreeIndex !== -1 &&
                    lastAgreeIndex >= lastObjectionIndex &&
                    lastAgreeIndex >= lastTargetPriceIndex;

  const hasHighPriceObjection = !hasAgreed && (lastObjectionIndex !== -1 && lastObjectionIndex >= lastAgreeIndex);

  let targetDiscount = effectiveDiscountPct;
  let demandSource = 'current_offer';

  if (hasAgreed) {
    targetDiscount = effectiveDiscountPct;
    demandSource = 'agreement';
  } else if (lastTargetPrice !== null && lastTargetPriceIndex > lastPercentIndex) {
    // Recent specific counter-price supersedes older percentage
    const implied = ((grossAmount - lastTargetPrice) / grossAmount) * 100;
    targetDiscount = Math.round(implied * 10) / 10;
    demandSource = `target_price_₹${Math.round(lastTargetPrice).toLocaleString('en-IN')}`;
  } else if (lastPercentDemand !== null && lastPercentIndex >= lastTargetPriceIndex) {
    targetDiscount = lastPercentDemand;
    demandSource = 'percentage_demand';
  } else if (hasHighPriceObjection) {
    targetDiscount = Math.max(effectiveDiscountPct + 7.5, (tierLimit || 10) + 3);
    demandSource = 'price_too_high_objection';
  }

  const discountGap = hasAgreed ? 0 : Math.max(0, targetDiscount - effectiveDiscountPct);
  const recentCustomerCluster = customerMsgs.slice(-4).map(m => m.content).join('. ');

  return {
    hasAgreed,
    hasHighPriceObjection,
    targetDiscount: Math.round(targetDiscount * 10) / 10,
    discountGap: Math.round(discountGap * 10) / 10,
    demandSource,
    lastTargetPrice,
    latestCustomerMsg,
    recentCustomerCluster,
  };
}
