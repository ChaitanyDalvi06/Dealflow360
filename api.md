# DealFlow360 — API Documentation

**Total APIs in Project: 52 REST Endpoints + 1 WebSocket Service**

- **Base URL:** `http://localhost:5001/api`
- **WebSocket URL:** `ws://localhost:5001/ws/dashboard`

---

## Summary by Module

| Module | Base Path | Endpoints Count | Purpose |
|---|---|---|---|
| **System Health** | `/api/health` | 1 | Health check & server status |
| **Authentication** | `/api/auth` | 4 | User signup, login, portal login, current user profile |
| **Products & Catalog** | `/api/products` | 5 | Product listing, details, categories, admin CRUD |
| **Quotations & Deals** | `/api/quotations` | 11 | Deal creation, line items, real-time risk, upsells, approvals |
| **Approvals & Governance** | `/api/approvals` | 5 | Multi-tier approvals, audit trail, ML acceptance prediction |
| **Warehouse Logistics** | `/api/warehouses` | 6 | Warehouse inventory, auto-split calculation & persistence, stock updates |
| **Hybrid Billing** | `/api/billing` | 3 | Split billing generation, invoice fetch, payment recording |
| **Customer Portal** | `/api/portal` | 4 | Buyer deal negotiation, counter-proposals, confirmation |
| **Telemetry & Reports** | `/api/dashboard` | 2 | Stalled deal alerts, discount anomaly detector, KPI reports |
| **Admin & Governance** | `/api/admin` | 11 | Tier caps, category limits, escalation rules, users & customers |
| **WebSocket Stream** | `/ws/dashboard` | 1 | Live deal health, negotiation events, and audit telemetry |

---

## 1. System Health
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns API health status, timestamp, and service name |

---

## 2. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new internal sales/manager/admin user |
| `POST` | `/api/auth/login` | Public | Authenticate internal user with email & password |
| `POST` | `/api/auth/portal/login` | Public | Authenticate customer/buyer into negotiation portal |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role |

---

## 3. Products & Catalog (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Authenticated | List all products (filtered by category/search) |
| `GET` | `/api/products/meta/categories` | Authenticated | Get all distinct product categories |
| `GET` | `/api/products/:id` | Authenticated | Get single product details, pricing tiers, and stock |
| `POST` | `/api/products` | Admin Only | Create new hardware, service, or subscription product |
| `PUT` | `/api/products/:id` | Admin Only | Update existing product details, margins, and pricing |

---

## 4. Quotations & Deal Engine (`/api/quotations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/quotations/calculate-risk` | Authenticated | Real-time blended risk & margin preview before quote submission |
| `POST` | `/api/quotations/upsell-recommendations` | Authenticated | Fetch AI association add-ons for given product IDs |
| `GET` | `/api/quotations` | Authenticated | List quotations (reps see own, managers/admins see all) |
| `GET` | `/api/quotations/:id` | Authenticated | Get complete quote object with items, splits, approvals, negotiations |
| `POST` | `/api/quotations` | Sales / Admin | Initialize a new draft quotation for a customer |
| `POST` | `/api/quotations/:id/lines` | Authenticated | Add a product line item with custom quantity & discount % |
| `PATCH` | `/api/quotations/:id/lines/:lineId` | Authenticated | Update line item discount or quantity (recomputes risk & totals) |
| `DELETE` | `/api/quotations/:id/lines/:lineId` | Authenticated | Remove line item and refresh risk score |
| `POST` | `/api/quotations/:id/submit` | Authenticated | Submit quote for multi-tier approval or auto-approval |
| `GET` | `/api/quotations/:id/recommendations` | Authenticated | Fetch AI upsells specifically tuned to quote's line items |
| `POST` | `/api/quotations/:id/confirm` | Authenticated | Confirm approved quotation for fulfillment and invoicing |

---

## 5. Approvals & Governance (`/api/approvals`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/approvals/pending` | Manager / Finance / Admin | Get pending quotations waiting for approval |
| `POST` | `/api/approvals/:quotationId/action` | Manager / Finance / Admin | Execute approval action (`APPROVED`, `REJECTED`, or `RETURNED`) |
| `GET` | `/api/approvals/:quotationId/trail` | Authenticated | Retrieve sequential approval history and timestamps |
| `POST` | `/api/approvals/:quotationId/predict-acceptance` | Internal Roles | ML model inference: win probability, optimal counter discount, sentiment |
| `GET` | `/api/approvals/:quotationId/audit` | Authenticated | Audit log trail of all changes and actors for a deal |

---

## 6. Warehouse Logistics & Auto-Split (`/api/warehouses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/warehouses` | Authenticated | List all fulfillment warehouses and stock levels |
| `POST` | `/api/warehouses` | Admin Only | Register new warehouse depot with freight cost weights |
| `POST` | `/api/warehouses/split/:quotationId` | Authenticated | Algorithmic fulfillment split calculation across nearest depots |
| `POST` | `/api/warehouses/split/:quotationId/save` | Authenticated | Commit warehouse split, deduct stock, advance to `IN_FULFILLMENT` |
| `GET` | `/api/warehouses/split/:quotationId` | Authenticated | View existing split fulfillment plan for a quotation |
| `PATCH` | `/api/warehouses/stock` | Admin Only | Adjust/replenish stock levels for a product at a warehouse |

---

## 7. Hybrid Billing Engine (`/api/billing`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/billing/generate/:quotationId` | Authenticated | Split quote into one-time hardware invoices and recurring SaaS schedules |
| `GET` | `/api/billing/:quotationId` | Authenticated | Retrieve all generated invoices and schedules for a quotation |
| `POST` | `/api/billing/pay/:invoiceId` | Authenticated | Record payment against an invoice (Bank transfer, Card, etc.) |

---

## 8. Customer Negotiation Portal (`/api/portal`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/portal/quotations` | Customer Token | Retrieve all quotes issued to logged-in customer |
| `GET` | `/api/portal/quotations/:id` | Customer Token | Retrieve details and negotiation history of customer's quote |
| `POST` | `/api/portal/quotations/:id/negotiate` | Customer Token | Submit counter-offer discount % or item comments |
| `POST` | `/api/portal/quotations/:id/confirm` | Customer Token | Customer e-signs / accepts deal terms (auto-routes if within limits) |

---

## 9. Telemetry & Analytics Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/deal-health` | Internal Roles | Live telemetry: stalled deals (>3d), discount anomalies, pipeline summary |
| `GET` | `/api/dashboard/reports` | Manager / Finance / Admin | Comprehensive analytics: revenue, margin, deal size, time filters |

---

## 10. Admin Configuration (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/discount-tiers` | Authenticated | Fetch tier discount ceilings (Standard, Silver, Gold, Platinum) |
| `PUT` | `/api/admin/discount-tiers/:id` | Admin Only | Update max discount percentage for a customer tier |
| `GET` | `/api/admin/category-limits` | Authenticated | Fetch discount ceilings by product category (Hardware, Services, SaaS) |
| `PUT` | `/api/admin/category-limits/:id` | Admin Only | Update max discount percentage for a product category |
| `GET` | `/api/admin/approval-config` | Authenticated | Fetch global approval risk score thresholds (Manager, Director, VP) |
| `PUT` | `/api/admin/approval-config/:id` | Admin Only | Update approval escalation thresholds |
| `GET` | `/api/admin/customers` | Authenticated | List all customer accounts and tiers |
| `POST` | `/api/admin/customers` | Admin Only | Create new customer profile |
| `GET` | `/api/admin/subscription-plans` | Admin Only | List subscription plans and recurring billing intervals |
| `GET` | `/api/admin/upsell-rules` | Admin Only | View association-rule mining upsell pairs and margin deltas |
| `GET` | `/api/admin/users` | Admin Only | List all internal users and role assignments |

---

## 11. Real-Time WebSocket (`/ws/dashboard`)
| Protocol | Path | Direction | Events Streamed |
|---|---|---|---|
| `WSS / WS` | `/ws/dashboard` | Bi-directional | • `CONNECTED`<br>• `INITIAL_STATE`<br>• `DEAL_STALLED`<br>• `DISCOUNT_ANOMALY`<br>• `APPROVAL_REQUIRED`<br>• `STOCK_LOW`<br>• `NEGOTIATION_UPDATE`<br>• `HEARTBEAT` |
