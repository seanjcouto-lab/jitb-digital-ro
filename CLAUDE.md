# Jaxtr — Claude Code Operating Spec

This is the single source of truth for all Claude Code sessions on this project.
If behavior differs from this document, this document is correct. The implementation is wrong.
Last updated: April 2, 2026

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
- **Scale target: 300-400 customers, multiple boats per customer, municipal + corporate boats.** The architecture must handle this volume without performance degradation.

---

## FROZEN FILES — NEVER MODIFY WITHOUT EXPLICIT DIRECTION

- `pages/LoginScreen.tsx` — dev persona buttons were explicitly updated April 1 2026 (named → anonymous). Now re-frozen.
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
| ACTIVE → PARTS_PENDING | `confirmMissingPart()` or SM "Send to Parts" button |
| ACTIVE → PENDING_INVOICE | `completeJob()` or `confirmDeferral()` |
| HOLD → READY_FOR_TECH or PARTS_PENDING | `reactivateJob()` |
| PARTS_PENDING → READY_FOR_TECH | `reactivateJob()` when parts resolved |
| PENDING_INVOICE → COMPLETED | `finalizeInvoice()` |
| COMPLETED | Terminal |

**Dead statuses** — exist in enum but are never assigned at runtime: `STAGED`, `AWAITING_PARTS`, `QUEUED_FOR_TECH`

---

## SM BOARD COLUMN MAPPING (ServiceManagerPage.tsx)

| Column | Statuses | Extra Filter | Heading |
|---|---|---|---|
| STAGED | READY_FOR_TECH, PARTS_READY | `!ro.technicianId` | STAGED |
| PARTS DEPT | AUTHORIZED, PARTS_PENDING | — | PARTS DEPT |
| DEPLOYMENT DECK | ACTIVE, READY_FOR_TECH, PARTS_READY, PARTS_PENDING | `!!ro.technicianId` | DEPLOYMENT DECK |
| ON HOLD | HOLD | — | ON HOLD |
| BILLING | PENDING_INVOICE, COMPLETED | `paymentStatus !== PAID` | BILLING |

**Vessel DNA records are only created during `finalizeInvoice()`, NOT at RO creation.** Tests that check DNA after `createBasicRO` will find no records.

---

## FILE LOCATIONS (CONFIRMED)

| File | Location |
|---|---|
| `roStore.ts` | `data/` — NOT `services/` |
| `inventoryStore.ts` | `data/` |
| `supabaseSync.ts` | `utils/` |
| `supabaseMapper.ts` | `utils/` |
| `RepairOrderCreateInput.ts` | `types/` |
| `demo-helpers.ts` | `tests/` |
| `demo.spec.ts` | `tests/` |
| `jaxtr.spec.ts` | `tests/` |
| `DockCalendarPage.tsx` | `pages/` |
| `CalendarEventCard.tsx` | `components/` |
| `calendarUtils.ts` | `utils/` |

---

## DEMO PERSONAS (DEV ONLY)

Three anonymous test personas — dev login buttons in `pages/LoginScreen.tsx`, visible only when `import.meta.env.DEV` is true, stripped from production builds:

- **Test SM** — `id: 'dev-sm'`, role: `SERVICE_MANAGER`, `privileges: [UserPrivilege.DEVELOPER]`, `shopId: DEFAULT_SHOP_ID` — DEVELOPER privilege required so `isDev()` returns true and dev toolbar renders
- **Test Tech** — `id: 'dev-tech'`, role: `TECHNICIAN`, `privileges: []`, `shopId: DEFAULT_SHOP_ID`, `techId: 'tech-1'`
- **Test Parts** — `id: 'dev-parts'`, role: `PARTS_MANAGER`, `privileges: []`, `shopId: DEFAULT_SHOP_ID`

No Admin persona exists in dev buttons. No named staff personas (Danny, Pierre) — replaced April 1 2026.
All Playwright tests reference these button labels: `'Test SM'`, `'Test Tech'`, `'Test Parts'`.

---

## CURRENT BUILD STATE (APRIL 3 2026)

- **Test suite: 122 passed, 0 failed, 8 skipped** — `tests/jaxtr.spec.ts`. Stable, deterministic. Runs in ~2.5 min parallel.
- **Demo script: 4:30 timed walkthrough** — `tests/demo.spec.ts`, runs headed, 11 scenes. Run: `npx playwright test tests/demo.spec.ts --headed --project=chromium`
- **`main` branch** — live on Vercel, manually tested, stable. Merged April 2 evening.
- **`develop` branch** — all new work. 12 commits ahead of main (calendar + media + P1-P4 fixes).
- Playwright MUST run before and after every change — no exceptions
- All work on `develop` branch — PRs to `main` when stable

### Completed this session (April 3 2026 — evening)

- **P1: SM Board column internal scroll** — 5 card-list divs in ServiceManagerPage get `max-h-[75vh] overflow-y-auto`. Shows ~3 cards, rest scroll. Custom scrollbar from index.html auto-applies. Outer div keeps `overflow-visible` for FolderTab badge.
- **P2: Part quantity auto-select** — `onFocus={e => e.target.select()}` added to all 4 quantity inputs (SM, ROGeneration, Tech, PM). Click input → "1" auto-selects → type new value immediately.
- **P3: Calendar modal mobile responsive** — backdrop `p-2 sm:p-4`, modal `p-3 sm:p-6`, `max-w-[calc(100vw-1rem)] sm:max-w-lg`, `max-h-[85vh] sm:max-h-[90vh]`. Desktop unchanged via `sm:` breakpoints.
- **P4: Calendar manual date/time edit** — `<input type="datetime-local">` replaces read-only date spans in calendar detail modal. SM/Admin see editable inputs; other roles see read-only text. Empty date inputs shown when no date set yet. onChange mirrors handleDrop pattern (freshRO lookup, onUpdateRO, setSelectedRO).
- **Date off-by-one bug FIXED** — `calendarUtils.ts` and `DockCalendarPage.tsx` were using `.slice(0, 10)` on ISO strings to extract dates — that's UTC, not local. When a user in EDT picks 8pm April 6, it stores as midnight April 7 UTC, then `slice(0,10)` returns "2026-04-07". Fixed all 6 occurrences to use `toDateKey(new Date(val))` which uses local `getDate()`.
- **Calendar gridlines visible** — All `border-white/5` (invisible) and `border-white/10` bumped to `border-slate-600` across DockCalendarPage. Dark background preserved, lines now clearly visible.
- **White calendar attempted and reverted** — Sean requested white bg, looked bad against dark app shell. Reverted to dark + visible gridlines approach.
- **Test suite stable at 122/0/8** through all changes — zero regressions

### Sean's manual testing feedback (April 3)

| # | Issue | Status | Priority |
|---|-------|--------|----------|
| P1 | SM Board columns need internal scroll | **DONE** (75vh) | High |
| P2 | Part quantity input — "1" default hard to overwrite | **DONE** (onFocus select) | High |
| P3 | Calendar modal mobile overflow | **DONE** (responsive breakpoints) | High |
| P4 | Calendar manual date/time edit (not just drag) | **DONE** (datetime-local inputs) | High |
| P5 | Month view grids disappear during drag | Open | Medium |
| P6 | Invoice — add customer name + vessel + engine info | Open | Medium |
| P7 | Tech minimize active job to see held/queued | Open | Medium |
| P8 | Rename "Log Requisition" to clearer label | Open | Small |
| P9 | Remove redundant serial from tech header | Open | Small |
| P10 | Audio record icon wrong | Open | Small |
| P11 | Calendar mobile/vertical overflow | Open | Medium |
| P12 | Month view landscape optimization | Open | Medium |
| P13 | Laptop file input opens gallery not camera | Open | Small |

### Completed earlier this session (April 3 2026)

- **Dock Scheduling Calendar — Phase 1 + Phase 2 built:**
  - `estimatedPickupDate` and `jobCategory` fields on RepairOrder, Dexie v10
  - `JobCategory` interface + `dockCapacity`/`boardLeadTimeDays` on AppConfig
  - `CALENDAR` added to UserRole enum — toolbar button with calendar icon
  - Full data pipeline: types → RepairOrderCreateInput → createRepairOrder() → supabaseMapper → roStore
  - "Dock Scheduling" section on ROGenerationView: job category dropdown (10 defaults), required drop-off date
  - Drop-off/pick-up dates + job category displayed on SM board cards (blue DROP, green PICK)
  - **Board date gate**: ROs with arrivalDate >14 days out are calendar-only, invisible on the board
  - **DockCalendarPage**: week, day, month views — TSheets-style grid
  - Week view: 7-column grid, hourly slots, color-coded CalendarEventCards by job category
  - Day view: Arriving/Departing swim lanes with dock count
  - Month view: per-day count badges, click-through to day view
  - HTML5 drag-and-drop rescheduling (SM/Admin only, read-only for others)
  - "Boats on dock" counter in calendar header
  - **Post-RO redirect**: when SM creates RO with dates, lands on calendar as confirmation
  - **Pick-up date at billing**: PENDING_INVOICE cards in BILLING column show date picker for estimated pick-up
  - `calendarUtils.ts`: getWeekDays, getMonthDays, getBoatsOnDock, getDayCounts, groupROsByDate, etc.
- **Test suite stable at 122/0/8** through all changes — zero regressions
- **Evidence Media Persistence (PILOT-CRITICAL) — Phases 1-3A built:**
  - `MediaRecord` interface + Dexie `mediaStore` table (v10→v11) — stores blobs natively in IndexedDB
  - `services/mediaService.ts` — saveMedia(), getMediaUrl(), getPendingMedia(), cleanupSyncedMedia()
  - `media://{uuid}` URL protocol — permanent reference that resolves from Dexie or Supabase URL
  - TechnicianPage: EvidenceModal passes raw Blob + mimeType, saved to mediaStore immediately
  - ROGenerationView: pendingAttachments pattern — blobs held in state, persisted when RO is created
  - Audio recording preserved on both intake and tech pages
  - `hooks/useMediaUrl.ts` — React hook resolving media:// URLs for rendering, auto-cleans blob URLs
  - `capture="environment"` on photo/video file inputs — opens device camera directly (mobile)
  - **Media now survives page reloads** — the core fix. Previously blob URLs died on refresh.
- **Calendar detail modal enhanced:** full vessel + engine identity, directive list, parts list, inline add directives/parts
- **Month view:** clickable customer name mini-cards, drag-and-drop between days
- **Supabase columns added:** `estimated_pickup_date` + `job_category` on `repair_orders` table
- **`develop` merged to `main`** — calendar shipped to Vercel production

### Sean's manual testing feedback (April 3 — to fix next session)

| # | Issue | Priority |
|---|-------|----------|
| P1 | SM Board columns need internal scroll (3-4 cards visible, rest scroll) | High |
| P2 | Part quantity input — "1" default hard to overwrite | High |
| P3 | Calendar modal mobile overflow | High |
| P4 | Calendar manual date/time edit (not just drag) | High |
| P5 | Month view grids disappear during drag | Medium |
| P6 | Invoice — add customer name + vessel + engine info | Medium |
| P7 | Tech minimize active job to see held/queued | Medium |
| P8 | Rename "Log Requisition" to clearer label | Small |
| P9 | Remove redundant serial from tech header | Small |
| P10 | Audio record icon wrong | Small |
| P11 | Calendar mobile/vertical overflow | Medium |
| P12 | Month view landscape optimization | Medium |
| P13 | Laptop file input opens gallery not camera (capture attr may not work on desktop) | Small |

### Evidence media — remaining phases (not yet built)

- **Phase 3B**: Evidence visible on SM expanded cards + Vessel DNA history
- **Phase 4**: Supabase Storage sync (needs `evidence` bucket created in dashboard)
- **Phase 5**: Evidence in supabaseMapper + roStore hydration (needs `directive_evidence` table)

### Completed this session (April 2 2026)

- **Admin gate applied**: `pages/AdminPage.tsx` — role-based gate (`UserRole.ADMIN`). Non-admin users see "Access Denied". Sean's Supabase login maps to ADMIN role via `supabaseAuthService.ts` line 23. `loggedInUser` prop passed from `App.tsx` line 295.
- **Test suite: 45 → 115 passed** (70 tests recovered). Fix patterns:
  - `#customerName` selector replaces `input.first()` — Company Name field was added before Full Name, shifting input order (13 occurrences)
  - `button:has-text("Pierre")` replaces `.grid button` — modal overlay intercepted pointer events (58 occurrences)
  - `getByRole('heading', { name: /BILLING/i })` replaces `text=BILLING` — strict mode from "Billing queue clear" text
  - `.or()` chains replace comma-separated selectors — Playwright interprets commas as CSS, not OR (14 instances)
  - `button[title="SERVICE MANAGER"]` replaces `button[title="SERVICE_MANAGER"]` — toolbar generates spaces via `roleKey.replace('_', ' ')`
  - `.first()` added to `.or()` chains resolving to multiple elements
  - `textarea[placeholder*="Waiting on special tool"]` for halt modal targeting
  - `button:has-text("Add").first()` not `.last()` for directive requests (two Add buttons on tech page)
  - DNA tests: search step added since page requires query (no auto-list)
  - Persistence test timeouts increased to 60s
- **Init performance: N+1 query eliminated in `loadFromSupabase`**: Previously ran 5 Supabase queries per RO inside a for loop (136 ROs × 5 = 680 queries). Now bulk-fetches all child records in 5 parallel queries using `.in('repair_order_id', allIds)`, groups client-side with hash map. Total: 6 queries. **15s+ init → ~2s.**
- **Demo script created**: `tests/demo.spec.ts` + `tests/demo-helpers.ts` — 4:30 timed walkthrough, 11 scenes, pre-seeds 6 ROs across all 5 columns, fills complete onboarding form with visible typing, human-like cursor movement.
- **Dev-only Supabase purge button**: `pages/AdminPage.tsx` — "Purge All Supabase + Local Data" in Diagnostic Tools section. `import.meta.env.DEV` gated, two-click confirm, deletes all ROs + children for DEFAULT_SHOP_ID + clears local IndexedDB. Does NOT touch users, shops, auth, or inventory tables.

### Critical lessons learned — DO NOT REPEAT

- **The engineHours saga (April 1)**: Piecemeal diagnosis cost 3+ hours. Always trace the full field chain (form → merge → type → service → mapper → store → display) before patching.
- **N+1 query in loadFromSupabase**: Per-RO child fetches (5 queries × N ROs) caused 15s+ init. Always bulk-fetch with `.in()` and group client-side. **Never put Supabase queries inside a for loop.**
- **Supabase sync contaminates tests**: `loadFromSupabase` loads stale ROs from prior test runs, causing tech workflow tests to see wrong active jobs. **All test login helpers must call `blockSupabaseSync(page)` before navigating.** This intercepts Supabase REST API calls with empty `[]` responses so tests run purely against local IndexedDB. This was the root cause of 10+ tech workflow failures.
- **Comma-separated Playwright selectors don't work**: `page.locator('text=A, text=B')` is CSS syntax, not OR. Use `.or()` chains: `page.locator('text=A').or(page.locator('text=B'))`.
- **`input.first()` is fragile**: When form fields get added/reordered, ordinal selectors break silently. Always use `#id` or `[placeholder*="..."]` selectors.
- **Customer names resolve to multiple elements**: The SM board renders customer names in card title, RO detail line, expanded view, etc. Always use `.first()` or `getByText(name, { exact: true })`.
- **Test ROs sync to Supabase and accumulate**: Every test run creates ROs that sync in the background. Without cleanup, Supabase fills with ghost data (286 rows after a few sessions). Use the purge button between heavy test sessions.
- **Toolbar button titles use spaces not underscores**: `roleKey.replace('_', ' ')` generates "SERVICE MANAGER", "PARTS MANAGER", "INVENTORY MANAGER". Exception: DATABASE → "Vessel DNA".
- **`loadFromSupabase` merges, does not wipe**: Local-only Dexie records survive Supabase hydration. But `initDb(null)` clears React state (not Dexie). Dev re-login re-runs `initDb` which re-hydrates from Supabase + Dexie.
- **`addManualPartToRO()` does NOT change RO status**: It only adds a part with REQUIRED status. To move an RO to PARTS_PENDING, SM must click "Send to Parts" or tech must call `confirmMissingPart()`.
- **Calendar UTC date off-by-one**: `.slice(0, 10)` on ISO strings extracts the UTC date, NOT local. In US Eastern timezone, 8pm local = midnight UTC next day. Always use `toDateKey(new Date(val))` (which calls local `getDate()`) instead of `isoString.slice(0, 10)`. Six occurrences fixed across `calendarUtils.ts` and `DockCalendarPage.tsx`.
- **White backgrounds don't work in dark apps**: Sean requested white calendar bg, it clashed badly with the navy app shell. The real problem was invisible gridlines (`border-white/5` = 5% opacity). Fixed by boosting to `border-slate-600` while keeping dark backgrounds.

### Known remaining test failures

None. All 122 tests pass deterministically. 8 tests remain skipped (see below).

### Skipped tests in jaxtr.spec.ts (8 total)

T74, T75, T76, T77, T78 — Parts workflow tests requiring seeded inventory in a dedicated test shop
T89, T90 — Billing disputed/collections tests requiring full billing flow
T112 — Offline/PWA test requiring service worker

### Completed this session (April 2 2026 — evening)

- **Test suite: 100 → 122 passed, 22 → 0 failures eliminated.** Three root causes:
  - `blockSupabaseSync()` helper added to all login functions — intercepts Supabase REST API with empty `[]` responses, preventing stale ROs from prior runs contaminating test state. This was the #1 cause of tech workflow failures.
  - Systematic `.first()` on ~25 customer name locators — strict mode violations from names rendering in multiple card elements.
  - T64 fix: accept Active Bay Deck as valid outcome (app auto-starts first queued job when tech enters view).
  - T105 fix: accept "Oracle finds no existing match" (DNA only created at `finalizeInvoice()`).
  - `workers: 4` cap prevents browser resource exhaustion on parallel runs.
- **CLAUDE.md spec correction**: `addManualPartToRO()` does NOT set PARTS_PENDING — only adds part with REQUIRED status. SM "Send to Parts" button or `confirmMissingPart()` are the actual PARTS_PENDING triggers.
- **Parts flow audit**: Full trace confirmed all parts plumbing works correctly. PARTS DEPT column is empty in tests only because `createBasicRO()` never adds parts — not a code bug.

### Completed previous sessions

**April 1 2026 (evening):**
- Dev persona overhaul, Test SM DEVELOPER privilege, old spec files deleted, new 130-test suite created
- EngineIdentityLine component, engineHours wired end to end
- Admin gate implemented then reverted (re-applied April 2)

**March 30 2026:**
- Subscription gating, naming cleanup, home button, staged cards HOLD removed from collapsed view
- Engine identity on expanded cards, deployment deck button hierarchy, tech queue view
- SM board folder tab column counters, collapsible customer search
- Calendar Phase 1: scheduledDate + arrivalDate fields

### Next session queue (priority order)

1. **Remaining feedback P5-P13** — see table above. P5/P6/P7/P11/P12 are medium priority.
2. **Merge `develop` → `main`** — calendar + all fixes ready for production push
3. **Dock capacity config** — Admin page: target capacity input, visual warnings on calendar
4. **Job category admin UI** — Admin page: add/edit/delete categories with color picker (currently hardcoded defaults)
5. **Demo polish** — add Parts Manager scene, add calendar walkthrough scene
6. **Unskip parts workflow tests (T74-T78)** — parts plumbing confirmed working, tests need seeded inventory
7. **In-app notifications** — bell icon, pick-up reminders, dock capacity alerts
8. Left sidebar nav (post-pilot)

### Backlog

- **Clear Supabase test data button** — DONE (dev-only purge on AdminPage)
- **Calendar personal entries** — days off, meetings, etc. New data model (CalendarEvent separate from RO). Any role creates, SM sees all. Post-pilot.
- **Nav sticky on all pages + role-specific icons**: Tech: Tech/DNA/Calendar | SM: Dock/NewRO/Parts/DNA/Calendar | PM: Parts/Inventory/DNA | Owner: all except dev tools
- **Mobile button overlap** — buttons overlapping on small screens, needs audit and fix
- **Customer directory** — master list view of all customers
- **Customer CSV import** — bulk import customers from CSV
- **Media audit** — DONE (Phase 1-3A built: Dexie mediaStore, media:// protocol, useMediaUrl hook)
- **Vessel DNA boat image** — confirm purpose of boat image field or remove it

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
- Admin gate on AdminPage — role-based (`UserRole.ADMIN`), non-admin sees "Access Denied"
- Dev-only Supabase purge button on AdminPage — `import.meta.env.DEV` gated, two-click confirm
- Headed Playwright demo script — 4:30 timed walkthrough, 11 scenes, pre-seeded data across all 5 columns
- **Dock Scheduling Calendar** — week/day/month views, color-coded by job category, drag-and-drop rescheduling (SM/Admin), "boats on dock" counter, post-RO-creation redirect, pick-up date entry at billing. Board date gate: ROs >14 days out are calendar-only. 10 default job categories (Repower, 100hr Service, etc.) with per-shop config planned.

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
- Git branch strategy (currently `develop` for work, `main` for production via Vercel)
- Offline sign-in: `restoreSession()` re-fetches from Supabase every time — fails offline even with valid JWT. Fix: cache `LoggedInUser` in localStorage. Blocked on frozen `supabaseAuthService.ts` — requires explicit direction.

---

## ENHANCEMENT BACKLOG (CONFIRMED, UNBUILT)

1. Multiple vessels per customer
2. Dual/triple engine support per vessel
3. ~~Home button — persistent navigation escape hatch~~ **DONE** (dev toolbar SVG house icon)
4. ~~Terminology cleanup — remove "Oracle" / AI labels, replace with plain shop language~~ **DONE**
5. ~~Tech queue view — assigned but not active jobs, expandable scope of work~~ **DONE**
6. ~~Company name field on customer profile~~ **DONE** (added to ProfileOnboardingForm)
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
13. **Never put Supabase queries inside a for loop** — always bulk-fetch with `.in()` and group client-side
14. **Always use `.first()` on customer name locators in tests** — names render in multiple places on SM board cards
15. **All test login helpers must call `blockSupabaseSync(page)`** — prevents stale Supabase data from contaminating test state

---

## AGENT ROLES

**Current model (confirmed April 2 2026):** Sean works directly with Claude Code. No relay through claude.ai.

| Agent | Responsibility |
|---|---|
| Claude Code | Reasons, diagnoses, and executes — full chain ownership |
| Sean | Gives direction, makes all final decisions, approves before commits |

The previous relay model (Claude outside → Sean → CC) was retired after it caused the 3-hour engineHours saga. Direct collaboration is faster, cleaner, and produces fewer gaps.

---

## CRITICAL PAST FAILURES — NEVER REPEAT

- Playwright existed for the entire project and was never identified — cost 2+ weeks of manual testing
- AI Studio corrupted `auth_uid` column name, breaking auth (`auth_user_id` is correct throughout)
- Had Sean finding specific code lines manually for weeks — always use grep/read
- Failed to stop loops early enough — always stop at 2 failed attempts and change strategy
- Edited files without reading them first, causing overwrites and merge conflicts
- **N+1 query in loadFromSupabase** — per-RO child fetches (5 queries × 136 ROs = 680 queries) caused 15s+ init. Fixed April 2 with bulk `.in()` fetch.
- **Comma-separated Playwright selectors** — `'text=A, text=B'` is CSS syntax, not OR. Use `.or()` chains.
- **Test RO accumulation in Supabase** — 286 ghost ROs after a few test sessions. Use purge button between heavy sessions.
- **Supabase sync contaminated tests for weeks** — `loadFromSupabase` loaded stale ROs from prior runs, making tech workflow tests see wrong active jobs. Fixed April 2 evening with `blockSupabaseSync()` in all login helpers. All tests must block Supabase REST API.

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
