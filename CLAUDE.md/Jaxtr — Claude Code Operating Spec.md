Jaxtr — Claude Code Operating Spec

This is the single source of truth for all Claude Code sessions on this project.
If behavior differs from this document, this document is correct. The implementation is wrong.
Last updated: March 2026


0. Non-Negotiable Dev Rules

1 issue. 1 file. 1 edit. Test. Stop.
Read the file before touching it. Never assume contents.
Fix errors before moving on. Small errors compound fast in this codebase.
Never overwrite a file without reading it first.
Never create a src/ folder. All source lives at root level.
Never batch changes across multiple files in one step.
Wait for confirmation before proceeding to the next step.


1. Project Identity
FieldValueApp nameJaxtr (transitioning from JITB — do not rename files in this build)IndustryMarine repair shop managementReposeanjcouto-lab/jitb-digital-roLocal pathC:\Users\seans\OneDrive\Desktop\JITB 312 835PM LAST ONE\JITB_MASTERSupabase URLhttps://bwsmgcsdgykczcgmrxzp.supabase.coDefault shop ID00000000-0000-0000-0000-000000000001 (must always be a valid UUID)Auth UID (Sean)ed553ec9-30c1-4572-b8c7-4c214c52498bAuth columnauth_user_id (NOT auth_uid — confirmed correct throughout codebase)

2. Tech Stack
LayerTechnologyUIReact 19.2.0 + TypeScript 5.8.2BuildVite 6.2.0Local DBDexie 4.0.7 (IndexedDB)Remote DBSupabase JS 2.99.0 (PostgreSQL + Auth)StylingTailwindCSS via CDN + CSS custom propertiesIconslucide-react 0.577.0TestsVitest 4.1.0 (unit) + Playwright 1.58.2 (E2E)
Environment variables required: VITE_SUPABASE_URL, VITE_SUPABASE_KEY

3. Architecture
Local-First + Async Supabase Sync

All reads and writes hit Dexie first. The UI never waits for Supabase.
Supabase sync is fire-and-forget — no retry, no UI blocking, no rollback on failure.
On app init: loadFromSupabase(shopId) hydrates Dexie, then the app renders from Dexie only.
On every mutation: Dexie updates immediately, syncROToSupabase() runs in the background.
The app is fully functional offline.
Local-first is a competitive differentiator — do not bypass or replace Dexie.

Multi-Tenancy

Every record carries shopId.
All Dexie and Supabase queries are shop-filtered.
shopContextService holds the active shop ID in memory.
Full tenant isolation — no cross-tenant data sharing.

Event-Driven

domainEventService.ts is a pub-sub event bus.
Core events: repair-order:created, repair-order:status-updated, repair-order:completed, inventory:adjusted, inventory:alert
Metrics and notifications are driven by events — never by direct calls.
eventSubscribersService.registerCoreSubscribers() wires all listeners on app init.

Supabase Sync Pattern

Delete-then-insert for all nested RO records (parts, directives, sessions, payments, requests).
Upsert for RO header and vessel DNA.
All domain camelCase fields map to Supabase snake_case.
Timestamps: ms epoch ↔ ISO strings.


4. File Structure
JITB_MASTER/
├── App.tsx                          — Root, auth flow, role routing, data init
├── index.tsx                        — React DOM entry point
├── localDb.ts                       — Dexie schema
├── supabaseClient.ts                — Supabase client
├── types.ts                         — All domain interfaces and enums
├── constants.ts                     — TECHNICIANS, SERVICE_PACKAGES, DEFAULT_SHOP_ID
├── seedData.ts                      — Dev mock data
├── types/
│   └── RepairOrderCreateInput.ts    — Canonical RO creation contract
├── data/
│   ├── roStore.ts                   — RO CRUD + Supabase hydration
│   └── inventoryStore.ts            — Inventory CRUD + makeAlert()
├── services/
│   ├── repairOrderService.ts        — Core RO lifecycle (30+ functions)
│   ├── inventoryService.ts          — Inventory adjustments, clipboard, alerts
│   ├── vesselService.ts             — Vessel DNA CRUD and search
│   ├── partsManagerService.ts       — Oracle search, parts workflows
│   ├── technicianService.ts         — Labor, directives, evidence, requests
│   ├── serviceManagerService.ts     — RO filtering and search
│   ├── supabaseAuthService.ts       — FROZEN — Supabase Auth
│   ├── authService.ts               — Local auth fallback
│   ├── shopContextService.ts        — Active shop ID singleton
│   ├── domainEventService.ts        — Pub-sub event bus
│   ├── eventSubscribersService.ts   — Core event listener registration
│   ├── notificationService.ts       — In-memory notification queue
│   ├── metricsService.ts            — Financial health, AR aging
│   └── [integration/intake services — do not modify]
├── pages/
│   ├── ServiceManagerPage.tsx       — RO queue, search, invoice finalization
│   ├── TechnicianPage.tsx           — Active job, directives, labor clock
│   ├── PartsManagerPage.tsx         — Parts fulfillment, request approval
│   ├── BillingPage.tsx              — Invoice, payment, collections
│   ├── InventoryPage.tsx            — Master inventory (currently read-only)
│   ├── MetricsPage.tsx              — Financial health dashboard
│   ├── AdminPage.tsx                — Config, data export
│   ├── DatabasePage.tsx             — Vessel DNA viewer
│   ├── LoginScreen.tsx              — FROZEN — Supabase Auth login
│   └── UpdatePasswordScreen.tsx     — FROZEN — Password reset
├── components/
│   ├── InvoiceModal.tsx             — Invoice generation, tax, print
│   ├── VesselDNAView.tsx            — Customer/vessel history
│   ├── OracleSearchView.tsx         — Parts and packages search
│   ├── ROGenerationView.tsx         — Multi-step RO creation wizard
│   ├── InventoryImportModal.tsx     — CSV/XLSX bulk import (mounted in PartsManagerPage)
│   └── [other components]
├── utils/
│   ├── supabaseSync.ts              — RO + vessel sync orchestration
│   ├── supabaseMapper.ts            — Domain ↔ Supabase schema translation
│   └── [other utils]
└── tests/                           — All spec files

5. Frozen Files — Do Not Modify
These files are working and must not be touched unless explicitly instructed:

services/supabaseAuthService.ts
pages/LoginScreen.tsx
pages/UpdatePasswordScreen.tsx
App.tsx — only exception is adding a new route


6. Role System
RolePageOwnsSERVICE_MANAGERServiceManagerPageRO creation, tech assignment, hold/resume, invoice finalization, workflow authorityPARTS_MANAGERPartsManagerPageParts fulfillment, request approval, missing/special-order handlingINVENTORY_MANAGERInventoryPageMaster inventory, import, reorder managementTECHNICIANTechnicianPageLabor clock, directives, part usage, evidence, requestsBILLINGBillingPagePayment recording, collectionsDATABASEDatabasePageVessel DNA lookup (read-only)METRICSMetricsPageFinancial health, AR agingADMINAdminPageApp config, data export, role impersonation

7. RO Status Machine (Actual Runtime — Code Is Authoritative)

Note: STAGED, AWAITING_PARTS, and ARCHIVED exist in the enum but are never assigned at runtime. They are dead values.

TransitionFunction→ AUTHORIZED or READY_FOR_TECHcreateRepairOrder() — AUTHORIZED if has parts, READY_FOR_TECH if no partsAUTHORIZED → READY_FOR_TECHassignTechnician() or finalizeAuthorization()READY_FOR_TECH → ACTIVEstartJob()ACTIVE → HOLDholdJob()ACTIVE → PARTS_PENDINGconfirmMissingPart() or addManualPartToRO()ACTIVE → PENDING_INVOICEcompleteJob() or confirmDeferral()HOLD → READY_FOR_TECH or PARTS_PENDINGreactivateJob()PARTS_PENDING → READY_FOR_TECHreactivateJob() when parts resolvedPENDING_INVOICE → COMPLETEDfinalizeInvoice()COMPLETEDTerminal

8. Part Status & Inventory Side Effects
TransitionInventoryClipboard→ IN_BOX-1 (if not custom)none→ USEDnone+1 entry with technicianName→ NOT_USED via confirmPartNotUsed+1 (if not custom)none→ RETURNED+1 (if not custom)noneIN_BOX → REQUIRED (Return to Stock)+1 (if not custom)nonecompleteJob() remaining IN_BOX partsnone-1 each
Clipboard writes happen only at USED. Ordering events never write to clipboard.

9. Inventory — Current State
What exists and works

data/inventoryStore.ts — getAll(), updateQuantity(), makeAlert()
services/inventoryService.ts — filter, low stock, fetch, adjust, clipboard (all functional)
pages/InventoryPage.tsx — read-only table, search, low stock alerts, discrepancy log

What is missing (current build target)

Supabase sync — adjustInventory() writes to Dexie only. Never reaches Supabase. This is the highest priority gap.
Quantity editing UI — service function exists, no UI control wired up
Reorder point editing UI — no UI control
Add new part UI — no create flow on InventoryPage
Import access for INVENTORY_MANAGER — InventoryImportModal exists but is only mounted in PartsManagerPage
Receiving workflow UI — no UI to add stock ad-hoc or against a PO

Inventory business rules

Inventory increases on receiving only
Inventory decreases on use only
Parts are NOT reserved to jobs — linking is for context only
Overrides are allowed but must publish inventory:adjusted event
Pricing edits (cost, MSRP) — INVENTORY_MANAGER and OWNER only
Do not build a reservation system


10. Current Build Target — InventoryPage UI Extensions
Work on pages/InventoryPage.tsx and utils/supabaseSync.ts only unless a change is required in the service layer to support a new UI control. All other files are read-only for this build.
Priority order

Close Supabase sync gap — add syncInventoryToSupabase() to utils/supabaseSync.ts, call it from adjustInventory() fire-and-forget
Quantity edit control — inline or modal, wired to existing updateQuantity()
Reorder point edit control
Add new part form
Import trigger for INVENTORY_MANAGER role
Receiving workflow — calls adjustInventory() with positive delta

Definition of done

syncInventoryToSupabase() exists and is called from adjustInventory()
Inventory hydrated from Supabase on app init
InventoryPage has quantity editing
InventoryPage has reorder point editing
InventoryPage has add new part
INVENTORY_MANAGER can trigger import
Pricing edits are role-gated
All 77 existing Vitest tests still pass — confirm with npx vitest run


11. Out of Scope

Multi-technician per RO (post-pilot)
Reservation system of any kind
Cross-tenant data sharing
Technician-facing inventory UI
Parker AI finalization authority
Billing module changes
Any renaming of files or variables from JITB to Jaxtr in this build


12. Test Suite
Run npx vitest run — 77 tests across 5 files must pass after every change:

tests/repairOrderService.spec.ts
tests/technicianService.spec.ts
tests/inventoryService.spec.ts
tests/partsManagerService.spec.ts
tests/domainEventService.spec.ts

Never proceed to the next file if tests are failing.


## Current Session Progress
Session date: 2026-03-26

### Completed UI changes — pages/ServiceManagerPage.tsx

All changes are purely presentational (className and label text). 77/77 tests pass after each change.

1. **Column header labels** — replaced flat single-line h2 text with two-line structure: large bold title + small muted subtitle span (block, text-[10px], uppercase, tracking-widest, mt-0.5).
2. **Subtitle colors** — each subtitle span uses a faint tinted color matched to its column instead of text-slate-500.
3. **Column container styling** — border, background, shadow, opacity, and brightness adjustments per column.
4. **Missing mb-4** on Staged header fixed.

### Current visual state of each column

| Column | Title | Subtitle | Container className additions |
|--------|-------|----------|-------------------------------|
| Staged | STAGED | Awaiting Assignment (text-blue-400/40) | opacity-90 |
| Parts Dept | PARTS DEPT | Waiting on Parts (text-yellow-400/40) | border-yellow-500/10 |
| Deployment Deck | DEPLOYMENT DECK | In Progress (text-teal-400/40) | border-teal-500/20 brightness-110 |
| On Hold | ON HOLD | Blocked Jobs (text-red-400/40) | border-red-500/20 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)] |
| Billing | BILLING | Ready to Close (text-blue-400/40) | no change from base |

### Remaining spec items not yet built (from current build target — Section 10)

These are the functional gaps listed in CLAUDE.md Section 10, none of which were touched this session:

1. Close Supabase sync gap — add syncInventoryToSupabase() to utils/supabaseSync.ts, call fire-and-forget from adjustInventory()
2. Inventory hydration from Supabase on app init
3. Quantity edit control on InventoryPage
4. Reorder point edit control on InventoryPage
5. Add new part form on InventoryPage
6. Import trigger for INVENTORY_MANAGER role on InventoryPage
7. Receiving workflow (calls adjustInventory() with positive delta)