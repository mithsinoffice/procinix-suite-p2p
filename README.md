# Procinix Suite — P2P (Subko Coffee)

Web-based **procure-to-pay** workspace for **Subko Coffee**: purchase requests, orders, goods receipt, vendor lifecycle, invoices, payments, advances, budgets, and master data. UI reference: [Figma — Procinix Suite P2P Subko Coffee](https://www.figma.com/design/rnXEKK9o7zMNV4Q0Wgy1ne/Procinix-Suite---P2P---Subko-Coffee).

---

## Table of contents

1. [Quick start (developers)](#quick-start-developers)  
2. [User manual](#user-manual)  
   - [Signing in](#signing-in)  
   - [Screen layout](#screen-layout)  
   - [Main navigation](#main-navigation)  
   - [Procurement](#procurement)  
   - [Accounts payable (AP)](#accounts-payable-ap)  
   - [Vendor management](#vendor-management)  
   - [Masters](#masters)  
   - [Workflow engine](#workflow-engine)  
   - [Other areas](#other-areas)  
3. [Master data index](#master-data-index)  
4. [Tips & behaviour](#tips--behaviour)  
5. [Troubleshooting](#troubleshooting)

---

## Quick start (developers)

### Prerequisites

- **Node.js** (LTS recommended)  
- **npm**  

### Install and run

```bash
npm install
npm run dev
```

- **`npm run dev`** starts the local **API** (`server/index.mjs` with `server:mysql`, using `.env.mysql.local` if present) and the **Vite** dev server once the API port is up.  
- **`npm run dev:web`** — frontend only (if the API is already running elsewhere).  
- **`npm run build`** — production build of the React app.

### Environment

- Copy **`.env.example`** and configure as needed (e.g. `VITE_API_BASE_URL` pointing at your API, default `http://127.0.0.1:8787/api`).  
- For the bundled MySQL-backed server, use **`.env.mysql.local`** (see **`.env.mysql.example`** in the repo) so `npm run dev` can start the API.

---

## User manual

This section is for **end users and administrators** using the Subko Coffee Procurement Suite in the browser.

### Signing in

1. Open the app URL (local: usually the port Vite prints, e.g. `http://localhost:5173`).  
2. You are sent to **Login** if not authenticated.  
3. Enter **email** and **password**, then sign in.

**Demo mode:** When the MySQL API is **not** enabled, the login screen may show **quick-login demo accounts** (e.g. Admin, PO Creator, Approver, GRN Manager, location managers). Use these only in non-production environments.

After login you land on the **dashboard** (Chanakya Desk).

### Screen layout

| Area | Purpose |
|------|--------|
| **Left sidebar** | Primary module navigation (dark bar, “Subko Coffee / Procurement Suite”). |
| **Top header** | Company / **entity context**, notifications, profile, help, and related global actions. |
| **Main content** | The page you selected: lists, forms, dashboards, or masters. |

**Entity / company context:** Many masters and transactions are **entity-scoped**. Use the header company/entity control to switch operating context when your user has access to more than one entity.

**CFO View** (if shown in your build): Toggles a finance-oriented lens on supported dashboards; use it when reviewing cash and payment-oriented summaries.

### Main navigation

Sidebar items (typical labels):

| Item | What it is for |
|------|----------------|
| **Chanakya Desk** | Operational dashboard / home (`/`, `/dashboard`, `/dashboards`). |
| **My Approvals** | Cross-module approval inbox (`/approvals`). |
| **Create** | Quick-create hub for common new documents (`/create`). |
| **Intake (PR)** | Purchase requisitions: listing, create flows, approvals, PR→PO (`/procurement/pr/...`). |
| **Purchase Orders** | PO list and lifecycle (`/purchase-orders`, related create/update routes). |
| **GRN / SRN** | Goods / service receipt (`/goods-receipt`). |
| **Vendor Advances** | Advance requests, queues, utilization (`/ap/advances` and linked pages). |
| **Invoices** | AP invoices: list, create, detail, AI capture where enabled (`/invoices`). |
| **Debit Notes** | Debit note flows (routed to quick-create / AP in current build). |
| **Payments** | Payments dashboard and related AP payment tools (`/ap/payments`, `/payments-dashboard`). |
| **Vendor Management** | See [Vendor management](#vendor-management). |
| **Masters** | Master data registry and individual master screens (`/masters`). |
| **Workflow Engine** | Workflow management and designer (`/workflow-engine`). |

Use **active highlight** on the sidebar to see where you are; nested items appear under **Vendor Management**.

### Procurement

**Purchase requests (PR)**  
- From **Intake (PR)** you can open **PR listing**, **create** PRs (catalogue, regular, kit, service, asset/capex, blanket, etc.), **my PRs**, **approvals**, **reports**, and **PR→PO conversion**.  
- Follow on-screen required fields; submit sends PRs into approval per your workflow rules.

**Purchase orders (PO)**  
- **Purchase Orders** opens the PO workspace: create from scratch, from PRs, or update existing POs depending on menu entry points.  
- Use filters and row actions as provided on each list screen.

**Goods receipt (GRN / SRN)**  
- **GRN / SRN** supports recording receipt against POs (and related validation).  
- Match quantities and dates to finance and inventory expectations.

### Accounts payable (AP)

**Invoices**  
- Create **PO-based** or **non-PO** invoices where routes exist.  
- **AI / OCR capture** may be available for uploading invoice images.  
- **Approvals** and **ready for payment** views help move invoices through the lifecycle.

**Payments**  
- **Payments** and **Payments dashboard** aggregate payment status.  
- Additional routes (where enabled): payment **proposals**, **batches**, **approval** of batches, **aging**, **bank integration**, **audit trail**, **AI-suggested batches**, **MSME** views.

**Vendor advances**  
- **Vendor Advances** hub links to **requests**, **payment queue**, **utilization**, and the **advance request form**.  
- Use these to request, approve, pay, and track vendor advances.

**Debit notes**  
- Accessed from the sidebar; flows may land on shared **Create** / AP screens—follow labels on the page.

### Vendor management

Under **Vendor Management**:

| Sub-item | Purpose |
|----------|--------|
| **Vendor Governance Desk** | Governance / compliance overview for suppliers. |
| **Invite vendors** | Send invitations and track onboarding. |
| **Vendor Review** | Review submitted vendor data. |
| **Vendor Master** | Approved vendor directory; also reachable via `/vendors` and **Add vendor** (`/add-vendor`). |
| **Portal Users** | Users who access the vendor portal (invite/manage as per screen). |

### Masters

**Masters** (`/masters`) is a **catalog** of master screens. Each tile opens a dedicated master (forms often support **draft**, **submit for approval**, and **approval** modals depending on the master).

Typical tasks:

- Maintain **organizations** (entities, departments, cost/profit centres).  
- Maintain **people and access** (employees, **users**, **roles**, access privilege).  
- Maintain **commercial** data (vendors, payment terms, contracts, tax).  
- Maintain **items** (items, products, SKUs, categories, UOM, attributes like colour/size).  
- Maintain **reference** data (country, state, currency, exchange rates).

See [Master data index](#master-data-index) for routes and names.

**User Master (summary)**  
- Create users linked to **Employee Master**, set system access (login method, password, lock flags, expiry).  
- Assign **entities and roles** per row in the grid; the first row can mirror the default entity when set from employee match; additional rows add more entity/role pairs.

### Workflow engine

**Workflow Engine** (`/workflow-engine`):  
- Manage approval and automation **workflows** for supported document types.  
- **Designer** (`/workflow-engine/designer`): configure steps and participants (replaces older “workflow configurator” entry points that redirect here).

### Other areas

The application also includes many **finance and reporting** routes (e.g. **budget** modules, **CFO / Management / Procurement** desks, **cash flow / R2R**, **AR**, **audit trail**, **settings**). If your role has access, use the **header**, **dashboards**, or **direct URLs** as configured by your administrator.

**Reports** (`/reports`) and paths like `/reports/cfo-desk`, `/reports/management-desk`, `/reports/audit-trail`, etc., provide operational and compliance views where implemented.

---

## Master data index

| Master | Typical route |
|--------|----------------|
| Entity | `/masters/entity-master` |
| Department | `/masters/department-master` |
| Employee | `/masters/employee-master` |
| User | `/masters/user-master` |
| Roles | `/masters/roles-master` |
| Vendor (master list) | `/vendors`, vendor management **master** |
| Vendor payment terms | `/masters/vendor-payment-terms-master` |
| Item | `/masters/item-master` |
| Product | `/masters/product-master` |
| SKU | `/masters/sku-master` |
| Category | `/masters/category-master` |
| Item category | `/masters/item-category-master` |
| UOM | `/masters/uom-master` |
| Tax code | `/masters/tax-code-master` |
| Debit note reason | `/masters/debit-note-reason-master` |
| Cost centre | `/masters/cost-centre-master` |
| Profit centre | `/masters/profit-centre-master` |
| Contract | `/masters/contract-master` |
| Country | `/masters/country-master` |
| State | `/masters/state-master` |
| Currency | `/masters/currency-master` |
| Exchange rate | `/masters/exchange-rate-master` |
| Colour | `/masters/color-master` |
| Size | `/masters/size-master` |
| Approval workflow (legacy entry) | Redirects to `/workflow-engine` |
| Access privilege | `/masters/access-privilege` |
| Workflow configurator (legacy entry) | Redirects to `/workflow-engine/designer` |

---

## Tips & behaviour

- **Approvals:** Pending master changes and documents often use an **approval modal** (approve / reject / request info).  
- **Browser storage:** Parts of the app use **local storage** for demo or offline-first master data; production may use API + database—behaviour depends on deployment.  
- **Roles:** Menu visibility and actions can depend on **role** and **entity**; if a screen is missing, ask an admin to check **Roles Master** and **User Master**.  
- **Universal UI conventions** (forms, two-column grids, buttons): see `docs/universal-ui-rules.md` and `src/components/ui/formTokens.ts` for contributors.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **Cannot log in** | Check credentials; if using API auth, confirm API is running and `VITE_API_BASE_URL` is correct. |
| **`npm run dev` fails** | Ensure port **8787** (API) is free; verify `.env.mysql.local` for the server script. |
| **Blank or error after login** | Open browser dev tools (console/network); confirm API responses and that the user has a valid role/entity. |
| **Master changes not saving** | Check approval status; some masters require **submit** then **approval**. |

---

## Contributing & docs

- **Agent / AI context:** see `AGENTS.md` and `.cursor/rules/procinix-universal-ui.mdc`.  
- **Repository:** private; do not commit secrets (use `.env` / `.env.mysql.local` locally and keep them out of git).

---

*Last updated: aligned with the Subko Coffee navigation and `src/routes.tsx` / `App.tsx` route patterns. Individual screens evolve—if a label or path differs in your build, prefer what you see in the UI.*
