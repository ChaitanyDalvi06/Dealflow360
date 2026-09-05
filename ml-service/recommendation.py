"""
Model 1: Upsell & Cross-Sell Recommendation Engine
Technique: Association Rule Mining (Market Basket Analysis with Lift Score)
Fetches dynamic co-purchase history from PostgreSQL "OrderHistory" and product margins from "Product".
"""
import os
import psycopg2
from collections import defaultdict
from itertools import combinations

MIN_MARGIN_PCT = 10.0
PROMOTION_BOOST = 1.3
DEFAULT_TOP_N = 5

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "dealflow360"),
        user=os.getenv("DB_USER", "dealflow"),
        password=os.getenv("DB_PASS", "dealflow360")
    )

def get_recommendations_for_cart(cart_product_ids, top_n=DEFAULT_TOP_N):
    """
    Given a list of product UUIDs in the cart, return top companion product recommendations
    ranked by lift score, filtered by margin, boosted by promotion.
    """
    if not cart_product_ids:
        return []

    conn = get_db()
    cur = conn.cursor()

    # 1. Fetch live order baskets from OrderHistory
    cur.execute('SELECT "orderId", "productId" FROM "OrderHistory"')
    rows = cur.fetchall()

    # 2. Fetch all products metadata
    cur.execute('SELECT id, name, category, "basePrice", margin, "isPromoted" FROM "Product"')
    product_rows = cur.fetchall()
    cur.close()
    conn.close()

    products_map = {
        row[0]: {
            "id": row[0],
            "name": row[1],
            "category": row[2],
            "basePrice": float(row[3]),
            "margin": float(row[4]),
            "isPromoted": bool(row[5])
        }
        for row in product_rows
    }

    # Group baskets by orderId
    baskets = defaultdict(set)
    for order_id, product_id in rows:
        baskets[order_id].add(product_id)

    total_orders = len(baskets)
    if total_orders == 0:
        return []

    # Frequency counts
    product_counts = defaultdict(int)
    pair_counts = defaultdict(int)

    for order_id, item_set in baskets.items():
        for item in item_set:
            product_counts[item] += 1
        for a, b in combinations(sorted(item_set), 2):
            pair_counts[(a, b)] += 1

    cart_set = set(cart_product_ids)
    candidate_scores = {}

    for cart_item in cart_set:
        p_a = product_counts[cart_item] / total_orders
        if p_a == 0:
            continue

        for (a, b), co_count in pair_counts.items():
            if cart_item in (a, b):
                companion = b if cart_item == a else a
                if companion in cart_set:
                    continue  # already in cart
                if companion not in products_map:
                    continue

                companion_info = products_map[companion]

                # Step 3: Margin filter
                if companion_info["margin"] < MIN_MARGIN_PCT:
                    continue

                # Step 2: Compute Lift
                p_b = product_counts[companion] / total_orders
                p_ab = co_count / total_orders
                lift = p_ab / (p_a * p_b) if (p_a * p_b) > 0 else 0.0

                # Step 4: Apply Promotion Boost
                if companion_info["isPromoted"]:
                    lift *= PROMOTION_BOOST

                margin_delta = (companion_info["basePrice"] * companion_info["margin"]) / 100.0

                if companion not in candidate_scores or lift > candidate_scores[companion]["liftScore"]:
                    candidate_scores[companion] = {
                        "productId": companion,
                        "productName": companion_info["name"],
                        "category": companion_info["category"],
                        "basePrice": companion_info["basePrice"],
                        "marginDelta": round(margin_delta, 2),
                        "isPromoted": companion_info["isPromoted"],
                        "liftScore": round(lift, 2),
                        "source": "ml_association_rules"
                    }

    ranked = sorted(candidate_scores.values(), key=lambda x: -x["liftScore"])
    return ranked[:top_n]
