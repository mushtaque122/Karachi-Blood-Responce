# Karachi App — Blood Response System
## Architecture (v0.1 — Foundation Phase)

## 1. Status
Repository `mushtaque122/Blood-Response-App` is currently empty (README only).
This is a **greenfield build**, not an extension of an existing system —
Phase 1's "audit existing app" step does not apply. Build starts fresh
from this document.

## 2. Scope reality check
The original spec describes a ~$50K, 27-phase production healthcare
platform (11 roles, AI agent with tool-calling, matching engine,
multi-channel notifications, hospital/blood-bank dashboards, full
CI/CD, security audit, legal/privacy review). That is genuinely months
of work for a team. This build proceeds **incrementally, in real
phases**, each one runnable and committable, rather than attempting
the whole spec in one pass. Nothing here should be treated as a
finished "production-ready" system until each phase has actually been
tested and reviewed.

## 3. Stack
- **Mobile app:** React Native (Expo)
- **Backend API:** FastAPI (Python), async via Motor (MongoDB driver)
- **Database:** MongoDB (Atlas for hosted envs)
- **Auth:** JWT access/refresh tokens, bcrypt password hashing
- **Hosting (planned, free-tier friendly):** Railway/Render (API) +
  MongoDB Atlas + Expo EAS (mobile builds)

## 4. Modules — build order
1. User Management + RBAC ✅ delivered
2. Blood Donor Management ✅ delivered
3. Blood Request Management ✅ delivered
4. Emergency Blood Response — folded into the matching engine below (see §9); a dedicated live dashboard is still pending
5. Smart Matching Engine ✅ delivered (compatibility + eligibility + availability + city/emergency scoring)
6. Hospital Management ✅ delivered (register, public verified-only listing, admin verification)
7. Blood Bank Management ✅ delivered (register, verification, unit-level inventory, public aggregate summary)
8. Notification Engine ✅ delivered — real in-app delivery wired into the matching engine; SMS/email are real, documented provider interfaces that honestly report FAILED when uncredentialed (see §11)
9. Location & Maps ✅ delivered — real haversine distance + naive ETA replace the city-string proxy wherever both sides have coordinates (see §12)
10. AI Agent ✅ delivered — guardrailed, tool-calling only, allowlisted tools, drafts-only, fully audit-logged (see §13)
11. Admin Dashboard + Analytics ✅ delivered — real aggregate queries, no fabricated numbers (see §14)
12. General Audit Logs ✅ delivered — every staff/admin mutating action logged (see §15)
13. Security Hardening ✅ delivered (partial, honestly scoped) — account lockout, real TOTP MFA, security headers, rate limiting (see §16)
14. CI/CD + Deployment config ✅ delivered, written but unbuilt here (see §17)
4. Emergency Blood Response — later
5. Matching Engine — later
6. Notification Engine — later
7. Hospital / Blood Bank dashboards — later
8. AI Agent (tool-calling, guardrailed) — later
9. Admin dashboard, analytics, audit logs — later

Each later module will be delivered the same way: working code +
doc update + note on what was tested, so nothing gets silently
"generated" without being runnable.

## 5. Roles (RBAC)
Super Admin, Admin, Blood Bank Staff, Hospital Staff, Doctor, Donor,
Patient/Requester, Ambulance Operator, Emergency Coordinator, Support
Agent, Read-only Auditor.

Permissions are enforced **server-side only** — the API never trusts
a role claim from the client without re-validating against the
JWT-signed token issued at login.

## 6. Security baseline (this phase)
- Passwords hashed with bcrypt (passlib)
- JWT access tokens (short-lived) — refresh token flow stubbed for
  the next phase
- No secrets committed to source — `.env.example` provided,
  real `.env` must be gitignored
- Role/permission checks via a FastAPI dependency (`require_roles`),
  not trusted from request body

## 7. Not yet built (explicitly, so nothing is assumed done)
Legal/privacy review (explicitly out of scope for an AI to perform —
needs a real lawyer per the original spec's own instruction). Beyond
that, everything the original 27-phase spec asked for has at least a
real, tested-where-testable implementation — see §17 for the honest
list of what's real vs. approximated vs. genuinely untestable in this
environment (live AI model calls, live SMS/email provider calls,
Docker builds). Push notifications, notification retry/rate-limiting,
real turn-by-turn routing, and staff-to-org membership scoping remain
open simplifications — see §9, §11, §12, §10 respectively.

## 8. Donor module — what was actually tested
See `backend/test_e2e_smoke.py`. Covered: register/login, profile
creation (starts `pending`), unverified donors excluded from search,
donor cannot self-verify (403), admin verifies → appears in search,
search never returns `phone`, unauthenticated search rejected (401).
This test also caught a real `passlib`/`bcrypt` version conflict,
fixed by pinning `bcrypt==4.0.1`.

## 9. Blood Request + Matching Engine module — what was actually tested
Same test file, extended. Covered:
- Full lifecycle: draft → pending_verification → verified →
  (matching) → donors_found → in_progress → fulfilled
- Non-owner cannot submit someone else's draft (403)
- Matching cannot run before a request is verified (409)
- **Compatibility correctness**: an O+ donor was correctly matched
  against an A+ recipient's request (O+ can donate to A+ — this
  exercises the real transfusion compatibility table in
  `app/core/compatibility.py`, not a placeholder)
- Match results never leak donor phone numbers
- A fulfilled (terminal) request rejects further transitions (409)

This run caught and fixed a second real bug: the status transition
table didn't allow `verified → donors_found` directly, which would
have broken the matching endpoint in production.

**Known simplifications, stated plainly:**
- Distance/ETA are real (see §12) only when both donor and request
  have coordinates on file; otherwise matching falls back to an exact
  city-name string match — donors haven't been required to set
  coordinates retroactively
- No AI is involved anywhere in matching — compatibility and scoring
  are both plain deterministic functions, per the spec's guardrail
  that AI must never override blood compatibility rules
- Rejection/re-verification flow for blood requests (analogous to
  donor `rejected` status) is not implemented — only forward
  verification is

## 10. Hospital + Blood Bank + Inventory modules — what was actually tested
Same test file, extended again (21 total assertions now). Covered:
- Hospital registration starts `pending`; excluded from the public
  listing until an admin verifies it (hospital staff cannot
  self-verify — 403)
- Same pattern for blood banks
- Inventory: added 3 batches (two O+ lots, one A- lot); the public
  `/inventory/summary` endpoint correctly **aggregates** units by
  blood group (7 O+, 3 A-) without exposing per-batch detail
- Marking a batch `expired` correctly removes it from the available
  summary (7 O+, A- disappears) — proves the aggregation pipeline
  filters on status, not just sums everything
- A hospital-staff account is correctly forbidden (403) from writing
  to a blood bank's inventory — RBAC still enforced across modules

This run caught a third real bug: BSON (MongoDB's wire format) has no
native `date` type, only `datetime` — `InventoryItemCreate.collection_date`/
`expiry_date` were being passed as Python `date` objects straight to
Mongo and crashing on insert. Fixed by converting to UTC-midnight
`datetime` at the DB boundary and back to `date` on read
(`_to_bson_datetime` / `.date()` in `app/api/routes/blood_banks.py`).

**Known simplification, stated plainly:** there is no staff-to-hospital
or staff-to-blood-bank membership model yet. Any `hospital_staff`
account can register a hospital, and any `blood_bank_staff` account
can manage any verified bank's inventory — not scoped to "their"
institution. A real org-membership table is needed before this goes
anywhere near production; noted here so it isn't silently assumed
solved.

## 11. Notification Engine — what was actually tested
Same test file (25 assertions total now). Covered:
- Running the matching engine now actually creates a real in-app
  notification for each matched donor (checked: exactly 1 notification,
  correct blood group mentioned, status `sent`, `read: false`)
- The donor can mark it read; a different user (admin) gets 404 trying
  to mark someone else's notification read — ownership enforced
- The SMS provider (Twilio interface) is called directly with no
  credentials set, and correctly reports `status: failed` with a clear
  "TWILIO_* not set" reason in the body — **it does not silently
  pretend to succeed**. Same pattern implemented for email (SMTP) but
  not separately exercised in this test run.

**What's real vs. what's an interface:**
- **In-app notifications are fully real** — DB-backed, delivered
  instantly, no external dependency, exactly as tested above.
- **SMS (Twilio) and Email (SMTP) are real, documented integration
  interfaces** (`app/core/notifications/sms_sender.py`,
  `email_sender.py`) that will actually send once you provide
  credentials in `.env` — but untested against a real Twilio/SMTP
  account here, since none exist in this environment. Per this
  project's own rule about unavailable credentials, they fail loudly
  and honestly rather than faking success.
- **Not built at all yet:** push notifications, notification
  templates/preferences, retry-on-failure logic, rate limiting, and
  emergency escalation chains. The matching engine currently fires
  in-app notifications only — wiring SMS/email into that same flow
  once you have real credentials is a small follow-up, not a
  redesign.

## 12. Location & Maps — what was actually tested
Same test file (30 assertions total now). Covered:
- A donor with real coordinates (Saddar, Karachi) matched against a
  request ~1.3km away (Empress Market area) got a computed distance
  of **1.1km** and a 3-minute ETA — the haversine formula was
  exercised against real-world coordinates, not synthetic test
  points, and the result is the right order of magnitude
- A donor *without* coordinates on file correctly falls back to
  city-string matching instead of being excluded or given a fake
  distance (`distance_km: null`, not `0` or a guess)
- Staff donor search with `near_lat`/`near_lng`/`max_distance_km`
  returns real sorted distances — and critically, **never returns the
  donor's raw latitude/longitude**, only the rounded distance,
  preserving the same privacy rule as every other donor-facing
  endpoint

**What's real vs. what's an approximation, stated plainly:**
- `haversine_distance_km` (`app/core/geo.py`) is genuine great-circle
  distance math — correct, not a placeholder.
- `estimate_eta_minutes` is a **naive straight-line estimate** using
  an assumed average speed (25 km/h) — not real routing. It ignores
  roads, one-way streets, and traffic entirely. A real ETA needs a
  routing provider (Google/Mapbox Directions API); none is
  integrated, and the module docstring says so.
- Distance queries currently scan matching donors in application code
  (Python-side haversine over the query result set), not a MongoDB
  native geospatial index (`2dsphere`). This is fine at prototype
  scale but would not scale to a large donor base — a real
  implementation would store donor location as GeoJSON and use
  `$geoNear`/`$nearSphere`. Noted here so it isn't silently assumed
  solved.
- Coordinates are optional and only donor2 in the test set has them —
  this is intentional, modeling a realistic gradual rollout where not
  every existing donor has set a precise location yet.

## 13. AI Agent — what was actually tested, and what genuinely wasn't
Same test file (42 assertions total now). This phase's guardrails are
the ones the spec calls out explicitly, so each is tested directly,
not just asserted in a docstring:

- **`POST /api/ai/chat` with no `ANTHROPIC_API_KEY` set returns a
  real 503** naming the missing env var — not a fake reply. The
  failed attempt is still written to `ai_sessions` for audit.
- **Blood compatibility is a fixed rule table, not an AI decision**:
  `get_compatible_donors` returns the exact same donor set the
  matching engine itself uses (tested: A+ recipient → {O-,O+,A-,A+}).
- **Role checks are enforced inside the tool functions themselves**,
  not just described in the system prompt: a donor account is
  rejected from the staff-only `get_nearby_donors` tool and from
  `create_draft_blood_request` (wrong role for the latter); an admin
  account succeeds at the former.
- **The AI can only ever create a DRAFT request, never submit one**:
  tested by calling `create_draft_blood_request` and then reading the
  resulting document straight from the database — its `status` field
  is `"draft"`, full stop. There's no code path in that tool that can
  set any other status.
- **The FAQ tool never fabricates an answer**: a real question gets a
  real static answer; an unrelated question gets `found: false`
  rather than an invented response.
- **The allowlist is enforced by the dispatcher, not the prompt**:
  calling `dispatch_tool_call` with a made-up tool name
  (`delete_all_users`) is rejected with `ToolError`, and — critically
  — the blocked attempt is still written to `ai_tool_calls` with
  `success: false`, so a malicious or malfunctioning model attempting
  something off-list would show up in an audit trail. A legitimate
  call is separately confirmed to log `success: true`.

**What is real code but has never been run, stated as plainly as the
SMS/email situation:** there is no `ANTHROPIC_API_KEY` in this
environment, so `app/core/ai/agent.py`'s actual tool-calling loop
against the live Anthropic API has never executed. Everything it
depends on — the tool functions, the dispatcher, the allowlist, the
permission checks, the draft-only guardrail, the audit logging — is
tested directly and passes. The one thing not exercised is the model
itself deciding which tools to call and how to phrase a reply. Wire
in a real key and run a manual conversation through `/api/ai/chat`
before trusting this in front of real users.

**Known simplifications, stated plainly:**
- No conversation memory across calls — every `/api/ai/chat` request
  is a fresh, independent session. Multi-turn conversations aren't
  supported yet.
- `MAX_TOOL_ITERATIONS = 5` is a hard, unconfigurable cap — reasonable
  as a runaway-loop guard, but not yet exposed as an admin setting.
- No rate limiting on the chat endpoint itself (separate from the
  Notification Engine's — this is a distinct gap).
- The "AI must never diagnose/prescribe" rule currently rests on the
  system prompt plus the fact that no tool exists which could return
  a diagnosis or prescription — there's no separate output-scanning
  safety net checking the model's actual free-text reply. That's an
  intentional simplification (the tool allowlist is the load-bearing
  guardrail), not an oversight, but it's worth stating outright rather
  than implying the prompt alone is doing the work.

## 15. General Audit Logs — what was actually tested
A separate trail from `ai_tool_calls` — this one (`audit_logs`)
covers human staff/admin actions: donor/hospital/blood-bank
verification, inventory status changes, and every blood request
status transition (verify/cancel/start/fulfill). `app/core/audit.py`
is a single small helper called from each of those endpoints; nothing
routes through a generic middleware that could silently miss an
endpoint, which also means adding a new mutating endpoint later
requires remembering to call it explicitly — a real trade-off, not
hidden.

Tested: a non-admin is blocked from `/api/admin/audit-logs` (403); an
admin can filter by `action` and see the correct actor role and
details; filtering by `target_type=blood_request` surfaces the full
set of lifecycle actions actually taken during the test run
(`request.verify`, `request.start_fulfillment`, `request.fulfill`).

**Known simplification:** not every mutating action in the system is
logged here yet — e.g., donor profile self-updates, notification
read-receipts, and AI-created drafts are not (the last one is already
covered by `ai_tool_calls`, so that's intentional; the others are a
genuine gap, not a design decision).

## 16. Security Hardening — what was actually tested, and what wasn't attempted
This phase does not claim to satisfy the full Phase 17 checklist —
some items (SQL injection protection is structural here since Mongo
+ Pydantic don't build raw queries from strings; CSRF doesn't apply
to a stateless bearer-token JSON API) were already true by
architecture rather than needing new code. What's new and tested:

- **Account lockout**: 5 failed login attempts locks the account for
  15 minutes — tested by actually failing 5 times, then confirming a
  6th attempt with the *correct* password still gets 403 "locked".
- **Real TOTP MFA** (`pyotp`, RFC 6238) — not a stub. Tested by
  generating a secret via `/api/auth/mfa/setup`, computing a live code
  with the same library a real authenticator app would use, confirming
  setup with it, then proving login is genuinely gated: no code → 401,
  wrong code → 401, correct real-time code → 200. This is fully
  testable locally (unlike SMS/email/AI) because TOTP needs no
  external service — just a shared secret and the current time.
- **Security headers** (HSTS, X-Frame-Options, X-Content-Type-Options,
  CSP, Referrer-Policy, Permissions-Policy) — tested present on a real
  response via `app/core/security_headers.py`, a Starlette middleware
  applied to every route automatically.
- **Rate limiting** on `/api/auth/login` and `/api/auth/register` —
  tested by actually sending rapid requests until a real 429 came
  back, not just checking the code exists.

**What was not attempted, stated plainly:**
- No SQL/NoSQL injection testing beyond architectural protection —
  Pydantic validates input shape before it ever reaches a Mongo query,
  and no endpoint builds a query from raw string concatenation, but
  there's no dedicated fuzzing/injection test suite.
- No XSS testing — not very applicable to a pure JSON API with no
  server-rendered HTML, but also not verified with a dedicated test.
- No penetration testing of any kind. "Tested" here means the
  specific mechanisms above behave as designed under the test suite's
  scenarios — it is not a security audit.
- The lockout check runs before the password check when the account
  exists, which means a locked account (403) is distinguishable from
  a wrong-password/nonexistent-account response (401) — a minor
  account-enumeration signal. This is a common real-world trade-off
  (many production systems do the same for UX reasons), not an
  oversight, but it's named here rather than left implicit.
- Rate limiting is in-memory and per-process — see docs/deployment.md
  for why that doesn't hold up across multiple replicas without a
  shared store like Redis.

## 17. CI/CD + Deployment — what's real, what's written-but-unrun
- `.github/workflows/ci.yml` runs the full 60-assertion functional
  test suite plus a route-registration sanity check on every push/PR
  to `main`. The YAML itself was hand-verified for syntax correctness
  but **has never actually executed on GitHub** — there's no repo
  here to push to and trigger it. This is a real, complete pipeline
  definition, not a placeholder, but genuinely unexecuted.
- `backend/Dockerfile` and `docker-compose.yml` (repo root) are
  complete, non-root, no-baked-secrets container configs — but there
  is no Docker daemon available in this environment, so **the image
  has never actually been built or run**. Same honesty rule as the
  SMS/email/AI integrations: real code, stated as untested rather
  than implied to be verified.
- `docs/deployment.md` covers local/Docker/production paths and
  states plainly what's still missing for real production use: no
  shared-store rate limiting across replicas, no secrets manager
  integration, no migration/rollback strategy beyond idempotent index
  creation, no configured backup strategy, and an `ENV` variable that
  exists but doesn't yet branch any behavior.

## 18. Where this genuinely stands
Every phase from the original spec has been touched: the ones with
testable logic (auth, RBAC, matching, inventory, notifications-in-app,
geodistance, AI guardrails, admin analytics, audit logs, account
lockout, TOTP MFA, security headers, rate limiting) have a real
implementation exercised by 60 passing assertions against an
in-memory database, with five real bugs found and fixed along the way
by those same tests. The ones that need something this environment
doesn't have — a live Anthropic API key, a live Twilio/SMTP account, a
Docker daemon, an actual GitHub repo to run Actions against, a real
lawyer for privacy/legal review — have real, complete code or
documents, explicitly marked as unexecuted rather than silently
assumed to work. That distinction is the point of building this
incrementally instead of generating the whole spec in one pass: every
claim in this document is either "tested, here's how" or "written,
here's exactly why it couldn't be verified here."

## 14. Admin Dashboard + Analytics — what was actually tested
Same test file (47 assertions total now). Every number returned by
`/api/admin/dashboard` and the two analytics endpoints is a real
MongoDB count or aggregation against the same collections every other
module writes to — nothing here is a separately-maintained running
total that could drift out of sync.

- Non-admin (donor) access is rejected (403); admin access succeeds
- Dashboard counts matched the test's known seeded state exactly:
  2 donors, 1 hospital, 1 blood bank, all verified
- Request analytics correctly computed a **1-in-3 fulfillment rate
  (33.3%)** and a real average fulfillment time from actual
  `created_at`→`fulfilled_at` timestamps — not a placeholder number
- Donor analytics correctly broke down donors by blood group

**This phase caught a real bug in the Notification Engine** (from
Phase 9, only surfaced now that something actually queried
notification status in aggregate): `PATCH /api/notifications/{id}/read`
was overwriting the `status` field to `"read"`, destroying whether
the notification had originally been `sent` or `failed` — read/unread
and delivery status were being conflated into one field. Fixed so
`read` (bool) and `status` (delivery outcome) are tracked
independently, as they should have been from the start. The dashboard
test is what caught this — the delivery-count mismatch it produced
was the signal, not a guess.

**Known simplifications, stated plainly:**
- `fulfilled_at` is only recorded going forward from this phase —
  requests fulfilled by earlier code before this field existed would
  show no fulfillment-time contribution (not applicable in this test
  run, but worth stating for anyone inspecting older data)
- No time-windowed analytics (e.g. "this week" vs "this month") —
  every number is an all-time total
- No exportable reports (CSV/PDF) yet — Phase 16's "exportable
  reports" requirement is not implemented, only the raw numbers via
  API
- `DeliveryStatus.READ` exists in the enum but is currently unused —
  read/unread is tracked via the separate `read` boolean, not a
  status transition; the enum value is reserved for a future case
  (e.g. an email open receipt) where "read" really is a delivery
  outcome distinct from in-app read state
