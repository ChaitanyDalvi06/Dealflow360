"""
DealFlow360 ML Service — Python Flask API
Runs on Port 5001 (configured for server/src/services/ml.service.js)
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from recommendation import get_recommendations_for_cart
from negotiation import predict_acceptance, load_pipeline
from train_negotiation import train as retrain_model

app = Flask(__name__)
CORS(app)

# Load Model 2 on startup
load_pipeline()

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "DealFlow360-ML-Engine",
        "port": 5001,
        "models": [
            "Model 1: Lift Association Rules (Market Basket Analysis)",
            "Model 2: Logistic Regression (Negotiation Acceptance Predictor)"
        ]
    })

@app.route("/api/recommend", methods=["POST"])
def recommend_endpoint():
    """
    Called by Node.js server to get companion upsell recommendations.
    Body: { "productIds": ["uuid1", "uuid2"] }
    """
    data = request.get_json(silent=True) or {}
    product_ids = data.get("productIds", [])

    if not product_ids:
        return jsonify({"recommendations": [], "source": "empty_cart"})

    try:
        recommendations = get_recommendations_for_cart(product_ids)
        return jsonify({
            "recommendations": recommendations,
            "source": "ml_association_rules",
            "cartSize": len(product_ids)
        })
    except Exception as e:
        print(f"⚠️ Recommendation calculation error: {e}")
        return jsonify({"recommendations": [], "source": "error_fallback", "error": str(e)}), 200

@app.route("/api/negotiate", methods=["POST"])
def negotiate_endpoint():
    """
    Called by Node.js server to predict customer discount acceptance probability.
    Body: {
      "discountRequestedPct": 12.5,
      "discountGap": 4.5,
      "customerTier": "GOLD",
      "dealSize": 120000,
      "sentimentScore": 0.25,
      "currentDiscount": 8.0
    }
    """
    features = request.get_json(silent=True) or {}

    try:
        result = predict_acceptance(features)
        return jsonify(result)
    except Exception as e:
        print(f"⚠️ Negotiation prediction error: {e}")
        return jsonify({
            "acceptanceProbability": 50,
            "recommendation": "Fallback mode due to calculation error.",
            "source": "error_fallback",
            "error": str(e)
        }), 200

@app.route("/api/retrain", methods=["POST"])
def retrain_endpoint():
    """
    Triggered to dynamically retrain Model 2 when new negotiations close.
    """
    try:
        retrain_model()
        load_pipeline()
        return jsonify({"status": "success", "message": "Model 2 dynamically retrained on latest PostgreSQL data."})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"🚀 DealFlow360 ML Engine starting on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
