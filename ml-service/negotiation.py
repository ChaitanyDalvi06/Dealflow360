"""
Model 2: Negotiation Acceptance Predictor
Inference module using the saved Scikit-Learn Pipeline combined with
live transcript NLP analysis and discount gap pricing dynamics.
"""
import os
import joblib
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "negotiation_pipeline.pkl")
pipeline = None
analyzer = SentimentIntensityAnalyzer()

def load_pipeline():
    global pipeline
    if os.path.exists(MODEL_PATH):
        pipeline = joblib.load(MODEL_PATH)
        print("✅ Negotiation ML Pipeline successfully loaded.")
    else:
        print("⚠️ No trained pipeline found at model/negotiation_pipeline.pkl, using fallback formula.")

def analyze_sentiment(text):
    if not text:
        return 0.0
    return float(analyzer.polarity_scores(str(text))['compound'])

def predict_acceptance(features):
    """
    Features dict from Express backend:
    - discountRequestedPct (float)
    - discountGap (float)
    - customerTier ('BRONZE', 'SILVER', 'GOLD')
    - dealSize (float)
    - sentimentScore (float optional)
    - message (str optional)
    - currentDiscount (float)
    - hasAgreed (bool optional)
    - hasHighPriceObjection (bool optional)
    - targetPrice (float optional)
    - latestMessage (str optional)
    """
    discount_requested = round(float(features.get("discountRequestedPct", 10.0)), 1)
    discount_gap = round(float(features.get("discountGap", 2.0)), 1)
    tier = str(features.get("customerTier", "SILVER")).upper()
    deal_size = float(features.get("dealSize", 100000.0))
    current_discount = round(float(features.get("currentDiscount", 5.0)), 1)
    has_agreed = bool(features.get("hasAgreed", False))
    has_objection = bool(features.get("hasHighPriceObjection", False))
    target_price = features.get("targetPrice")
    latest_msg = str(features.get("latestMessage", "")).strip()

    # Calculate sentiment if text provided or use passed score
    if "message" in features and features["message"]:
        sentiment = analyze_sentiment(features["message"])
    else:
        sentiment = float(features.get("sentimentScore", 0.0))

    tier_map = {'BRONZE': 0, 'SILVER': 1, 'GOLD': 2}
    tier_encoded = tier_map.get(tier, 1)

    # 1. Direct buyer agreement in chat (e.g. "il buy it", "deal", "agreed")
    if has_agreed:
        acceptance_pct = 95
        recommendation = f"High acceptance likelihood (95%). Buyer agreed to terms in chat (\"{latest_msg}\"). Hold firm near {current_discount}% and proceed to submit."
        return {
            "acceptanceProbability": acceptance_pct,
            "recommendation": recommendation,
            "source": "buyer_agreement_detected",
            "sentimentScore": max(0.4, round(sentiment, 2))
        }

    # 2. Machine Learning pipeline prediction with dynamic pricing & NLP dynamics
    if pipeline is not None:
        X = pd.DataFrame([{
            'discount_requested': discount_requested,
            'sentiment': sentiment,
            'tier_encoded': tier_encoded,
            'deal_size': deal_size
        }])
        prob = pipeline.predict_proba(X)[0][1]
        base_pct = prob * 100

        # Dynamic pricing gap & NLP penalty:
        # When sales rep offers less discount than requested, acceptance likelihood drops with the gap
        penalty = discount_gap * 4.5
        if has_objection:
            penalty += 12.0
        if sentiment < -0.1:
            penalty += abs(sentiment) * 12.0

        acceptance_pct = int(max(5, min(95, round(base_pct - penalty))))
        source = "ml_logistic_regression"
    else:
        # Fallback formula
        acceptance_pct = int(max(5, min(95, 100 - (discount_gap * 7) - (15 if has_objection else 0))))
        source = "formula_fallback"

    # 3. Rich, actionable contextual guidance
    counter_pct = round(current_discount + (discount_gap * 0.5), 1)

    if target_price:
        t_fmt = f"₹{int(target_price):,}"
        if acceptance_pct <= 40:
            recommendation = f"Low acceptance ({acceptance_pct}%). Buyer counter-offered {t_fmt} (~{discount_requested}%) and stated quote is too high. Counter near {counter_pct}% to bridge the gap."
        else:
            recommendation = f"Moderate acceptance ({acceptance_pct}%). Buyer requested {t_fmt} (~{discount_requested}%). Recommend countering near {counter_pct}% to close."
    elif has_objection:
        recommendation = f"Low acceptance ({acceptance_pct}%). Buyer pushed back on pricing ('too high') in chat. Consider a concession to {counter_pct}% or bundled services."
    elif acceptance_pct >= 75:
        recommendation = f"High acceptance likelihood ({acceptance_pct}%). Customer is likely to accept; hold firm near {current_discount}%."
    elif acceptance_pct >= 45:
        recommendation = f"Moderate acceptance ({acceptance_pct}%). Recommend a counter-offer at {counter_pct}% to close the deal."
    else:
        recommendation = f"Low acceptance ({acceptance_pct}%). Buyer requested {discount_requested}% discount. Consider concession up to {counter_pct}% to prevent churn."

    return {
        "acceptanceProbability": acceptance_pct,
        "recommendation": recommendation,
        "source": source,
        "sentimentScore": round(sentiment, 2)
    }
