# Final Audit

This document exists because the original project brief explicitly
required it (Phase 27). It is a snapshot as of the end of this build
session — an honest accounting, not a sales pitch.

## 1. Completed features
Every module the original spec named has a real, working
implementation:

- User Management + server-side RBAC (11 roles)
- Account lockout (5 failed attempts → 15-minute lock)
- Real TOTP MFA (RFC 6238, via `pyotp`) — setup, confirmation, and
  login enforcement
- Donor Management (profile, verification workflow, privacy-safe
  search with optional real-distance ranking)
- Blood Request Management (full lifecycle state machine with
  enforced valid transitions)
- Smart Matching Engine (real transfusion compatibility table,
  eligibility rule, deterministic scoring — zero AI involvement in
  the medical logic, per the spec's own guardrail requirement)
- Emergency handling via request urgency + the matching engine's
  scoring (no separate dedicated "emergency" data model — folded in
  by design, documented in architecture.md §4)
- Location & Maps (real haversine distance, naive straight-line ETA)
- Notification Engine (real in-app delivery; real, documented SMS/
  email provider interfaces gated on credentials)
- Hospital Management (registration, admin verification, public
  verified-only listing)
- Blood Bank Management + unit-level Inventory (batch tracking,
  public aggregate summary, expiry handling)
- AI Agent (guardrailed: allowlisted tools only, drafts-only action,
  full audit logging of every tool call — including blocked ones)
- Admin Dashboard + Analytics (all live aggregate queries)
- General Audit Logs (staff/admin actions, separate from the AI's own
  tool-call log)
- Security headers middleware
- Rate limiting on auth endpoints
- CI pipeline definition (GitHub Actions)
- Docker deployment config (Dockerfile + docker-compose)
- Documentation: architecture, database schema, and deployment docs,
  each updated alongside the code that made them accurate

## 2. Test results
`backend/test_e2e_smoke.py` — 60 assertions, all passing as of the
last run in this session, executed against a real in-memory MongoDB
(`mongomock-motor`) through real HTTP requests via `httpx` against the
actual FastAPI app — not unit tests against isolated functions in
most cases, though a few AI-tool and geo functions are also exercised
directly for guardrail verification.

Six real bugs were found and fixed by this test suite over the course
of the build, not by separate manual review:
1. A `bcrypt`/`passlib` version incompatibility that would have broken
   all password hashing
2. A missing state-transition path (`verified → donors_found`) that
   would have broken the matching engine
3. A BSON date-encoding crash (Mongo has no native `date` type)
4. A notification-status bug where marking a message "read" silently
   overwrote whether it had been sent or had failed
5. A test-assumption bug (not an app bug) about how many donors would
   match a given request — caught and corrected in the test itself
6. A naive-vs-timezone-aware datetime comparison crash in the account
   lockout check

## 3. What was NOT tested, and why
Stated once here comprehensively; each item is also called out in
context in `docs/architecture.md`:

| Area | Why untested |
|---|---|
| AI agent's live model-calling loop | No `ANTHROPIC_API_KEY` available in this environment |
| SMS delivery (Twilio) | No real Twilio account/credentials available |
| Email delivery (SMTP) | No real SMTP account/credentials available |
| Docker image build | No Docker daemon available in this environment |
| CI workflow execution | No live GitHub repository to push to and trigger Actions |
| MongoDB Atlas (real, hosted) | Only `mongomock-motor` (in-memory) was available; behavior against real Atlas — network latency, real index behavior, connection pooling — is unverified |
| Load/performance testing | Not attempted at any point |
| Penetration testing / security audit | Not attempted; only the specific mechanisms described in architecture.md §16 were functionally tested |
| Legal/privacy review | Explicitly out of scope for an AI to perform |

## 4. Known limitations
See `README.md` "Known simplifications" and each phase's section in
`docs/architecture.md` for full detail. Summarized:
- No staff-to-hospital/blood-bank membership model (role alone gates
  access to any institution's records, not membership in that
  specific institution)
- No push notifications; no notification retry/rate-limiting beyond
  what's described; SMS/email need real credentials to function
- ETA is a straight-line approximation, not real routing
- Distance queries scan in application code, not a MongoDB geospatial
  index — fine at prototype scale, not at scale
- Rate limiting is in-memory/per-process — needs a shared store
  (Redis) to be effective across multiple replicas
- No secrets manager integration, no migration/rollback system beyond
  idempotent index creation, no configured backup strategy
- Admin analytics are all-time totals only; no exportable reports
- A locked account (403) is distinguishable from a wrong-password
  response (401) — a minor, common, named trade-off

## 5. Security findings
No dedicated security audit or penetration test was performed. Within
that scope:
- Passwords are bcrypt-hashed, never returned in API responses
- All role/permission checks are enforced server-side, re-read from
  the database on every request (never trusted from the JWT payload
  alone, so a role change takes effect immediately)
- Account lockout and real TOTP MFA are implemented and tested
- Security headers (HSTS, CSP, X-Frame-Options, etc.) are applied to
  every response
- Rate limiting exists on auth endpoints but is not distributed-safe
- No secrets are committed to source; `.env.example` documents every
  required/optional variable
- SQL/NoSQL injection is structurally mitigated (Pydantic validates
  input shape before any query is built; no endpoint builds a query
  from raw string concatenation) but not fuzz-tested
- CSRF protection was not separately implemented because it does not
  apply to a stateless bearer-token JSON API with no cookie-based
  session

## 6. Performance findings
Not measured. No load testing, query profiling, or caching layer was
implemented in this build. The one performance-relevant design
decision worth flagging: donor-distance search scans candidate
documents in application code rather than using a MongoDB geospatial
index, which will not scale to a large donor base.

## 7. Deployment status
Written, not executed. `Dockerfile`, `docker-compose.yml`, and
`docs/deployment.md` are complete and internally consistent, but the
image has never been built and the compose stack has never been run,
because no Docker daemon was available in this environment. Treat
this as a real starting point that needs its first actual build-and-
run cycle before anyone relies on it.

## 8. Recommended next steps, in priority order
1. Run the test suite against a real MongoDB Atlas instance, not just
   the in-memory mock, and fix whatever surfaces
2. Build and run the Docker image locally; fix whatever surfaces
3. Get a real `ANTHROPIC_API_KEY` and manually test `/api/ai/chat`
   end to end before it reaches any real user
4. Get real Twilio/SMTP credentials and verify actual message delivery
5. Push this to a real GitHub repository and confirm the CI workflow
   passes
6. Design and implement a staff-to-org membership model before
   allowing real hospital/blood-bank staff accounts to operate
   unscoped
7. Move rate limiting to a shared store (Redis) before running more
   than one API replica
8. Commission an actual security review and legal/privacy review
   before handling real donor or patient data
9. Add real geospatial indexing (`2dsphere`) before donor volume grows
   significantly
10. Decide on and implement a real routing/ETA provider if accurate
    arrival estimates matter for the emergency workflow
