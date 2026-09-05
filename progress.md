# DealFlow360 — Project Progress & Status Report

## 1. Project Overview & Hackathon Alignment
**DealFlow360** is an intelligent, high-velocity quotation, sales workflow, pricing governance, and order orchestration platform built for the Odoo Hackathon. It solves quote-to-order bottlenecks by unifying AI-assisted margin risk scoring, approval automation, customer digital negotiation, multi-warehouse fulfillment, and split billing.

---

## 2. Color Palette & Design System
Strictly configured and applied across the entire design system:
- **Base Background:** `#F8F0E5` (Warm Cream / `rgb(248, 240, 229)`)
- **Card Background & Accents:** `#EADBC8` (Beige / `rgb(234, 219, 200)`)
- **Borders & Dividers:** `#DAC0A3` (Sand / `rgb(218, 192, 163)`)
- **Primary Navy Brand:** `#0F2C59` (Deep Navy / `rgb(15, 44, 89)`)
- **Icons:** React `lucide-react` custom SVG icons throughout the entire project (Zero emojis).

---

## 3. Work Completed

### A. Database & Schema (PostgreSQL 17 + Prisma ORM)
- Fully modeled relational schema (`server/prisma/schema.prisma`):
  - `User` with roles: `SALES_REP`, `SALES_MANAGER`, `FINANCE_OFFICER`, `ADMIN`, `CUSTOMER`.
  - `Customer` with credit limits, industry, payment terms.
  - `Product` (physical & recurring SaaS subscription products).
  - `PriceList` & `PriceListItem` (volume and tier-based pricing).
  - `DiscountTier` & `CategoryLimit` (governance margin thresholds).
  - `Warehouse` & `StockLevel` (multi-location stock tracking).
  - `Quotation`, `QuotationLine`, `ApprovalRequest`, `AuditLog`.
  - `SubscriptionPlan`, `QuotationSubscription`, `UpsellRule`.
  - `Invoice` & `InvoiceLine` (split payment schedules: 40/30/30, 50/50, etc.).
  - `OrderHistory` (443 historical transactions for analytics and ML model training).
- Seeded database (`npx prisma db seed`) with comprehensive demo accounts and enterprise data.

### B. Backend Architecture (`/server` — Express + Prisma + WebSockets)
- **Authentication & RBAC:** JWT authentication (`auth.middleware.js`) with role enforcement (`checkRole`).
- **Dashboard APIs (`dashboard.routes.js`):**
  - Real-time KPIs (Quotations, Deal Value, Win Rate, Sales Cycle).
  - Funnel metrics, monthly revenue trend, deal health distribution, and warehouse utilization.
- **Quotation & Risk Engine (`quotation.routes.js`, `risk.service.js`):**
  - Calculation endpoint (`POST /api/quotations/calculate-risk`) evaluating gross amounts, volume discounts, margin %, risk scoring (0-100), and automated approval level assignment (AUTO_APPROVED, MANAGER, VP_FINANCE).
  - Upsell recommendation engine (`POST /api/quotations/upsell-recommendations`).
- **Approval Workflow (`approval.routes.js`):**
  - Manager approval, rejection, escalation, and conditional approval with immutable audit logs.
- **Warehouse Allocation (`warehouse.routes.js`, `warehouse.service.js`):**
  - Multi-warehouse auto-split fulfillment algorithm with backorder detection and reservation locks.
- **Billing & Invoice Splits (`billing.routes.js`, `billing.service.js`):**
  - Milestone invoice generation (e.g., upfront advance, on-delivery, net 30) and payment recording.
- **Customer Negotiation Portal (`portal.routes.js`):**
  - Secure token access for customers to accept quotes, counter-offer line-item pricing, and submit digital signatures.
- **Admin Governance (`admin.routes.js`):**
  - Endpoints for discount tiers, category margin floors, and approval matrix limits.

### C. Frontend Architecture (`/client` — React + Vite + Vanilla CSS)
- **Exact Dashboard Replica (`DashboardPage.jsx`):**
  - 4 Top KPI cards with gold icon boxes and animated trend indicators.
  - 5-stage Sales Funnel with SVG trapezoids (Leads, Qualified, Proposal, Negotiation, Won).
  - Combo Bar + Line Revenue Trend chart with animated bars, smooth spline line, and hover tooltips.
  - Deal Health segmented donut chart with centered deal count.
  - Top Products by Revenue horizontal progress bars.
  - Quotations by Status donut with single-line legend.
  - Warehouse Utilization regional capacity bars.
  - Full-width Recent Deals table with strict single-line formatting (`white-space: nowrap`), clean status pills, and responsive scrolling.
- **Navigation & Layout:**
  - `Sidebar.jsx`: Deep Navy sidebar with clean Lucide icons, notification badges, inspiration quote, and version footer.
  - `TopNav.jsx`: Integrated Date Range Picker (`Aug 1, 2026 – Aug 31, 2026`), live notification bell with badge, and user profile menu.
  - Removed outdated greetings and top search bar per design specification.
- **Functional Pages:**
  - `WorkspacePage.jsx`: Dynamic interactive quotation builder with catalog, line-item calculator, and real-time AI risk evaluation.
  - `PipelinePage.jsx`: Drag-and-drop / stage Kanban deal board.
  - `ApprovalPage.jsx`: Manager approval review tickets with financial breakdowns.
  - `WarehousePage.jsx`: Multi-warehouse inventory split and fulfillment dispatcher.
  - `BillingPage.jsx`: Milestone invoice creation and payment tracking.
  - `PortalQuotePage.jsx`: Customer-facing negotiation and e-sign portal.
  - `AdminPage.jsx`: Pricing and margin governance settings.

---

## 4. Remaining Work & Next Steps

1. **Python ML Service Standalone (`/ml-service`):**
   - The Node.js backend currently features a high-performance built-in fallback for ML risk scoring and upsell suggestions.
   - Optional: Scaffold a lightweight Flask/FastAPI microservice in `/ml-service` on port 5001 running Scikit-Learn RandomForest models trained on the seeded 443 order history records.
2. **End-to-End Quotation-to-Invoice Demonstration:**
   - Execute a demo flow: Create quote in Sales Workspace -> Trigger manager approval -> Customer accepts & signs via portal -> Auto-split inventory across warehouses -> Generate split billing schedule.
3. **Kafka / Redpanda Event Streaming (Optional for Demo):**
   - When Redpanda is running via Docker, real-time message streaming is supported; WebSocket fallback is already active and working cleanly.

---

## 5. Commands to Run Backend and Frontend

### Prerequisites
PostgreSQL 17 is running locally on port 5432 with database `dealflow360`.

### Terminal 1: Run Backend API Server
```bash
cd /Users/chaitanyadalvi/Desktop/DealFlow360/server
npm run dev
```
*API will run on **http://localhost:3001** (WebSocket on `ws://localhost:3001/ws/dashboard`).*

### Terminal 2: Run Frontend Web Application
```bash
cd /Users/chaitanyadalvi/Desktop/DealFlow360/client
npm run dev
```
*Frontend will run on **http://localhost:5173**.*

### Demo Credentials
- **Sales Rep:** `sales.rep@dealflow360.com` / `password123`
- **Sales Manager:** `sales.manager@dealflow360.com` / `password123`
- **Finance Officer:** `finance@dealflow360.com` / `password123`
- **System Admin:** `admin@dealflow360.com` / `password123`
- **Customer Portal Access:** Accessible directly via quote links or login with `customer@acmecorp.com` / `password123`.
