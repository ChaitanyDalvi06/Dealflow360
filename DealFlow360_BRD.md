# Business Requirements Document (BRD)
## DealFlow360 — Intelligent, Self-Governing Sales Operations Platform

**Prepared for:** Odoo Hackathon — Semi-Final Submission
**Document type:** Business Requirements Document
**Build window:** 24 hours

---

## 1. Executive Summary

DealFlow360 is a B2B sales operations platform that automates the messy, high-friction parts of enterprise selling: discount governance, multi-warehouse fulfillment, hybrid (one-time + subscription) billing, and customer negotiation. Beyond the baseline problem statement (PS), this build adds four differentiating capabilities:

1. **ML-powered upsell/cross-sell recommendation engine**
2. **ML-powered discount negotiation acceptance predictor** (sentiment-informed)
3. **Odoo Sign integration** for real e-signature on quote confirmation
4. **Redpanda (Kafka-protocol) event streaming** for the real-time Deal Health dashboard

The goal is to deliver a working, demoable, defensible system — not a decorative one. Every added feature is scoped so that if it fails or runs out of time, the core PS-required flow still works end-to-end.

---

## 2. Business Objectives

| Objective | Description |
|---|---|
| Automate pricing discipline | Enforce discount ceilings by customer tier and product category without manual policing |
| Reduce deal leakage | Catch stalled or anomalous deals before they die silently |
| Increase deal value | Surface high-margin upsell opportunities at the point of quote-building |
| Speed up negotiation cycles | Give sales reps a data-driven read on whether a counter-offer will land |
| Demonstrate production-grade architecture | Show role-based access, audit trails, async event processing, and real ERP-ecosystem integration (Odoo) |

---

## 3. Scope

### 3.1 In Scope (Core PS Requirements)
- Authentication (internal + customer portal)
- Product & price list management
- Discount tier & approval chain configuration, including **blended discount risk score**
- Warehouse & fulfillment setup + auto-split logic with manual override
- Subscription/recurring billing setup with proration
- Reporting & dashboard configuration with filters
- Sales workspace: quotation builder, pipeline (Kanban), approval screen, upsell panel, warehouse split screen, billing screen
- Customer portal negotiation screen (separate, restricted view)
- Deal Health & Anomaly Dashboard

### 3.2 In Scope (Added Differentiators)
- ML Model 1: Upsell/cross-sell recommender (association-rule based)
- ML Model 2: Discount negotiation acceptance predictor (logistic regression + sentiment)
- Odoo Sign integration at quote-confirmation step
- Redpanda event streaming for dashboard real-time updates

### 3.3 Out of Scope (for this 24-hour build)
- Multi-currency / multi-company support (explicitly a bonus in the PS, not required)
- Real call-audio transcription pipeline (text-based negotiation channel used instead; voice-to-text reused from the voice AI feature if time allows)
- Production-grade Kafka cluster (Redpanda single-node substitute used instead)
- Full Odoo ERP replacement — Odoo is used only as an external signature service, never as the system of record for sales logic

---

## 4. Stakeholders / User Roles

| Role | Core Responsibilities |
|---|---|
| Sales Rep | Builds quotations, applies discounts, reviews upsell suggestions, tracks approvals |
| Sales Manager / Approver | Approves/rejects discounts above threshold, configures tiers, monitors Deal Health dashboard |
| Finance / Operations | Second-level approval for high-risk discounts, manages fulfillment & billing reconciliation |
| Customer (Portal User) | Views and negotiates their own quotation, confirms final terms |
| Admin | Configures backend master data (products, tiers, warehouses, subscription plans), views analytics |
| System (implicit actor) | Validates data, computes blended risk scores, runs ML predictions, publishes events, triggers Odoo Sign |

---

## 5. Functional Requirements — Core Platform (from PS)

### 5.1 Backend / Configuration
- FR-1: Internal signup/login; customer magic-link or email/password login
- FR-2: Product master with variants and tier/currency-based price lists
- FR-3: Discount ceilings configurable per customer tier AND per product category
- FR-4: Approval chain configuration (Manager-only vs. Manager+Finance) driven by blended risk score
- FR-5: Full audit log on every approval/rejection/edit (user, timestamp, reason)
- FR-6: Warehouse CRUD, stock levels, replenishment rules, shipping-cost weighting
- FR-7: Subscription plan setup with proration and cancellation/refund rules
- FR-8: Upsell/cross-sell rule setup — product pairings, promoted-product flag, minimum margin threshold
- FR-9: Dashboard/reporting with export (PDF/XLS) and filters (period, rep/team, approval status, product/category)

### 5.2 Frontend / Rep Workspace
- FR-10: Quotation builder with line/order-level discounts, live margin indicator
- FR-11: Blended risk score computed per quote; routes to correct approval level
- FR-12: Approval screen with approve/reject/return-for-revision and audit trail
- FR-13: Upsell panel showing ranked suggestions with margin delta and promo tag (see Section 6.1)
- FR-14: Warehouse split screen — recommended split, accept/override, auto backorder-consolidation prompt
- FR-15: Subscription & billing screen — separate one-time vs. recurring lines, proration, refund/credit note triggers
- FR-16: Customer portal — separate restricted view, line comments, counter-discount field, submit/confirm actions, auto re-entry into approval if thresholds exceeded
- FR-17: Deal Health dashboard — stalled deals, discount anomalies, delivery slippage, click-to-open, nudge/escalate action

---

## 6. Functional Requirements — Added Features

### 6.1 ML Model 1: Upsell/Cross-Sell Recommendation Engine

**Business need:** Satisfies FR-8/FR-13 with a statistically grounded method instead of static hardcoded pairings.

**Method:** Association-rule mining using **lift score**, not a black-box model — chosen for explainability under judge Q&A.

**Pipeline:**
```
Product purchased → co-purchase history lookup → compute lift score for candidate products
→ filter by minimum margin threshold → apply promotion boost (×1.3 if promoted)
→ rank → return top N recommendations
```

**Example output:**
| Suggested item | Revenue impact | Margin impact |
|---|---|---|
| Extended Warranty | +₹8,000 | +₹4,500 |
| Premium Support | +₹15,000 | +₹7,000 |

**Inputs:** current cart product(s), historical order line data (seed-generated), category margin table, promoted-product flags
**Output:** ranked list of {product, margin_delta, promo_tag}
**Fallback if ML service unavailable:** static rule table (pre-defined "product X pairs with Y") so the panel never shows empty

### 6.2 ML Model 2: Discount Negotiation Acceptance Predictor

**Business need:** Supports B4 (Approval Screen) and B8 (Customer Portal negotiation) by giving reps a data-driven acceptance likelihood instead of guesswork.

**Method:** Logistic regression (binary classification: accept vs. decline) — chosen for explainability, not a black box.

**Features:**
| Feature | Description |
|---|---|
| discount_requested_pct | Customer's counter-offer |
| discount_gap | Requested % − currently offered % |
| customer_tier | Bronze/Silver/Gold |
| deal_size | Order total |
| negotiation_rounds | Count of back-and-forth exchanges |
| sentiment_score | NLP-derived polarity (−1 to +1) from negotiation text/transcript |
| urgency_score | NLP-derived signal (e.g., "need by Friday") |
| historical_acceptance_rate | Customer's past deal acceptance history |

**Sentiment source:** Text-based negotiation channel (portal comments / counter-discount messages) is the primary input. Voice-call sentiment is an optional stretch layer, reusing the voice AI speech-to-text pipeline if time permits — **not a dependency for core functionality.**

**Output:** `{ acceptanceProbability: 0–100%, recommendation: "counter at X% — Y% predicted acceptance" }`

**Where it surfaces:**
- Manager-facing, on the Discount Approval Screen (B4)
- Rep-facing only, on the Customer Portal negotiation screen (B8) — never shown to the customer, to avoid tipping negotiation strategy

**Fallback if ML service unavailable:** `acceptance % = 100 − (discount_gap × 5)`, clamped 0–100

### 6.3 Odoo Sign Integration

**Business need:** Adds a real, auditable e-signature step at the "Confirm Quotation" action (B8), rather than a plain button click — a production-realistic finishing touch.

**Scope boundary (critical for judging fairness):** Odoo Sign performs **document signing only**. All pricing, discount, approval, warehouse, and billing decisions are already finalized by DealFlow360's own logic before the document is handed to Odoo. Odoo does not calculate or decide anything.

**Flow:**
```
Customer clicks "Confirm Quotation"
  → DealFlow360 finalizes terms (already decided)
  → Backend generates final quote PDF
  → Backend calls Odoo Sign API (create sign.template → create sign.request → send)
  → Customer receives signing link
  → DealFlow360 shows "Signature request sent"
```

**Access tier:** Odoo "One App Free" plan (Sign app only) — sufficient for hackathon demo; API access to be verified during pre-hackathon setup.

**Reliability requirement:** If the Odoo Sign API call fails or times out, the quotation must still move to "Confirmed" status internally — signature request failure must never block the sales flow.

### 6.4 Redpanda (Kafka-Protocol) Event Streaming

**Business need:** Powers real-time updates for the Deal Health & Anomaly Dashboard (FR-17) — the one area of the PS that is genuinely event-driven by nature.

**Scope boundary:** Kafka/Redpanda is used **only** for the dashboard. Core synchronous flows (quote creation, discount approval, warehouse split, billing) do not depend on it.

**Topics:**
| Topic | Published on |
|---|---|
| `discount-events` | Rep applies a discount |
| `deal-events` | Scheduled check flags a stalled quote |
| `stock-events` | Stock level changes |

**Consumer:** Subscribes to all three topics, applies anomaly rules (or calls ML Model 2's underlying sentiment/scoring utilities where relevant), pushes results to the dashboard via WebSocket.

**Reliability requirement:** All Kafka publish calls are fire-and-forget with try/catch — a broker outage must degrade the dashboard to stale data only, never break quote/discount/billing operations.

**Fallback if not completed in time:** Polling-based dashboard (re-fetch every 3 seconds) — functionally indistinguishable to a judge in a 5-minute demo.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Reliability | Every external/optional dependency (ML service, Redpanda, Odoo Sign) must have a graceful fallback; core sales flow must never be blocked by their failure |
| Auditability | Every approval, rejection, and edit logged with user, timestamp, and reason |
| Separation of concerns | Customer portal must be a genuinely separate, access-restricted view — not a relabeled internal screen |
| Explainability | Both ML models must be interpretable (association rules, logistic regression) — no black-box models, to withstand judge Q&A |
| Demo resilience | A recorded backup of a full successful demo run must exist before presentation |

---

## 8. High-Level Architecture

- **Client:** React web app
- **Core API service:** owns all business logic — discount engine, blended risk score, warehouse split, billing/proration (single deployable, not microservices, to minimize integration risk in 24 hours)
- **Database:** PostgreSQL — orders, quotes, audit log, master data
- **ML service:** separate Python service (scikit-learn) for recommendation engine and acceptance predictor, called via internal REST API
- **Event layer:** Redpanda (Kafka-protocol) — discount/deal/stock events → dashboard consumer → WebSocket to client
- **External integration:** Odoo Sign — called once, post-decision, at quote confirmation only

*(See architecture diagram delivered separately as the one-page diagram required by the PS.)*

---

## 9. Data Requirements (Core Entities)

`users`, `customers`, `products`, `price_lists`, `discount_tiers`, `category_discount_limits`, `quotations`, `quotation_lines`, `approval_steps`, `audit_log`, `warehouses`, `stock_levels`, `warehouse_splits`, `subscriptions`, `invoices`, `payments`, plus ML-supporting tables: `order_history` (for co-purchase mining), `negotiation_events` (for acceptance prediction training/inference).

---

## 10. Assumptions & Constraints

- Any tech stack is permitted per PS guidelines; this BRD assumes a Node.js/Python hybrid (Node for core API, Python for ML) but is stack-agnostic in principle
- Synthetic/seed data will be used for all historical patterns (co-purchase history, past negotiations) — sufficient for demo purposes, not intended to reflect real production volumes
- Odoo Sign access is via free trial/One App Free tier; API limits to be validated before build day
- Team has zero prior Kafka experience — Redpanda chosen specifically to reduce setup risk; polling is an accepted fallback, not a failure

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Kafka/Redpanda setup consumes too much time | Medium-High | Hard time-box (90 min); fallback to polling-based dashboard |
| Odoo Sign API blocked on free tier | Low-Medium | Verify access the night before; fallback to UI-redirect signing flow |
| ML models look like "black box" to judges | Low | Use only explainable models (lift score, logistic regression); prepare one-sentence explanations |
| Core flow breaks due to over-scoping extras | Medium | Build order strictly prioritizes core PS flow before any added feature (see Section 12) |
| Judges perceive Odoo integration as "not building it yourself" | Medium | Strict scope boundary: Odoo only signs an already-finalized document; documented explicitly in this BRD and demo script |

---

## 12. Build Sequence (24-Hour Plan)

| Hours | Focus |
|---|---|
| 0–3 | Data model, auth, seed data generator |
| 3–9 | Quotation builder, discount tier engine, blended risk score, approval routing |
| 9–13 | Warehouse split logic, subscription/billing screen |
| 13–15 | Customer portal negotiation screen |
| 15–17 | Redpanda events + Deal Health dashboard (or polling fallback) |
| 17–20 | ML Model 1 (recommender) + ML Model 2 (acceptance predictor) |
| 20–22 | Odoo Sign integration on quote confirmation |
| 22–24 | Demo rehearsal, backup recording, architecture diagram, roadmap note |

---

## 13. Acceptance Criteria (mapped to PS "Quick Test Flow")

The build is considered demo-ready when all of the following pass in sequence:
1. Login/signup works for internal user; basic backend data configured (discount tier, warehouse, subscription plan)
2. A quote with an over-limit discount automatically triggers manager approval without manual request
3. Upsell panel shows a ranked recommendation with correct margin delta; adding it updates order total/margin instantly
4. Approved quote correctly pulls stock from the right warehouse(s), splitting when needed
5. One-time and subscription lines on the same order bill correctly and separately
6. Customer portal counter-discount request automatically re-triggers approval when over threshold; negotiation predictor shows an acceptance % to the rep
7. Quote confirmation triggers an Odoo Sign request
8. Payment recorded, invoice status updates correctly
9. Deal Health dashboard reflects a stalled/anomalous deal (live via Redpanda or polling fallback)

---

## 14. Deliverables (per PS requirements)

- Working full-stack application with seed data
- 5-minute live demo covering ≥2 full end-to-end flows
- One-page architecture diagram (data model + module connections)
- Short "what we'd build next" note (e.g., real call-transcription sentiment pipeline, multi-currency support, production Kafka cluster)
- This BRD, as supporting documentation of scope and design intent

---

*Document prepared as a planning reference for a 24-hour hackathon build. Scope is intentionally conservative on infrastructure (Redpanda over Kafka, polling fallback, Odoo as peripheral service) to protect the core, judge-critical business logic from avoidable failure.*
