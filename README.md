<div align="center">

# ⚡ DealFlow360
### The Open-Source Intelligent CPQ & Revenue Governance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Odoo Sign](https://img.shields.io/badge/Odoo_Sign-XML--RPC-714B67?style=for-the-badge&logo=odoo&logoColor=white)](https://www.odoo.com/)

<p align="center">
  <b>DealFlow360</b> replaces static PDF quote ping-pong with an intelligent, collaborative CPQ engine. Built with real-time margin guardrails, ML-driven upsell recommendations, interactive customer negotiation, live Odoo Sign execution, and automated commercial invoicing.
</p>

[Explore Documentation](#-system-architecture) • [Quickstart Guide](#-quickstart-guide) • [Key Innovations](#-key-innovations) • [API Specification](#-api-endpoints)

---

</div>

## 📌 Executive Summary

Traditional B2B procurement is broken. Sales reps negotiate in private spreadsheets, rogue discounting erodes gross margins, approvals bottleneck in email chains, and finalized contracts get manually re-keyed into ERPs.

**DealFlow360 solves the entire Quote-to-Cash (Q2C) lifecycle in one unified, auditable engine:**

```
Customer Requirement ──> Algorithmic CPQ Workspace ──> Tiered Manager Governance
                                                                 │
                                                                 ▼
Commercial Invoicing <── Live Odoo Sign Protocol <── Interactive Negotiation Portal
```

---

## 🚀 Key Innovations

### 1. 🛡️ Algorithmic Discount Governance & Blended Risk
* **Weighted Quotation Risk Score:** Computes real-time risk across individual line items weighted by line value:
  $$\text{Blended Risk Score} = \frac{\sum (\text{Line Overage} \times \text{Line Gross Value})}{\sum \text{Line Gross Value}}$$
* **Autonomous Approval Routing:** Routine quotes approve instantly; policy breaches route directly to Sales Managers with full margin audit logs.
* **Strict Margin Floors:** Enforces non-negotiable profitability guardrails across all product categories.

### 2. 🤝 Living Buyer Negotiation Portal
* **Collaborative B2B Negotiation:** Customers access an authenticated procurement portal to review items, request structured target discounts, and attach commercial counter-terms.
* **Acceptance Probability Engine:** Evaluates counter-offers against historical win rates and discount elasticity to provide sales reps real-time guidance.

### 3. 🧠 Market Basket Upsell Engine (AI/ML)
* **Association Mining:** Recommends complementary products using lift, support, and category affinity matrices based on active order requirements.
* **Real-Time Margin Impact:** Automatically models gross margin variations as upsell line items are adopted.

### 4. ✍️ Live Odoo Sign Integration & Cryptographic Sealing
* **Digital Ink Ceremony:** High-precision HTML5 Canvas signature pad with touch and mobile tablet support.
* **Tamper-Proof Audit Trail:** Generates a verifiable **SHA-256 cryptographic seal** linking the document hash, signer credentials, IP address, and timestamp.
* **Odoo ERP Cloud Synchronization:** Native XML-RPC protocol authenticates with live Odoo Enterprise SaaS instances, registers the customer in `res.partner`, uploads the signed contract to `ir.attachment`, and binds it to an Odoo Sign template.

### 5. 📄 High-Fidelity Python Invoice & Contract Generator
* **Deterministic ReportLab Engine:** Compiles vector-crisp, corporate-grade PDF invoices with GST tax schedules (18% IGST), remittance bank wiring details, and managerial approval stamps.
* **Dynamic Signature Inking:** Injects customer-drawn digital ink signatures directly into generated contracts upon execution.

### 6. 💼 Role-Segregated Finance Execution Mode
* **Authorized Deals Dashboard:** Clear separation of concerns—Sales Managers approve commercial terms; Finance executes invoices, releases fulfillment, and manages subscription billing schedules.

---

## 🏗 System Architecture

```
dealflow360/
├── client/                     # React 19 Frontend (Vite)
│   ├── src/
│   │   ├── pages/              # Portal, Workspace, Approvals, Finance, Admin
│   │   ├── components/         # ChatPanel, RiskBar, TopNav, Sidebar
│   │   └── utils/              # Axios API clients & currency formatters
├── server/                     # Node.js Express Core Backend
│   ├── src/
│   │   ├── routes/             # REST Endpoints (Quotations, Approvals, Portal, Billing)
│   │   ├── services/           # Discount Engine, Approval Routing, PDF Service
│   │   │   ├── invoice_pdf.py  # Python ReportLab Enterprise PDF Generator
│   │   │   └── odoo_client.py  # Live Odoo SaaS XML-RPC Connector
│   │   └── websocket/          # Real-time Telemetry & Live Negotiation Chat
│   └── storage/                # Encrypted Local Invoices & Cryptographic Signatures
└── Dealflow360-landing-pg/     # High-Performance YC-style Showcase Landing Page
```

---

## ⚡ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Lucide Icons, Space Grotesk, Vanilla CSS Design System |
| **Core API** | Node.js (v20+), Express, WebSocket Server (`ws`), Socket.io |
| **Database & ORM** | PostgreSQL 16+, Prisma ORM, Connection Pooling |
| **PDF & Document Engine** | Python 3.13, ReportLab Platypus, Pillow |
| **ERP / E-Signature** | Odoo Enterprise SaaS XML-RPC Protocol (`/xmlrpc/2/object`) |
| **Event Streaming** | Redpanda / Apache Kafka protocol (`kafkajs`) |
| **Security & Auth** | JSON Web Tokens (JWT), bcryptjs password hashing, SHA-256 digital seals |

---

## 📦 Quickstart Guide

### Prerequisites
* **Node.js** v20.x or higher
* **Python** 3.10+ (with `pip`)
* **PostgreSQL** running locally or via Docker

### 1. Clone the Repository
```bash
git clone https://github.com/ChaitanyDalvi06/Dealflow360.git
cd Dealflow360
```

### 2. Configure Environment Variables
Copy the example environment file in `server`:
```bash
cp server/.env.example server/.env
```
Update your `server/.env` with your PostgreSQL database URL and optional Odoo credentials:
```env
DATABASE_URL="postgresql://dealflow:dealflow360@localhost:5432/dealflow360"
JWT_SECRET="dealflow360-jwt-secret-key"
PORT=3001
NODE_ENV="development"

# Live Odoo Sign Configuration (Optional)
ODOO_URL="https://your-instance.odoo.com"
ODOO_DB="your-db"
ODOO_EMAIL="your-email@domain.com"
ODOO_API_KEY="your-odoo-api-key"
```

### 3. Install Dependencies & Setup Database
```bash
# Install server dependencies
cd server
npm install
pip3 install reportlab pillow

# Run Prisma migrations & seed database
npx prisma db push
node prisma/seed.js

# Install client dependencies
cd ../client
npm install
```

### 4. Start Development Servers
In two separate terminals:

```bash
# Terminal 1: Backend Server
cd server
npm run dev

# Terminal 2: Client Web App
cd client
npm run dev
```

* 🌐 **Web Client:** [http://localhost:5173](http://localhost:5173)
* 🚀 **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)
* 🩺 **Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 🔑 Role-Based Access Control (Demo Logins)

The seeded database includes pre-configured credentials across all procurement personas:

| Role | Email | Password | Primary Workflow |
| :--- | :--- | :--- | :--- |
| **Sales Rep** | `sales@dealflow360.com` | `password123` | Quote building, risk analysis, live customer chat |
| **Sales Manager** | `manager@dealflow360.com` | `password123` | Discount overage approvals, policy governance |
| **Finance Officer** | `finance@dealflow360.com` | `password123` | Authorized deals, PDF invoice generation, billing |
| **Admin** | `admin@dealflow360.com` | `password123` | Platform configuration, margin floors, audit logs |
| **Customer / Buyer** | `buyer@globalent.com` | `password123` | Requirement submission, negotiations, Odoo Sign |

---

## 🌐 API Endpoints

### Commercial Quotations
* `GET /api/quotations` — List quotations (filterable by `status=APPROVED,CONFIRMED`)
* `GET /api/quotations/:id` — Retrieve full quotation breakdown with item lines & approval history
* `POST /api/quotations/:id/submit` — Submit quotation for manager policy review

### Customer Portal & E-Signature
* `GET /api/portal/quote/:token` — Retrieve client-facing commercial quotation
* `POST /api/portal/quote/:token/negotiate` — Submit counter-discount request
* `POST /api/portal/quote/:token/sign` — Execute digital signature ceremony & sync to Odoo

### Finance & Billing
* `POST /api/billing/generate/:quotationId` — Generate tax invoices and proration schedules
* `GET /api/billing/pdf/:quotationId` — Stream high-fidelity Python ReportLab PDF invoice

---

## 🔒 Security & Compliance
* **Data Isolation:** Complete multi-tenant separation between internal sales users and external portal buyers.
* **Audit Trail:** Every commercial modification, discount override, approval decision, and digital signature is immutably recorded in the PostgreSQL `AuditLog` table.
* **Non-Blocking Fault Tolerance:** All external integrations (Odoo ERP, Redpanda, ML service) fail gracefully without obstructing core quotation transactions.

---

## 📄 License
DealFlow360 is open-source software licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Built with ❤️ for modern B2B revenue and sales engineering teams.</sub>
</div>
