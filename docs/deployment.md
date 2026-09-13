# Deployment

## Status: written, not build-tested here
There is no Docker daemon available in the environment this project
was built in, so the `Dockerfile` and `docker-compose.yml` below are
real, complete configuration — not placeholders — but **have not been
run** here. Build and run them yourself before trusting this section
fully; if something doesn't work, it's most likely a version pin or a
missing system dependency on your machine, not a fundamental design
problem, but say so rather than assuming.

## Environments

### Local development (no Docker)
```
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in MONGODB_URI (e.g. local mongod or Atlas) + JWT_SECRET_KEY
uvicorn app.main:app --reload
```

### Local development (Docker Compose — API + MongoDB together)
```
docker compose up --build
```
This starts MongoDB and the API together, with the API pointed at the
compose-managed Mongo instance automatically. Override any of the
optional provider env vars (Twilio, SMTP, Anthropic) by exporting them
before running, e.g. `ANTHROPIC_API_KEY=sk-... docker compose up`.

### Staging / Production
This project has no CI/CD deployment target wired up (no Railway/
Render/Fly/AWS config committed) — only the container image and CI
test pipeline exist. To deploy:
1. Build the image: `docker build -t karachi-blood-response-api ./backend`
2. Push it to your registry of choice
3. Run it against a real MongoDB Atlas cluster (not the compose-local
   Mongo) by setting `MONGODB_URI` to your Atlas connection string
4. Set a real, random `JWT_SECRET_KEY` — never reuse the compose
   default
5. Set whichever of the optional provider env vars you actually have
   credentials for (Twilio, SMTP, Anthropic) — anything left unset
   degrades honestly rather than silently pretending to work (see
   docs/architecture.md §9 and §13)
6. Put a real reverse proxy / load balancer in front that terminates
   TLS — this app does not do TLS itself; the `Strict-Transport-Security`
   response header only has effect once traffic is actually served
   over HTTPS

## What's genuinely missing for a real production deployment
Stated plainly, not glossed over:
- **No horizontal scaling support for rate limiting.** The rate
  limiter (`app/core/rate_limit.py`) is in-memory per process. Running
  more than one API replica means each replica enforces its own
  independent limit — effectively multiplying the real limit by the
  replica count. A production deployment needs a shared store (Redis)
  for this to mean what it says.
- **No secrets manager integration.** Env vars are the only mechanism
  here. A real deployment should pull `JWT_SECRET_KEY` and provider
  credentials from a proper secrets manager (AWS Secrets Manager,
  Vault, etc.), not a `.env` file or raw platform env vars, though
  the latter is a reasonable interim step.
- **No blue/green or rolling-migration strategy** for the MongoDB
  indexes created in `ensure_indexes()` — they're created idempotently
  on every startup, which is fine for this project's current schema
  size but isn't a real migration system (no versioned migrations,
  no rollback plan).
- **No backup strategy configured** — this depends entirely on
  whatever your MongoDB Atlas (or self-hosted Mongo) backup settings
  are; nothing in this codebase manages backups.
- **No staging-vs-production environment separation** beyond the
  `ENV` variable, which nothing currently branches on — it's read
  into `Settings` but not used to change behavior anywhere yet.

## Health check
`GET /health` returns `{"status": "ok"}` with no auth required —
suitable for a load balancer or orchestrator health check. It does
not check MongoDB connectivity; a request that reaches a route
actually touching the database will fail on its own if Mongo is
unreachable, but `/health` itself will report healthy even if Mongo
is down. A more thorough health check (verifying a real DB ping)
is a reasonable next improvement, not yet implemented.
