# Software Requirements Specification (SRS)
## DealFlow360 — Intelligent, Self-Governing Sales Operations Platform

**Version:** 1.0
**Prepared for:** Odoo Hackathon — Semi-Final Build
**Format basis:** IEEE 830-style structure, adapted for a 24-hour build

---

## 1. Introduction

### 1.1 Purpose
This SRS defines the functional, non-functional, interface, and data requirements for DealFlow360, a B2B sales operations platform. It is the technical companion to the project BRD and is intended to be used directly during implementation — every requirement here should be traceable to a screen, an API endpoint, or a database table.

### 1.2 Scope
DealFlow360 manages the full quotation-to-cash lifecycle: quote building, tiered discount governance with automated approval routing, ML-driven upsell recommendations, multi-warehouse fulfillment splitting, hybrid one-time/subscription billing, customer-facing negotiation, ML-driven negotiation acceptance prediction, e-signature via Odoo Sign, and real-time deal health monitoring via Redpanda event streaming.

### 1.3 Definitions, Acronyms, Abbreviations

| Term | Meaning |
|---|---|
| Blended risk score | A composite score computed across all quote lines, weighting how far each line's discount exceeds its category-specific ceiling, used to determine required approval level |
| SLA | Service level expectation for a given operation (e.g., API response time) |
| Lift score | Statistical measure of association strength between two co-purchased products |
| Fallback | A degraded but functional behavior triggered when a dependent service is unavailable |
| PS | Problem Statement (the hackathon brief) |

### 1.4 References
- Hackathon Problem Statement: DealFlow360 (source PDF)
- DealFlow360_BRD.md (companion business requirements document)

### 1.5 Overview
Section 2 describes the product at a high level. Section 3 details every functional requirement by module. Section 4 defines external interfaces (UI, APIs, third-party). Section 5 covers non-functional requirements. Section 6 defines the data model. Section 7 documents key use cases. Section 8 covers the two ML model specifications in full technical detail. Appendices hold the glossary and tech stack decisions.

---

## 2. Overall Description

### 2.1 Product Perspective
DealFlow360 is a standalone web application (not a plug-in to an existing ERP), with one narrow external dependency: Odoo Sign, called only at the final document-signing step. It is not built as microservices; it is a single core API service plus two isolated auxiliary services (ML service, event consumer) to minimize integration risk within the build window.

### 2.2 Product Functions (Summary)
- Multi-tier, multi-category discount governance with automated, risk-scored approval routing
- ML-based upsell/cross-sell recommendations during quote building
- Multi-warehouse stock-aware order splitting with manual override
- Mixed one-time + recurring subscription billing with proration
- Customer self-service negotiation portal
- ML-based negotiation acceptance prediction
- Real-time deal health and anomaly monitoring
- E-signature capture via Odoo Sign
- Role-based backend configuration and reporting

### 2.3 User Classes and Characteristics

| User class | Technical proficiency | Primary interface |
|---|---|---|
| Sales Rep | Low-medium | Sales Workspace (quote builder, upsell panel, pipeline) |
| Sales Manager | Low-medium | Approval screen, Deal Health dashboard |
| Finance/Operations | Low-medium | Approval screen (2nd level), warehouse/billing screens |
| Customer | Assume no training | Customer Portal (restricted, simplified) |
| Admin | Medium-high | Backend configuration screens |

### 2.4 Operating Environment
- Client: modern browser (Chrome/Edge/Firefox), responsive layout not required for hackathon scope but not precluded
- Server: containerized services (Docker), runnable locally or on a single cloud VM for demo
- Database: PostgreSQL (single instance sufficient for demo scale)

### 2.5 Design and Implementation Constraints
- Must be built and demo-ready within 24 hours
- Core business logic (discount routing, blended risk score, warehouse split, billing proration) must be implemented in application code — not hardcoded, not delegated to any third-party system
- Customer portal must be a genuinely access-restricted, separate view
- Odoo Sign and Redpanda are peripheral integrations only; their failure must never block core flows

### 2.6 Assumptions and Dependencies
- Seed/synthetic data will substitute for real historical transaction data
- Odoo Sign accessed via free "One App" tier; assumes API access is available (to be verified pre-build)
- Team has no prior Kafka experience; Redpanda (Kafka-protocol compatible) is assumed as the event broker, with a polling-based fallback accepted as functionally equivalent for demo purposes

---

## 3. Functional Requirements

Each requirement includes an ID, description, and priority (**P0** = must work for demo, **P1** = should work, **P2** = nice-to-have/cut-if-short).

### 3.1 Authentication Module

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | System shall allow internal users to sign up and log in with email/password | P0 |
| FR-AUTH-02 | System shall allow customers to authenticate via magic link or email/password, scoped only to their own quotations | P0 |
| FR-AUTH-03 | System shall enforce role-based access: Sales Rep, Sales Manager, Finance/Ops, Admin, Customer | P0 |
| FR-AUTH-04 | System shall redirect internal users post-login to the sales workspace, and customers to the portal only | P0 |

### 3.2 Product & Pricing Module

| ID | Requirement | Priority |
|---|---|---|
| FR-PROD-01 | System shall allow Admin to create products with name, category, price, unit, tax, description | P0 |
| FR-PROD-02 | System shall support product variants (attribute + values + extra price) | P1 |
| FR-PROD-03 | System shall support tier-based and currency-specific price lists | P1 |

### 3.3 Discount Governance & Approval Module

| ID | Requirement | Priority |
|---|---|---|
| FR-DISC-01 | System shall allow Admin to configure discount ceilings per customer tier (Bronze/Silver/Gold) | P0 |
| FR-DISC-02 | System shall allow Admin to configure discount ceilings per product category, independent of customer tier | P0 |
| FR-DISC-03 | System shall compute a blended risk score across all lines in a quote when categories mix different ceilings | P0 |
| FR-DISC-04 | System shall route quotes exceeding threshold to Sales Manager approval; quotes exceeding a higher threshold shall additionally require Finance approval | P0 |
| FR-DISC-05 | System shall log every approval, rejection, and edit with user ID, timestamp, and reason | P0 |
| FR-DISC-06 | Approval screen shall display the computed blended risk score and required approval steps | P0 |
| FR-DISC-07 | Reviewers shall be able to approve, reject, or return a quote for revision | P0 |

**Blended risk score — computation logic:**
```
For each quote line:
  line_overage = max(0, line_discount_pct - category_ceiling_pct)
Blended_score = weighted_sum(line_overage across all lines, weighted by line value)
IF Blended_score > MANAGER_THRESHOLD → require Manager approval
IF Blended_score > FINANCE_THRESHOLD → require Manager + Finance approval
```

### 3.4 Warehouse & Fulfillment Module

| ID | Requirement | Priority |
|---|---|---|
| FR-WH-01 | System shall allow Admin to create/manage warehouses with stock levels and replenishment rules | P0 |
| FR-WH-02 | System shall configure shipping-cost weighting used to minimize shipment count | P1 |
| FR-WH-03 | System shall compute a recommended warehouse split for an order based on live stock | P0 |
| FR-WH-04 | Rep shall be able to accept the suggested split or manually override it | P0 |
| FR-WH-05 | System shall prompt "Consolidate Remaining Backorder" automatically when stock arrives mid-fulfillment | P1 |

### 3.5 Subscription & Billing Module

| ID | Requirement | Priority |
|---|---|---|
| FR-SUB-01 | Admin shall define recurring plans (monthly/quarterly/yearly) attachable to products | P0 |
| FR-SUB-02 | System shall separately display one-time and recurring lines within the same order | P0 |
| FR-SUB-03 | System shall calculate mid-cycle proration on quantity/plan changes | P1 |
| FR-SUB-04 | System shall trigger partial refund/credit note automatically on cancellation/modification where applicable | P1 |

### 3.6 Upsell/Cross-Sell Module (ML-Backed)

| ID | Requirement | Priority |
|---|---|---|
| FR-UPS-01 | System shall display ranked upsell suggestions while a quote is being built | P0 |
| FR-UPS-02 | Each suggestion shall display suggested product, margin delta, and promotion tag if applicable | P0 |
| FR-UPS-03 | Rep shall be able to "Add to Quote" or "Dismiss" a suggestion | P0 |
| FR-UPS-04 | Order margin indicator shall update immediately after a suggestion is added | P0 |
| FR-UPS-05 | Recommendations shall be generated by the association-rule/lift-score model (see Section 8.1) | P0 |
| FR-UPS-06 | If the ML service is unavailable, system shall fall back to a static pre-configured pairing table | P1 |

### 3.7 Quotation Builder & Pipeline Module

| ID | Requirement | Priority |
|---|---|---|
| FR-QUOTE-01 | Rep shall be able to add products across categories, adjust quantities, and apply line/order-level discounts | P0 |
| FR-QUOTE-02 | System shall display live order totals and margin indicator | P0 |
| FR-QUOTE-03 | Quotations shall be visible in a Kanban-style pipeline view with customer, amount, and stage | P0 |
| FR-QUOTE-04 | Confirming a quote shall route it to approval if required, or directly to fulfillment otherwise | P0 |

### 3.8 Customer Portal Negotiation Module

| ID | Requirement | Priority |
|---|---|---|
| FR-PORTAL-01 | Portal shall be a separate, access-restricted view distinct from the internal workspace | P0 |
| FR-PORTAL-02 | Customer shall see quotation status: Sent / Under Negotiation / Confirmed | P0 |
| FR-PORTAL-03 | Customer shall be able to leave line-level comments and submit a counter-discount proposal | P0 |
| FR-PORTAL-04 | On "Confirm Quotation," if final terms exceed approval thresholds, quote shall automatically re-enter the approval flow | P0 |
| FR-PORTAL-05 | On confirmation within thresholds, order shall move directly to fulfillment | P0 |
| FR-PORTAL-06 | On confirmation, system shall trigger an Odoo Sign e-signature request (see Section 3.10) | P1 |
| FR-PORTAL-07 | Rep-facing (not customer-facing) negotiation acceptance probability shall be shown alongside any pending counter-offer (see Section 8.2) | P1 |

### 3.9 Deal Health & Anomaly Dashboard Module

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-01 | Dashboard shall list stalled deals (inactive beyond a configured threshold) | P0 |
| FR-DASH-02 | Dashboard shall flag discount anomalies (discount significantly above a rep's historical average) | P0 |
| FR-DASH-03 | Dashboard shall show delivery promise slippage indicators | P1 |
| FR-DASH-04 | Clicking an alert shall open the related quotation | P0 |
| FR-DASH-05 | Manager shall be able to trigger a nudge/escalation action from an alert | P1 |
| FR-DASH-06 | Dashboard shall update in near-real-time via Redpanda event stream, OR via 3-second polling if streaming is not completed (see Section 3.11) | P0 |

### 3.10 Odoo Sign Integration Module

| ID | Requirement | Priority |
|---|---|---|
| FR-SIGN-01 | On "Confirm Quotation" (FR-PORTAL-06), system shall generate the final quote as a PDF | P1 |
| FR-SIGN-02 | System shall call the Odoo Sign API to create and send a sign request tied to that document | P1 |
| FR-SIGN-03 | If the Odoo Sign call fails or times out, the quote shall still transition to "Confirmed" internally — signature failure must not block the sales flow | P0 |
| FR-SIGN-04 | System shall not delegate any pricing, discount, or approval decision to Odoo — Odoo receives only a fully finalized document | P0 (scope-boundary requirement) |

### 3.11 Event Streaming Module (Redpanda)

| ID | Requirement | Priority |
|---|---|---|
| FR-EVT-01 | System shall publish a `discount-events` message when a rep applies a discount | P1 |
| FR-EVT-02 | System shall publish a `deal-events` message when a scheduled check flags a stalled quote | P1 |
| FR-EVT-03 | System shall publish a `stock-events` message when stock levels change | P2 |
| FR-EVT-04 | A consumer process shall subscribe to all topics and push processed results to the dashboard via WebSocket | P1 |
| FR-EVT-05 | All publish operations shall be fire-and-forget; a broker outage must not affect core quote/discount/billing operations | P0 |
| FR-EVT-06 | If streaming is not completed within the build schedule, dashboard shall use 3-second polling instead, with functionally equivalent output | P0 (fallback requirement) |

### 3.12 Reporting Module

| ID | Requirement | Priority |
|---|---|---|
| FR-REP-01 | Admin/Manager shall filter reports by period, sales rep/team, approval status, and product/category | P1 |
| FR-REP-02 | System shall support export to PDF/XLS | P2 |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- **Sales Workspace:** top nav (Quotations, Pipeline, Reload Data, Go to Back-end, Close Workspace); quotation list/pipeline cards; quotation builder with cart; approval screen; upsell panel; warehouse split screen; subscription/billing screen; Deal Health dashboard
- **Customer Portal:** simplified, separate route/domain-scoped view — status banner, line comments, counter-discount field, Submit Request / Confirm Quotation buttons
- **Backend Configuration:** product/price list management, discount tier & approval chain setup, warehouse setup, subscription plan setup, upsell rule setup, reporting configuration

### 4.2 API Interfaces (Internal)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/quotations` | POST/GET | Create/list quotations |
| `/api/quotations/:id/discount` | PATCH | Apply line/order discount, triggers risk score recompute |
| `/api/quotations/:id/approve` | POST | Approve/reject/return a quote |
| `/api/quotations/:id/confirm` | POST | Customer confirmation; triggers Odoo Sign + fulfillment routing |
| `/api/warehouses/split` | POST | Compute recommended warehouse split |
| `/api/ml/recommend` | POST | Get upsell/cross-sell recommendations (ML Model 1) |
| `/api/ml/negotiation-score` | POST | Get acceptance probability (ML Model 2) |
| `/api/dashboard/deal-health` | GET | Polling fallback endpoint for dashboard data |
| `/ws/dashboard` | WebSocket | Real-time dashboard push (Redpanda-fed) |

### 4.3 External Interfaces

| System | Interface type | Purpose | Failure behavior |
|---|---|---|---|
| Odoo Sign | REST/XML-RPC API | E-signature request on quote confirmation | Non-blocking; quote still confirms internally |
| Redpanda (Kafka protocol) | Producer/Consumer client | Event streaming for dashboard | Non-blocking; dashboard falls back to polling |

### 4.4 Hardware Interfaces
None — standard web client/server deployment.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Reliability | Every optional dependency (ML service, Redpanda, Odoo Sign) shall degrade gracefully with a defined fallback; failure of any one shall not cascade to core flows |
| Auditability | Every approval, rejection, and edit is logged with actor, timestamp, and reason (FR-DISC-05) |
| Security | Customer portal access is scoped strictly to the customer's own quotation data; role-based access enforced on all internal endpoints |
| Explainability | Both ML models use interpretable methods (lift score, logistic regression) rather than opaque models, to support judge/stakeholder Q&A |
| Performance | Core API responses for quote/discount operations should return within ~500ms under demo load; ML endpoints within ~1-2s |
| Maintainability | Core business logic isolated in a single service to avoid distributed-system complexity inappropriate for a 24-hour build |
| Demo resilience | A recorded backup of a complete successful demo run must exist prior to presentation |

---

## 6. Data Requirements

### 6.1 Core Entities

| Entity | Key Attributes |
|---|---|
| `users` | id, name, email, role, password_hash |
| `customers` | id, name, tier, contact_info |
| `products` | id, name, category, price, unit, tax, margin |
| `price_lists` | id, customer_tier, currency, product_id, price |
| `discount_tiers` | tier, max_discount_pct |
| `category_discount_limits` | category_id, max_discount_pct |
| `quotations` | id, customer_id, rep_id, status, blended_risk_score, created_at, last_activity_at |
| `quotation_lines` | id, quotation_id, product_id, quantity, discount_pct, line_total |
| `approval_steps` | id, quotation_id, approver_role, status, timestamp, reason |
| `audit_log` | id, entity_type, entity_id, actor_id, action, reason, timestamp |
| `warehouses` | id, name, shipping_cost_weight |
| `stock_levels` | warehouse_id, product_id, quantity |
| `warehouse_splits` | quotation_id, warehouse_id, quantity_fulfilled |
| `subscriptions` | id, quotation_line_id, plan_type, billing_schedule, proration_rules |
| `invoices` | id, quotation_id, amount, status |
| `payments` | id, invoice_id, amount, method, status |
| `order_history` | order_id, product_id (supports ML Model 1 training) |
| `negotiation_events` | quotation_id, message_text, sentiment_score, discount_requested_pct, outcome (supports ML Model 2 training) |

### 6.2 Data Volume Assumptions
Synthetic seed data: ~150–300 historical orders, ~50–100 past negotiation records — sufficient to produce non-trivial, demo-credible model outputs without requiring real production data.

---

## 7. Key Use Cases

### UC-1: Rep builds a quote requiring approval
1. Rep adds products including a Service category item, applies 18% discount (category cap: 10%)
2. System computes blended risk score → exceeds Finance threshold
3. Quote auto-routes to Manager, then Finance
4. Each reviewer action is logged with reason
5. Approved quote proceeds to warehouse split

### UC-2: Customer negotiates and system re-triggers approval
1. Customer opens portal, requests additional 5% discount
2. System recalculates blended risk score with the new terms
3. Score exceeds threshold → quote automatically re-enters approval (FR-PORTAL-04)
4. Rep sees negotiation acceptance probability alongside the counter-offer (FR-PORTAL-07)

### UC-3: Upsell suggestion during quote building
1. Rep adds a laptop to the cart
2. ML Model 1 computes lift-scored, margin-filtered, promotion-boosted suggestions
3. Rep adds "Extended Warranty" suggestion
4. Order margin indicator updates immediately

### UC-4: Deal health alert triggers manager action
1. Scheduled check detects a quote inactive for 3+ days
2. Event published to `deal-events` (or captured via polling)
3. Dashboard displays the stalled deal
4. Manager clicks alert, opens quote, triggers a nudge

### UC-5: Quote confirmation with e-signature
1. Customer clicks "Confirm Quotation" within approved thresholds
2. System finalizes terms, generates PDF, calls Odoo Sign API
3. Customer receives signing link; quote status shows "Confirmed" in DealFlow360 regardless of signature completion timing

---

## 8. ML Model Specifications

### 8.1 Model 1 — Upsell/Cross-Sell Recommendation Engine

- **Type:** Association-rule mining (lift score), not a trained classifier — chosen for transparency
- **Input:** current cart product ID(s), `order_history` table, `category_discount_limits`/margin table, promoted-product flags
- **Core formula:** `Lift(A,B) = P(A and B) / (P(A) × P(B))`
- **Pipeline:** co-purchase count → lift score → margin filter → promotion boost (×1.3) → rank → top-N output
- **Output schema:** `{ product_id, margin_delta, promotion_tag, rank }`
- **Fallback:** static pairing table if service unreachable

### 8.2 Model 2 — Discount Negotiation Acceptance Predictor

- **Type:** Logistic regression (binary classification: accept/decline)
- **Features:** discount_requested_pct, discount_gap, customer_tier, deal_size, negotiation_rounds, sentiment_score, urgency_score, historical_acceptance_rate
- **Sentiment source:** text-based negotiation channel (portal comments/counter-offer messages); voice-call sentiment is an optional stretch extension reusing the voice-AI speech-to-text pipeline, not a core dependency
- **Training data:** synthetic, generated with realistic correlations (higher gap → lower acceptance; higher sentiment/historical rate → higher acceptance)
- **Output schema:** `{ acceptanceProbability: 0-100, recommendation: string }`
- **Visibility:** Manager (approval screen) and Rep (portal negotiation view) only — never shown to the customer
- **Fallback:** `acceptance% = clamp(100 - discount_gap × 5, 0, 100)`

---

## 9. Appendices

### 9.1 Priority Legend
- **P0** — must work for the 5-minute demo; core PS requirement or a fallback-safety requirement
- **P1** — should work; strengthens the demo but has an acceptable degraded state
- **P2** — nice-to-have; cut first if time runs short

### 9.2 Suggested Tech Stack (non-binding, per PS's technology-agnostic guidance)
- Frontend: React
- Core backend: Node.js/Express
- ML service: Python (scikit-learn) via internal REST API
- Database: PostgreSQL
- Event broker: Redpanda (Kafka-protocol compatible)
- External: Odoo Sign (via One App Free tier)

### 9.3 Glossary
See Section 1.3.

---

*This SRS is intended to be used as the working technical reference throughout the 24-hour build. Priority tags (P0/P1/P2) in Section 3 should be treated as the actual triage tool when time runs short — cut P2 first, then P1, and never compromise a P0 item.*
