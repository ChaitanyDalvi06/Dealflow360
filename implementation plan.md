# DealFlow360 — Full Implementation Plan

**Goal:** Build a production-grade B2B sales operations platform in 24 hours that nails the PS "Quick Test Flow" and differentiates with ML, e-signature, and real-time streaming.

---

## User Review Required

> [!IMPORTANT]
> **Odoo Sign API requires a paid Custom plan** — the "One App Free" tier does NOT include external API access. We have two options:
> 1. **Mock Odoo Sign** — simulate the signing flow with a realistic UI (PDF generation + signing ceremony page) without calling Odoo's actual API. Judges see the same UX.
> 2. **Use a free e-sign alternative** — like DocuSeal (open source, self-hosted via Docker) to demonstrate real e-signature capability.
>
> **Recommendation:** Go with Option 1 (Mock Odoo Sign with realistic UX) — it's zero-risk, zero-setup, and lets us focus time on core PS requirements. We can mention in the demo that production would use the actual Odoo Sign API.

> [!WARNING]
> **Build priority is strict:** Core PS flow (8-step test) must be bulletproof BEFORE any differentiator (ML, Redpanda, e-sign). Every differentiator has a polling/static fallback that works identically for the demo.

---

## Open Questions

1. **Tech stack confirmation:** The BRD suggests React + Node.js/Express + PostgreSQL + Python ML. Should we use **Next.js** instead of plain React (gives us SSR, API routes, file-based routing)? Or keep it as a **Vite React** frontend + separate Express backend?
2. **Docker requirement:** Should we containerize everything with Docker Compose (Postgres + Redpanda + services), or run Postgres locally with the services outside containers for faster iteration?
3. **Odoo Sign approach:** Option 1 (mock) or Option 2 (DocuSeal) per the note above?

---

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | React 18 + Vite | Fast HMR, lightweight, no SSR needed for this demo |
| **Styling** | Vanilla CSS with design tokens | Per rules — no Tailwind unless requested |
| **State** | React Context + useReducer | Avoids Redux boilerplate for 24h build |
| **Core API** | Node.js + Express | Single service, all business logic |
| **ORM/DB** | PostgreSQL + Prisma | Type-safe queries, easy migrations, seed scripts |
| **Auth** | JWT (access + refresh tokens) | Simple, stateless, role-based |
| **ML Service** | Python + Flask + scikit-learn | Separate service, internal REST API |
| **Event Broker** | Redpanda (Docker) + KafkaJS | Kafka-compatible, no ZooKeeper, lightweight |
| **Real-time** | WebSocket (ws library) | Dashboard push from event consumer |
| **PDF Generation** | puppeteer or @react-pdf/renderer | Quote PDF for signing flow |
| **E-Signature** | Mock Odoo Sign (self-contained) | Realistic UI, zero external dependency |

---

## Project Structure

```
DealFlow360/
├── docker-compose.yml              # Postgres + Redpanda
├── package.json                     # Root workspace config
│
├── server/                          # Node.js Express API
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma           # Full data model
│   │   └── seed.js                 # Synthetic seed data
│   ├── src/
│   │   ├── index.js                # Express app entry
│   │   ├── config/
│   │   │   └── env.js              # Environment config
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification + role guard
│   │   │   └── audit.js            # Audit logging middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── product.routes.js
│   │   │   ├── quotation.routes.js
│   │   │   ├── approval.routes.js
│   │   │   ├── warehouse.routes.js
│   │   │   ├── billing.routes.js
│   │   │   ├── portal.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   └── admin.routes.js
│   │   ├── services/
│   │   │   ├── discount.service.js     # Blended risk score engine
│   │   │   ├── approval.service.js     # Approval chain routing
│   │   │   ├── warehouse.service.js    # Split algorithm
│   │   │   ├── billing.service.js      # Invoice/subscription/proration
│   │   │   ├── ml.service.js           # HTTP client to ML service
│   │   │   ├── signing.service.js      # Mock Odoo Sign
│   │   │   └── event.service.js        # Redpanda publisher
│   │   ├── utils/
│   │   │   ├── riskScore.js            # Blended risk score computation
│   │   │   └── proration.js            # Mid-cycle proration math
│   │   └── websocket/
│   │       └── dashboard.ws.js         # WebSocket server for dashboard
│   └── tests/
│
├── client/                          # React + Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css                   # Design system tokens + global styles
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── QuotationContext.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useWebSocket.js
│       │   └── useApi.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── TopNav.jsx
│       │   │   └── Layout.jsx
│       │   ├── common/
│       │   │   ├── Button.jsx
│       │   │   ├── Modal.jsx
│       │   │   ├── Badge.jsx
│       │   │   ├── Card.jsx
│       │   │   ├── DataTable.jsx
│       │   │   └── StatusBadge.jsx
│       │   ├── quotation/
│       │   │   ├── QuotationBuilder.jsx
│       │   │   ├── QuotationLine.jsx
│       │   │   ├── MarginIndicator.jsx
│       │   │   ├── DiscountInput.jsx
│       │   │   └── RiskScoreBadge.jsx
│       │   ├── upsell/
│       │   │   └── UpsellPanel.jsx
│       │   ├── approval/
│       │   │   ├── ApprovalScreen.jsx
│       │   │   └── AuditTrail.jsx
│       │   ├── warehouse/
│       │   │   ├── WarehouseSplit.jsx
│       │   │   └── SplitOverride.jsx
│       │   ├── billing/
│       │   │   ├── BillingScreen.jsx
│       │   │   ├── SubscriptionLines.jsx
│       │   │   └── InvoiceView.jsx
│       │   ├── portal/
│       │   │   ├── PortalLayout.jsx
│       │   │   ├── PortalQuotation.jsx
│       │   │   ├── NegotiationChat.jsx
│       │   │   └── SigningCeremony.jsx
│       │   └── dashboard/
│       │       ├── DealHealthDashboard.jsx
│       │       ├── StalledDeals.jsx
│       │       ├── DiscountAnomalies.jsx
│       │       └── DeliverySlippage.jsx
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── WorkspacePage.jsx
│       │   ├── PipelinePage.jsx
│       │   ├── ApprovalPage.jsx
│       │   ├── WarehousePage.jsx
│       │   ├── BillingPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── AdminPage.jsx
│       │   ├── ReportsPage.jsx
│       │   └── portal/
│       │       ├── PortalLoginPage.jsx
│       │       └── PortalQuotePage.jsx
│       └── utils/
│           ├── api.js                  # Axios instance with JWT
│           └── formatters.js
│
├── ml-service/                      # Python ML service
│   ├── requirements.txt
│   ├── app.py                       # Flask entry
│   ├── models/
│   │   ├── recommender.py           # Lift-score upsell engine
│   │   └── negotiation.py           # Logistic regression predictor
│   ├── data/
│   │   └── generate_training.py     # Synthetic training data
│   └── utils/
│       └── sentiment.py             # Text sentiment scoring
│
└── event-consumer/                  # Redpanda consumer → WebSocket
    ├── package.json
    └── src/
        ├── consumer.js              # KafkaJS consumer
        └── anomaly.js               # Anomaly detection rules
```

---

## Data Model (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── AUTH & USERS ───────────────────────────────────────────

model User {
  id            String   @id @default(uuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(SALES_REP)
  createdAt     DateTime @default(now())
  
  quotations    Quotation[]
  approvalSteps ApprovalStep[] @relation("Approver")
  auditLogs     AuditLog[]
}

enum Role {
  ADMIN
  SALES_REP
  SALES_MANAGER
  FINANCE
  CUSTOMER
}

model Customer {
  id          String       @id @default(uuid())
  name        String
  email       String       @unique
  tier        CustomerTier @default(BRONZE)
  phone       String?
  company     String?
  passwordHash String?
  magicToken  String?
  createdAt   DateTime     @default(now())

  quotations  Quotation[]
}

enum CustomerTier {
  BRONZE
  SILVER
  GOLD
}

// ─── PRODUCTS & PRICING ────────────────────────────────────

model Product {
  id          String    @id @default(uuid())
  name        String
  category    String
  basePrice   Decimal   @db.Decimal(12,2)
  unit        String    @default("unit")
  taxRate     Decimal   @db.Decimal(5,2) @default(0)
  margin      Decimal   @db.Decimal(5,2)
  description String?
  isPromoted  Boolean   @default(false)
  isRecurring Boolean   @default(false)
  createdAt   DateTime  @default(now())

  priceListEntries PriceListEntry[]
  quotationLines   QuotationLine[]
  stockLevels      StockLevel[]
  subscriptionPlan SubscriptionPlan?
  orderHistory     OrderHistory[]
}

model PriceListEntry {
  id            String       @id @default(uuid())
  productId     String
  customerTier  CustomerTier
  currency      String       @default("INR")
  price         Decimal      @db.Decimal(12,2)

  product       Product      @relation(fields: [productId], references: [id])

  @@unique([productId, customerTier, currency])
}

// ─── DISCOUNT GOVERNANCE ───────────────────────────────────

model DiscountTier {
  id              String       @id @default(uuid())
  customerTier    CustomerTier @unique
  maxDiscountPct  Decimal      @db.Decimal(5,2)
}

model CategoryDiscountLimit {
  id              String  @id @default(uuid())
  category        String  @unique
  maxDiscountPct  Decimal @db.Decimal(5,2)
}

model ApprovalConfig {
  id                 String  @id @default(uuid())
  managerThreshold   Decimal @db.Decimal(5,2) @default(0)
  financeThreshold   Decimal @db.Decimal(5,2) @default(5)
}

// ─── QUOTATIONS ────────────────────────────────────────────

model Quotation {
  id               String          @id @default(uuid())
  customerId       String
  repId            String
  status           QuotationStatus @default(DRAFT)
  blendedRiskScore Decimal?        @db.Decimal(5,2)
  orderTotal       Decimal         @db.Decimal(12,2) @default(0)
  totalMargin      Decimal         @db.Decimal(12,2) @default(0)
  notes            String?
  createdAt        DateTime        @default(now())
  lastActivityAt   DateTime        @default(now()) @updatedAt

  customer         Customer        @relation(fields: [customerId], references: [id])
  rep              User            @relation(fields: [repId], references: [id])
  lines            QuotationLine[]
  approvalSteps    ApprovalStep[]
  warehouseSplits  WarehouseSplit[]
  invoices         Invoice[]
  negotiations     NegotiationEvent[]
  auditLogs        AuditLog[]
}

enum QuotationStatus {
  DRAFT
  SENT
  UNDER_NEGOTIATION
  PENDING_MANAGER
  PENDING_FINANCE
  APPROVED
  REJECTED
  CONFIRMED
  IN_FULFILLMENT
  COMPLETED
  CANCELLED
}

model QuotationLine {
  id           String   @id @default(uuid())
  quotationId  String
  productId    String
  quantity     Int      @default(1)
  unitPrice    Decimal  @db.Decimal(12,2)
  discountPct  Decimal  @db.Decimal(5,2) @default(0)
  lineTotal    Decimal  @db.Decimal(12,2)
  lineMargin   Decimal  @db.Decimal(12,2)
  isRecurring  Boolean  @default(false)
  comment      String?

  quotation    Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  product      Product   @relation(fields: [productId], references: [id])
  subscription Subscription?
}

// ─── APPROVALS & AUDIT ─────────────────────────────────────

model ApprovalStep {
  id           String         @id @default(uuid())
  quotationId  String
  approverRole Role
  approverId   String?
  status       ApprovalAction @default(PENDING)
  reason       String?
  createdAt    DateTime       @default(now())

  quotation    Quotation @relation(fields: [quotationId], references: [id])
  approver     User?     @relation("Approver", fields: [approverId], references: [id])
}

enum ApprovalAction {
  PENDING
  APPROVED
  REJECTED
  RETURNED
}

model AuditLog {
  id         String   @id @default(uuid())
  entityType String
  entityId   String
  actorId    String
  action     String
  reason     String?
  metadata   Json?
  timestamp  DateTime @default(now())

  actor      User      @relation(fields: [actorId], references: [id])
  quotation  Quotation? @relation(fields: [entityId], references: [id])
}

// ─── WAREHOUSES & INVENTORY ────────────────────────────────

model Warehouse {
  id                 String  @id @default(uuid())
  name               String
  location           String?
  shippingCostWeight Decimal @db.Decimal(5,2) @default(1.0)

  stockLevels     StockLevel[]
  warehouseSplits WarehouseSplit[]
}

model StockLevel {
  id          String @id @default(uuid())
  warehouseId String
  productId   String
  quantity    Int    @default(0)

  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  product     Product   @relation(fields: [productId], references: [id])

  @@unique([warehouseId, productId])
}

model WarehouseSplit {
  id                String @id @default(uuid())
  quotationId       String
  warehouseId       String
  productId         String
  quantityFulfilled Int

  quotation  Quotation @relation(fields: [quotationId], references: [id])
  warehouse  Warehouse @relation(fields: [warehouseId], references: [id])
}

// ─── SUBSCRIPTIONS & BILLING ───────────────────────────────

model SubscriptionPlan {
  id          String   @id @default(uuid())
  productId   String   @unique
  planType    PlanType
  intervalMonths Int
  prorateOnChange Boolean @default(true)

  product     Product  @relation(fields: [productId], references: [id])
}

enum PlanType {
  MONTHLY
  QUARTERLY
  YEARLY
}

model Subscription {
  id              String   @id @default(uuid())
  quotationLineId String   @unique
  planType        PlanType
  startDate       DateTime @default(now())
  nextBillingDate DateTime
  status          SubscriptionStatus @default(ACTIVE)

  quotationLine   QuotationLine @relation(fields: [quotationLineId], references: [id])
  billingSchedules BillingSchedule[]
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  CANCELLED
}

model BillingSchedule {
  id             String   @id @default(uuid())
  subscriptionId String
  dueDate        DateTime
  amount         Decimal  @db.Decimal(12,2)
  status         String   @default("SCHEDULED")

  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
}

model Invoice {
  id          String        @id @default(uuid())
  quotationId String
  type        InvoiceType   @default(ONE_TIME)
  amount      Decimal       @db.Decimal(12,2)
  status      InvoiceStatus @default(DRAFT)
  issuedAt    DateTime      @default(now())

  quotation   Quotation @relation(fields: [quotationId], references: [id])
  payments    Payment[]
}

enum InvoiceType {
  ONE_TIME
  RECURRING
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

model Payment {
  id        String        @id @default(uuid())
  invoiceId String
  amount    Decimal       @db.Decimal(12,2)
  method    PaymentMethod @default(BANK_TRANSFER)
  status    PaymentStatus @default(COMPLETED)
  paidAt    DateTime      @default(now())

  invoice   Invoice @relation(fields: [invoiceId], references: [id])
}

enum PaymentMethod {
  CREDIT_CARD
  BANK_TRANSFER
  UPI
  CHEQUE
}

enum PaymentStatus {
  COMPLETED
  PENDING
  FAILED
  REFUNDED
}

// ─── NEGOTIATION & ML ──────────────────────────────────────

model NegotiationEvent {
  id                  String  @id @default(uuid())
  quotationId         String
  messageText         String?
  sentimentScore      Decimal? @db.Decimal(4,2)
  discountRequestedPct Decimal? @db.Decimal(5,2)
  senderType          String   // "customer" | "rep"
  outcome             String?  // "accepted" | "declined" | "pending"
  createdAt           DateTime @default(now())

  quotation           Quotation @relation(fields: [quotationId], references: [id])
}

model OrderHistory {
  id        String @id @default(uuid())
  orderId   String
  productId String

  product   Product @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
}

// ─── UPSELL RULES (Static fallback) ───────────────────────

model UpsellRule {
  id              String  @id @default(uuid())
  sourceProductId String
  targetProductId String
  marginDelta     Decimal @db.Decimal(12,2)
  isPromoted      Boolean @default(false)

  @@unique([sourceProductId, targetProductId])
}
```

---

## Proposed Changes — Phased Build

### Phase 1: Foundation (Hours 0–3)

#### [NEW] `docker-compose.yml`
- PostgreSQL 16 container (port 5432)
- Redpanda single-node (port 19092)
- Redpanda Console (port 8080)

#### [NEW] `server/` — Express API scaffold
- Express app with CORS, JSON parsing, error handler
- Prisma schema (full model above)
- Prisma seed script generating:
  - 5 internal users (1 admin, 2 reps, 1 manager, 1 finance)
  - 10 customers (mix of Bronze/Silver/Gold)
  - 20 products (Hardware, Software, Service categories)
  - 3 warehouses with stock levels
  - Discount tiers and category limits
  - 3 subscription plans
  - ~200 order history records (for ML)
  - ~80 negotiation events (for ML)
- JWT auth middleware with role-based guards

#### [NEW] `client/` — Vite React scaffold
- Vite + React 18 setup
- Design system in `index.css` (dark theme, glassmorphism, premium palette)
- Auth context, routing (react-router-dom v6)
- Login/Signup pages with premium UI

#### [NEW] `ml-service/` — Python Flask scaffold
- Flask app skeleton
- Training data generator
- Model stubs

---

### Phase 2: Core Quotation & Discount Engine (Hours 3–9)

#### [NEW] `server/src/services/discount.service.js`
The **blended risk score** algorithm — the most judge-critical piece:
```javascript
function computeBlendedRiskScore(lines, categoryLimits) {
  let totalWeightedOverage = 0;
  let totalLineValue = 0;
  
  for (const line of lines) {
    const categoryLimit = categoryLimits[line.product.category];
    const overage = Math.max(0, line.discountPct - categoryLimit);
    const lineValue = line.unitPrice * line.quantity;
    totalWeightedOverage += overage * lineValue;
    totalLineValue += lineValue;
  }
  
  return totalLineValue > 0 
    ? totalWeightedOverage / totalLineValue 
    : 0;
}
```

#### [NEW] `server/src/services/approval.service.js`
- Routes to Manager if score > managerThreshold
- Routes to Manager + Finance if score > financeThreshold
- Creates ApprovalStep records
- Full audit logging on every action

#### [NEW] `server/src/routes/quotation.routes.js`
- CRUD for quotations and lines
- Live margin computation
- Risk score trigger on discount change

#### [NEW] `client/src/pages/WorkspacePage.jsx`
- Quotation builder with product search, line editing
- Live margin indicator (color-coded)
- Risk score badge

#### [NEW] `client/src/pages/PipelinePage.jsx`
- Kanban board (Draft → Sent → Negotiation → Approved → Fulfilled)

#### [NEW] `client/src/pages/ApprovalPage.jsx`
- Pending approvals list
- Approve/Reject/Return with reason
- Audit trail viewer

---

### Phase 3: Warehouse & Billing (Hours 9–13)

#### [NEW] `server/src/services/warehouse.service.js`
Warehouse split algorithm:
```javascript
function computeWarehouseSplit(orderLines, warehouses, stockLevels) {
  // 1. For each product, find warehouses with stock
  // 2. Sort by shipping cost weight (ascending) — prefer cheapest
  // 3. Allocate from cheapest warehouse first, spill to next
  // 4. Track remaining as backorder if total stock < ordered qty
  // Returns: { splits: [{warehouseId, productId, qty}], backorders: [...] }
}
```

#### [NEW] `server/src/services/billing.service.js`
- Separate one-time lines → ONE_TIME invoice
- Recurring lines → RECURRING invoice + subscription + billing schedule
- Proration on mid-cycle changes: `proratedAmount = (daysRemaining / totalDays) * fullPrice`
- Credit note generation on cancellation

#### [NEW] Frontend pages
- `WarehousePage.jsx` — recommended split view, manual override
- `BillingPage.jsx` — dual-pane (one-time | recurring), billing schedule, payment recording

---

### Phase 4: Customer Portal (Hours 13–15)

#### [NEW] `client/src/pages/portal/` — Completely separate route tree
- Separate layout (no sidebar, simplified header)
- Customer auth (magic link or email/password)
- Quotation status (Sent / Under Negotiation / Confirmed)
- Line-level comment input
- Counter-discount proposal field
- "Submit Request" → saves negotiation event, status → UNDER_NEGOTIATION
- "Confirm Quotation" → recalculates risk score:
  - If over threshold → auto re-enters approval → status back to PENDING_MANAGER
  - If within threshold → status → CONFIRMED → triggers signing flow
- **Mock signing ceremony page** (realistic PDF preview + signature capture)

> [!IMPORTANT]
> The portal is a **genuinely separate, access-restricted view** — different route prefix (`/portal/*`), different layout, different auth scope (customer sees only their own quotations). This is explicitly called out in the PS as a requirement judges will check.

---

### Phase 5: Redpanda + Deal Health Dashboard (Hours 15–17)

#### [NEW] `event-consumer/` — Kafka consumer service
- KafkaJS consumer subscribes to `discount-events`, `deal-events`, `stock-events`
- Applies anomaly rules:
  - Stalled: `lastActivityAt < now() - configuredDays`
  - Discount anomaly: `discountPct > repAvg + 2 * repStdDev`
  - Delivery slippage: fulfillment date > promised date
- Pushes results via WebSocket to connected dashboard clients

#### [NEW] Event publishers in existing services
- `discount.service.js` → publishes to `discount-events` on every discount apply
- Scheduled job → publishes to `deal-events` every minute
- `warehouse.service.js` → publishes to `stock-events` on stock change

#### [NEW] `client/src/pages/DashboardPage.jsx`
- Real-time Deal Health dashboard
- Three panels: Stalled Deals, Discount Anomalies, Delivery Slippage
- Click-to-open: clicking an alert navigates to that quotation
- Nudge/escalate button on each alert
- **Fallback:** If WebSocket disconnects, auto-falls back to 3-second polling via `/api/dashboard/deal-health`

---

### Phase 6: ML Models (Hours 17–20)

#### [NEW] `ml-service/models/recommender.py` — Model 1: Upsell Engine
```python
def get_recommendations(cart_product_ids, order_history, margin_table, promoted):
    # 1. Count co-occurrences in order_history
    # 2. Compute lift score: Lift(A,B) = P(A∩B) / (P(A) × P(B))
    # 3. Filter: margin_delta > min_threshold
    # 4. Promotion boost: score *= 1.3 if promoted
    # 5. Rank by final score
    # 6. Return top N: { product_id, margin_delta, promo_tag, rank }
```

#### [NEW] `ml-service/models/negotiation.py` — Model 2: Acceptance Predictor
```python
def predict_acceptance(features):
    # Features: discount_requested_pct, discount_gap, customer_tier,
    #           deal_size, negotiation_rounds, sentiment_score,
    #           urgency_score, historical_acceptance_rate
    # Model: LogisticRegression (scikit-learn)
    # Output: { acceptanceProbability: 0-100, recommendation: str }
    # Fallback: acceptance = clamp(100 - discount_gap * 5, 0, 100)
```

#### [NEW] `ml-service/utils/sentiment.py`
- TextBlob or VADER for sentiment polarity (-1 to +1) from negotiation text
- Urgency keyword detection ("ASAP", "by Friday", "urgent")

#### Frontend integration
- `UpsellPanel.jsx` calls `/api/ml/recommend` and renders ranked cards
- `ApprovalScreen.jsx` shows acceptance probability for manager
- `PortalQuotation.jsx` (rep-side view) shows acceptance prediction — NEVER shown to customer

---

### Phase 7: E-Signature Flow (Hours 20–22)

#### [NEW] `server/src/services/signing.service.js`
- Generates quote PDF (using puppeteer — renders a styled HTML template)
- Mock Odoo Sign flow:
  1. Creates a "sign request" record locally
  2. Returns a signing URL
  3. Customer opens → sees PDF + signature pad
  4. On sign → records signature, updates quote status
- **Non-blocking:** if PDF generation fails, quote still confirms

#### [NEW] `client/src/components/portal/SigningCeremony.jsx`
- Full-screen signing experience
- PDF preview on left
- Signature pad (HTML Canvas) on right
- "Sign & Confirm" button
- Success animation

---

### Phase 8: Polish, Reports & Demo Prep (Hours 22–24)

#### [NEW] `client/src/pages/ReportsPage.jsx`
- Filters: period, rep/team, approval status, product/category
- Tables with summary metrics
- Export buttons (PDF/XLS — can be stub if time short)

#### [NEW] `client/src/pages/AdminPage.jsx`
- Backend configuration: products, price lists, discount tiers, approval thresholds
- Warehouse management
- Subscription plan setup
- Upsell rule configuration

#### UI Polish
- Animations, transitions, hover effects
- Error states, loading states, empty states
- Responsive refinements

#### Demo Prep
- Verify full 8-step Quick Test Flow end-to-end
- Record backup demo video
- Prepare architecture diagram
- Write "what we'd build next" note

---

## Core Algorithm Details

### Blended Risk Score (Judge-Critical)

```
Input: quotation lines with discount_pct, product category, quantity, unit_price
Lookup: CategoryDiscountLimit for each line's category

For each line:
  overage = max(0, line.discountPct - categoryLimit.maxDiscountPct)
  lineValue = line.unitPrice * line.quantity

blendedScore = Σ(overage × lineValue) / Σ(lineValue)

Routing:
  if blendedScore > financeThreshold → PENDING_FINANCE (Manager + Finance)
  else if blendedScore > managerThreshold → PENDING_MANAGER (Manager only)
  else → APPROVED (auto-approved, skip approval)
```

### Warehouse Split Algorithm

```
Input: order lines (product, quantity), warehouses with stock and shipping cost weight

For each product in order:
  1. Get all warehouses with stock for this product
  2. Sort by shippingCostWeight ASC (cheapest first)
  3. remaining = orderedQty
  4. For each warehouse (cheapest first):
       allocate = min(remaining, warehouse.stock)
       create split record (warehouse, product, allocate)
       remaining -= allocate
       if remaining == 0: break
  5. If remaining > 0: mark as backorder

Output: { splits: [...], backorders: [...] }
```

### Proration Formula

```
On mid-cycle quantity change:
  daysUsed = daysBetween(lastBillingDate, changeDate)
  totalDays = daysBetween(lastBillingDate, nextBillingDate)
  
  creditForOldQty = (totalDays - daysUsed) / totalDays × oldAmount
  chargeForNewQty = (totalDays - daysUsed) / totalDays × newAmount
  
  proratedAdjustment = chargeForNewQty - creditForOldQty
```

---

## Verification Plan

### Automated Tests
```bash
# Blended risk score unit tests
cd server && npm test -- --grep "blended risk"

# Warehouse split algorithm tests
cd server && npm test -- --grep "warehouse split"

# Proration calculation tests
cd server && npm test -- --grep "proration"

# API integration tests
cd server && npm test -- --grep "quotation routes"
```

### Manual Verification — The 8-Step Quick Test Flow
1. ✅ Sign up → configure discount tier, warehouse, subscription plan
2. ✅ Create quote with over-limit discount → auto-triggers manager approval
3. ✅ Accept upsell suggestion → margin updates instantly
4. ✅ Approve → stock from correct warehouse(s), split if needed
5. ✅ One-time + subscription lines billed separately
6. ✅ Customer portal → counter-discount → auto re-enters approval
7. ✅ Confirm quote → signing ceremony triggered
8. ✅ Record payment → invoice status updates

### Demo Recording
- Record full walkthrough as backup before presentation
- Test with seed data reset to ensure clean demo

---

## Design System (Warm Cream + Navy Premium Theme)

Color palette: `#F8F0E5` (cream) · `#EADBC8` (warm beige) · `#DAC0A3` (tan/sand) · `#0F2C59` (deep navy)

```css
:root {
  /* ─── Core Palette ─────────────────────────────────── */
  --cream: #F8F0E5;           /* Lightest — page backgrounds */
  --beige: #EADBC8;           /* Cards, secondary surfaces */
  --sand: #DAC0A3;            /* Borders, dividers, muted elements */
  --navy: #0F2C59;            /* Primary — headers, buttons, text */

  /* ─── Navy Shades (derived) ────────────────────────── */
  --navy-50: #e8ecf2;         /* Lightest navy tint */
  --navy-100: #c5cfde;        /* Hover backgrounds */
  --navy-200: #9eafc8;        /* Disabled text */
  --navy-300: #6d849f;        /* Muted text */
  --navy-400: #3d5a7a;        /* Secondary text */
  --navy-500: #0F2C59;        /* Primary navy */
  --navy-600: #0c244a;        /* Hover state */
  --navy-700: #091c3b;        /* Active/pressed state */
  --navy-800: #06142c;        /* Deep accents */
  --navy-900: #030c1d;        /* Darkest */

  /* ─── Cream/Warm Shades (derived) ──────────────────── */
  --cream-50: #FDFAF5;        /* Subtle background tint */
  --cream-100: #F8F0E5;       /* Primary cream */
  --cream-200: #EADBC8;       /* Beige surfaces */
  --cream-300: #DAC0A3;       /* Sand/tan */
  --cream-400: #C4A882;       /* Deeper warm */
  --cream-500: #B09068;       /* Warm accent */

  /* ─── Accent — Warm Gold for CTAs ──────────────────── */
  --accent-500: #C4943A;      /* Gold — stands out on cream */
  --accent-600: #A87D2E;      /* Gold hover */
  --accent-700: #8C6624;      /* Gold pressed */

  /* ─── Semantic Colors (adjusted for warm palette) ──── */
  --success: #2E7D4F;         /* Forest green — warm-friendly */
  --success-light: #E8F5EE;
  --warning: #D4860A;         /* Warm amber */
  --warning-light: #FEF3E2;
  --danger: #C0392B;          /* Deep red — not harsh */
  --danger-light: #FDECEA;
  --info: #1A5276;            /* Teal-navy — fits palette */
  --info-light: #E8F0F6;

  /* ─── Surfaces ─────────────────────────────────────── */
  --bg-body: #F8F0E5;         /* Full page background */
  --bg-sidebar: #0F2C59;      /* Navy sidebar */
  --bg-card: #FFFFFF;         /* White cards on cream */
  --bg-card-hover: #FDFAF5;   /* Subtle cream on hover */
  --bg-input: #FFFFFF;        /* Input fields */
  --bg-input-focus: #FDFAF5;
  --bg-table-header: #EADBC8; /* Table headers */
  --bg-table-row-alt: #F8F0E5;/* Alternating rows */
  --bg-modal-overlay: rgba(15, 44, 89, 0.5);
  --bg-tooltip: #0F2C59;

  /* ─── Text ─────────────────────────────────────────── */
  --text-primary: #0F2C59;    /* Navy — primary text */
  --text-secondary: #3d5a7a;  /* Lighter navy */
  --text-muted: #6d849f;      /* Muted text */
  --text-on-navy: #F8F0E5;    /* Cream text on navy surfaces */
  --text-on-dark: #FFFFFF;    /* White text on dark elements */
  --text-link: #1A5276;       /* Links */
  --text-link-hover: #0F2C59;

  /* ─── Borders ──────────────────────────────────────── */
  --border-light: #EADBC8;    /* Default border */
  --border-medium: #DAC0A3;   /* Stronger border */
  --border-dark: #C4A882;     /* Emphasis border */
  --border-focus: #0F2C59;    /* Focus ring */
  --border-input: #DAC0A3;    /* Form input borders */

  /* ─── Shadows (warm-toned) ─────────────────────────── */
  --shadow-sm: 0 1px 3px rgba(15, 44, 89, 0.08);
  --shadow-md: 0 4px 12px rgba(15, 44, 89, 0.10);
  --shadow-lg: 0 8px 24px rgba(15, 44, 89, 0.12);
  --shadow-card: 0 2px 8px rgba(15, 44, 89, 0.06);
  --shadow-nav: 0 2px 12px rgba(15, 44, 89, 0.08);

  /* ─── Typography ───────────────────────────────────── */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-heading: 'Outfit', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ─── Radius ───────────────────────────────────────── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* ─── Transitions ──────────────────────────────────── */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ─── Layout ───────────────────────────────────────── */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;
  --topnav-height: 64px;
  --content-max-width: 1280px;
}
```

### Theme Usage Guide

| Element | Token | Example |
|---------|-------|---------|
| Page background | `--bg-body` (#F8F0E5) | Warm cream canvas |
| Sidebar | `--bg-sidebar` (#0F2C59) | Deep navy with cream text |
| Cards | `--bg-card` (white) | Clean white cards floating on cream |
| Primary buttons | `--navy` (#0F2C59) bg + `--text-on-navy` text | Navy buttons, cream text |
| Secondary buttons | transparent + `--navy` border | Outlined navy |
| CTA / Accent buttons | `--accent-500` (#C4943A) | Gold accent for key actions |
| Table headers | `--bg-table-header` (#EADBC8) | Warm beige headers |
| Input borders | `--border-input` (#DAC0A3) | Sand-tone borders |
| Focus rings | `--border-focus` (#0F2C59) | Navy focus indicator |
| Headings | `--text-primary` (#0F2C59) | Navy headings |
| Body text | `--text-secondary` (#3d5a7a) | Softer navy for readability |
| Status badges | Semantic colors on light bg | e.g., green text on `--success-light` |

---

## Risk Mitigation Summary

| Risk | Mitigation |
|------|-----------|
| Redpanda setup fails | Polling fallback (3s interval) — functionally identical in demo |
| ML service crashes | Static upsell rules + formula-based acceptance score |
| Odoo Sign API blocked | Mock signing ceremony with realistic UI |
| Core flow breaks from over-scoping | Strict phase order — Phase 1–4 (PS core) before Phase 5–7 (differentiators) |
| Database issues | Prisma migrations + tested seed script |
| Time overrun on any phase | Hard time-box per phase; cut P2 → P1 → never P0 |
