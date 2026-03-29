# Jaxtr — Claude Code Operating Spec

This is the single source of truth for all Claude Code sessions on this project.
If behavior differs from this document, this document is correct. The implementation is wrong.
Last updated: March 29, 2026

---

## PROJECT IDENTITY

| Field | Value |
|---|---|
| App name | Jaxtr (formerly JITB — do not rename files) |
| Purpose | Marine repair shop management SaaS |
| Owner | Sean (sole developer, owner, director — does not write code himself) |
| GitHub | seanjcouto-lab/jitb-digital-ro (canonical source of truth) |
| Local path | C:\Users\seans\OneDrive\Desktop\JITB 312 835PM LAST ONE\JITB_MASTER |
| Supabase URL | https://bwsmgcsdgykczcgmrxzp.supabase.co |
| Sean's auth_user_id | ed553ec9-30c1-4572-b8c7-4c214c52498b |
| DEFAULT_SHOP_ID | 00000000-0000-0000-0000-000000000001 (must always be a valid UUID) |
| Auth column | auth_user_id — NEVER auth_uid |

---

## STACK

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite |
| Styling | TailwindCSS via CDN + CSS custom properties |
| Icons | lucide-react |
| Local DB | Dexie 4 (IndexedDB) |
| Remote DB | Supabase JS (PostgreSQL + Auth) |
| Tests | Vitest (unit) + Playwright (E2E) |

- No `src/` folder — all source at root level: `pages/`, `components/`, `services/`, `utils/`, `data/`, `types/`
- PWA implemented — offline after first load; sign-in requires network

---

## ARCHITECTURE PRINCIPLES

- **Local-first is the gold standard and primary competitive differentiator.** All reads and writes hit Dexie first. The UI never waits for Supabase.
- **GitHub is canonical.** AI sandboxes are never authoritative. Always work from the confirmed codebase.
- **Supabase is async sync only — never the primary store.** Fire-and-forget. No UI blocking. No rollback on failure.
- On app init: `loadFromSupabase(shopId)` hydrates Dexie, then the app renders from Dexie only.
- On every mutation: Dexie updates immediately, sync runs in the background.
- Every record carries `shopId`. All Dexie and Supabase queries are shop-filtered. Full tenant isolation.
- `domainEventService.ts` is the pub-sub event bus. Metrics and notifications are driven by events — never by direct calls.

---

## FROZEN FILES — NEVER MODIFY WITHOUT EXPLICIT DIRECTION

- `pages/LoginScreen.tsx`
- `pages/UpdatePasswordScreen.tsx`
- `services/supabaseAuthService.ts`

---

## RO STATUS MACHINE (ACTUAL RUNTIME — CODE IS AUTHORITATIVE)

| Transition | Function |
|---|---|
| → AUTHORIZED or READY_FOR_TECH | `createRepairOrder()` — AUTHORIZED if has parts, READY_FOR_TECH if no parts |
| AUTHORIZED → READY_FOR_TECH | `assignTechnician()` or `finalizeAuthorization()` |
| READY_FOR_TECH → ACTIVE | `startJob()` |
| ACTIVE → HOLD | `holdJob()` |
| ACTIVE → PARTS_PENDING | `confirmMissingPart()` or `addManualPartToRO()` |
| ACTIVE → PENDING_INVOICE | `completeJob()` or `confirmDeferral()` |
| HOLD → READY_FOR_TECH or PARTS_PENDING | `reactivateJob()` |
| PARTS_PENDING → READY_FOR_TECH | `reactivateJob()` when parts resolved |
| PENDING_INVOICE → COMPLETED | `finalizeInvoice()` |
| COMPLETED | Terminal |

**Dead statuses** — exist in enum but are never assigned at runtime: `STAGED`, `AWAITING_PARTS`, `QUEUED_FOR_TECH`

---

## FILE LOCATIONS (CONFIRMED)

| File | Location |
|---|---|
| `roStore.ts` | `data/` — NOT `services/` |
| `inventoryStore.ts` | `data/` |
| `supabaseSync.ts` | `utils/` |
| `supabaseMapper.ts` | `utils/` |
| `RepairOrderCreateInput.ts` | `types/` |

---

## DEMO PERSONAS (DEV ONLY)

Danny (SM), Pierre (Tech), Mike (Admin/Owner) — used in dev login shortcuts and Playwright tests.

---

## CURRENT BUILD STATE (MARCH 29 2026)

- **77 Playwright tests passing, 2 skipped**
- 2 skipped: `parts.workflow` tests — need dedicated test `shop_id` in Supabase with controlled inventory seeding
- Playwright MUST run before and after every change — no exceptions
- All work on `develop` branch — PRs to `main` when stable

### Completed this session (March 29 2026 — full day)

- **Subscription gating**: `active`, `pilot`, `trial`, `grace` allowed — `null` passes through (no shop record in test env). Lives in `App.tsx` + `services/shopContextService.ts`
- **Naming cleanup**: "New Service Profile Onboarding" → "New Customer", "Initialize Profile" → "New Customer" — 6 files updated including 3 Playwright tests
- **Home button**: SVG house icon in dev toolbar pill — resets to native role via `setImpersonatedRole(null)`. Lives in `App.tsx`
- **Staged cards: HOLD removed from collapsed view** — ASSIGN TECH only when collapsed; HOLD still in expanded view
- **Engine identity block on expanded cards**: Engine year/make/model + S/N front and center at top of RODetail. `pages/ServiceManagerPage.tsx`
- **Deployment deck button hierarchy**: REVIEW dominant (solid red) when pending requests present; HOLD dimmed (`opacity-70`)
- **Tech queue view**: `queuedROsForTech` in `App.tsx` — READY_FOR_TECH jobs assigned to current tech, not active. "Your Queue" section in `TechnicianPage.tsx` — read-only expand, Start Job when no active job
- **SM board: folder tab column counters**: `FolderTab` component — colored top border, fixed `w-[64px]`, `text-[20px]` count, flush to card top. Colors: blue/amber/teal/red/purple per column
- **Collapsible Customer Search**: Slim by default, expands on click, collapses after selection. `searchExpanded` state in `ServiceManagerPage.tsx`. Playwright tests updated
- **Calendar Phase 1**: `scheduledDate` + `arrivalDate` added to `types.ts`, Dexie schema bumped to v9, `supabaseMapper.ts` forward-mapped, `repair_orders` Supabase table columns added

### Next session queue (priority order)

1. Date picker in `ROGenerationView` + `ProfileOnboardingForm`
2. Scheduled date on SM cards
3. Calendar week view build
4. Calendar month view
5. Vercel deployment
6. Left sidebar nav (post-pilot)

---

## WHAT IS BUILT AND LIVE

- Full RO lifecycle: intake → parts → tech → billing → collections
- Service Manager command center: RO queue, age-based tinting (12h yellow / 24h amber / 48h red), parts-pending badge, manual part add with qty input, technician assignment, invoice finalization
- Parts Manager fulfillment workflow: REQUIRED → IN_BOX, MISSING, SPECIAL_ORDER; request approval; requisition printing; inventory import
- Technician work execution: directive completion, evidence capture (photo/video/audio/dictation), halt/hold, editable part quantity, job finalization
- Billing and collections escalation: NONE → REMINDER_SENT → PHONE_CALL_SCHEDULED → FINAL_NOTICE → IN_COLLECTIONS
- Inventory page: read-only table, search, low stock alerts, discrepancy log, CSV/Excel import
- Vessel DNA history viewer
- PWA: service worker (`public/sw.js`), manifest (`public/manifest.json`), offline app shell
- Supabase sync: `repair_orders`, `master_inventory`, `vessel_dna_history`
- `subscription_status` field on `shops` table (TEXT NOT NULL DEFAULT 'active') — **active gating in App.tsx**: `active`, `pilot`, `trial`, `grace` allowed; anything else shows "Account Not Active" screen; `null` passes through
- `quantity` field on `Part` interface — threads through RO creation, PM display, Tech display, invoice math (unit price × quantity)
- Signature canvas on RO creation (initialized via `requestAnimationFrame` to handle modal layout timing)

---

## WHAT IS SCAFFOLDED BUT NOT CONNECTED

**Parker AI intake cluster** — 7 services fully built and tested, zero runtime wires to UI or App.tsx:

- `services/intakeSessionService.ts`
- `services/intakeWorkflowService.ts`
- `services/parkerAdapterService.ts`
- `services/vapiAdapterService.ts`
- `services/integrationGatewayService.ts`
- `services/promptOrchestrationService.ts`
- `services/answerInterpretationService.ts`

`integrationGatewayService` is the designed entry point when Parker is connected. Do not wire these without explicit direction.

---

## WHAT DOES NOT EXIST YET

- Inventory Module V1 (ledger, purchase orders, receiving, POS — spec locked, nothing built)
- Stripe billing integration
- Automated tenant onboarding
- Git branch strategy (currently all on main)
- Offline sign-in: `restoreSession()` re-fetches from Supabase every time — fails offline even with valid JWT. Fix: cache `LoggedInUser` in localStorage. Blocked on frozen `supabaseAuthService.ts` — requires explicit direction.

---

## ENHANCEMENT BACKLOG (CONFIRMED, UNBUILT)

1. Multiple vessels per customer
2. Dual/triple engine support per vessel
3. ~~Home button — persistent navigation escape hatch~~ **DONE** (dev toolbar SVG house icon)
4. ~~Terminology cleanup — remove "Oracle" / AI labels, replace with plain shop language~~ **DONE**
5. ~~Tech queue view — assigned but not active jobs, expandable scope of work~~ **DONE**
6. Company name field on customer profile
7. Engine hours, engine type (outboard/inboard), fuel type (gas/diesel) on vessel
8. ~~Subscription gating via `subscription_status` field~~ **DONE**
9. Stripe in-app billing (post-pilot)
10. Quantity display styling pass — currently amber text, needs to be larger/bolder

---

## WORKFLOW RULES (NON-NEGOTIABLE)

0. At the start of every session, run: git branch --show-current — confirm you are on develop before touching any file. If on main, run: git checkout develop before proceeding.
1. One change per step
2. One file per command block
3. No batching — no splitting instructions across multiple blocks
4. Every command block must be complete and copy-paste ready
5. Always specify exact file paths — no `src/` prefix
6. Wait for explicit confirmation before next step
7. Never make independent decisions or move ahead
8. **Playwright runs before and after every change — NO EXCEPTIONS**
9. Stop after 2 failed attempts and change strategy
10. Never have Sean find code manually — use grep/read commands
11. Read before writing — always read the file before editing it
12. Stop immediately when Sean starts talking

---

## AGENT ROLES

| Agent | Responsibility |
|---|---|
| Claude (claude.ai) | Reasons, diagnoses, writes code and CC prompts |
| Claude Code (CC) | Executes all file operations and code changes |
| Sean | Relays instructions, makes all final decisions, reports results exactly as seen |

---

## CRITICAL PAST FAILURES — NEVER REPEAT

- Playwright existed for the entire project and was never identified — cost 2+ weeks of manual testing
- AI Studio corrupted `auth_uid` column name, breaking auth (`auth_user_id` is correct throughout)
- Had Sean finding specific code lines manually for weeks — always use grep/read
- Failed to stop loops early enough — always stop at 2 failed attempts and change strategy
- Edited files without reading them first, causing overwrites and merge conflicts

---

## COMPETITORS

Wallace DMS, Nautical Software, DockMaster, Digital Wrench, DealerRock

ServiceTitan and Housecall Pro are NOT marine competitors — never reference them as such.

---

## BRAND

| Element | Value |
|---|---|
| Primary Navy | #0A1726 |
| Marine Gold | #D8A24A |
| PWA name | Jaxtr |
| Logo (header) | OPTIONAL_LOGO.png |
| Logo (invoice print) | PRIMARY_LOGO.png |
| Favicon | ICON.png |

---

## MARKETING — OFFLINE EXPLANATION (SAVE FOR CUSTOMER USE)

> "The first time you open Jaxtr, it downloads itself onto your device automatically. After that it lives there — just like an app you downloaded from the App Store. No internet required to run it. If you're connected, it syncs your data to the cloud. If you're not, you keep working and it syncs when you're back online. Nothing to install, nothing to maintain, nothing to lose."
