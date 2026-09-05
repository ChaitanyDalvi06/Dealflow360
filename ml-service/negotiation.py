"""
Model 2: Negotiation Acceptance Predictor
Inference module using the saved Scikit-Learn Pipeline.
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
    """
    discount_requested = float(features.get("discountRequestedPct", 10.0))
    discount_gap = float(features.get("discountGap", 2.0))
    tier = str(features.get("customerTier", "SILVER")).upper()
    deal_size = float(features.get("dealSize", 100000.0))
    current_discount = float(features.get("currentDiscount", 5.0))

    # Calculate sentiment if text provided or use passed score
    if "message" in features and features["message"]:
        sentiment = analyze_sentiment(features["message"])
    else:
        sentiment = float(features.get("sentimentScore", 0.0))

    tier_map = {'BRONZE': 0, 'SILVER': 1, 'GOLD': 2}
    tier_encoded = tier_map.get(tier, 1)

    if pipeline is not None:
        X = pd.DataFrame([{
            'discount_requested': discount_requested,
            'sentiment': sentiment,
            'tier_encoded': tier_encoded,
            'deal_size': deal_size
        }])
        prob = pipeline.predict_proba(X)[0][1]
        acceptance_pct = int(round(prob * 100))
        source = "ml_logistic_regression"
    else:
        # Robust fallback formula
        acceptance_pct = int(max(0, min(100, 100 - (discount_gap * 5))))
        source = "formula_fallback"

    # Actionable guidance for the sales rep
    if acceptance_pct >= 75:
        recommendation = f"High acceptance likelihood ({acceptance_pct}%). Customer is likely to accept; hold firm near {current_discount}%."
    elif acceptance_pct >= 45:
        target = round(current_discount + (discount_gap * 0.45), 1)
        recommendation = f"Moderate acceptance ({acceptance_pct}%). Recommend a counter-offer at {target}% to close the deal."
    else:
        target = round(current_discount + (discount_gap * 0.8), 1)
        recommendation = f"Low acceptance ({acceptance_pct}%). Client may churn. Consider concession up to {target}% or adding bundled services."

    return {
        "acceptanceProbability": acceptance_pct,
        "recommendation": recommendation,
        "source": source,
        "sentimentScore": round(sentiment, 2)
    }
