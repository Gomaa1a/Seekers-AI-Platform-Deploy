# Seekers AI Platform — Complete Project Reference

> One file, the whole project. For deep dives see `docs/` and `CLAUDE.md`.
> Last updated: 2026-07-02.

---

## 1. What this is

**Seekers AI Platform** is a multi-tenant SaaS built by **Seekers AI (Cairo, Egypt)**
that lets any organization — store, clinic, school, e-commerce brand — connect its
**Facebook Page and Instagram account** and run its **own in-house AI chatbot and
auto comment replier**, built entirely self-serve.

**The business model in one sentence:** Seekers is the *host*; clients build and
own everything themselves — their Meta connection, their agent, their knowledge,
and optionally even their own LLM API key.

```
Client signs up → connects Page/IG (OAuth) → creates an AI agent (5-step wizard)
→ teaches it their business → tests it in a playground → goes live.
The agent then answers Messenger DMs, Instagram DMs, and public comments 24/7.
```

No Seekers staff involvement is required at any step. A legacy premium tier
(admin-built n8n workflows) still exists alongside the self-serve product.

---

## 2. Live deployments

| Piece | Where | Notes |
|---|---|---|
| Backend API | Railway — `seekers-ai-platform-production.up.railway.app` | Dockerfile build; Postgres + Redis add-ons; migrations auto-run on deploy |
| Frontend | Vercel | connected to the GitHub repo; needs `VITE_API_URL` = Railway URL |
| Git remotes | `origin` = Gomaa1a/Seekers-AI-Platform, `deploy` = Gomaa1a/Seekers-AI-Platform-Deploy, `upstream` = Dessouky13/Seekers_main | pushing `main` triggers the auto-deploys |

Legal pages for Meta (served by the backend): `/privacy-policy.html`, `/data-deletion.html`.

---

## 3. Tech stack

**Backend** (`backend/`): Node.js 20, TypeScript, Express, PostgreSQL 15,
Redis + Bull queues, Socket.IO, JWT auth (separate client/admin secrets) + 2FA,
Zod-validated env config, Winston logging, Docker/Railway.

**Frontend** (`Frontend/`): React 19, Vite, react-router, axios API layer with
token refresh, Tailwind-style utility classes, Socket.IO client.

**AI**: platform engines — Anthropic Claude (default `claude-haiku-4-5`) and
Google Gemini (`gemini-2.5-flash`, also used for voice transcription and image
description) — plus per-agent **Bring-Your-Own-LLM** (see §6).

**Integrations**: Meta Graph API v23 (OAuth, Messenger Send API, comment
replies, webhooks), n8n (legacy managed workflows).

---

## 4. Repository map

```
Seekers_main/
├── CLAUDE.md                  ← guide for AI assistants (gotchas, conventions)
├── PROJECT.md                 ← this file
├── docs/
│   ├── PRODUCT_VISION.md      ← self-serve host model, journey, principles
│   ├── ARCHITECTURE.md        ← all flows diagrammed
│   ├── META_APP_REVIEW_CHECKLIST.md ← launch status: done vs remaining
│   └── BYO_LLM.md             ← bring-your-own-LLM feature spec
├── backend/
│   ├── src/app.ts             ← Express app, middleware, route mounting
│   ├── src/server.ts          ← boot, workers, graceful shutdown
│   ├── src/config/            ← env (Zod), db pool, redis, logger
│   ├── src/migrations/        ← 001–012 plain SQL, applied in order
│   ├── src/routes/            ← auth, meta, agents, webhooks, admin, billing…
│   ├── src/services/          ← business logic (class + singleton pattern)
│   ├── src/workers/           ← webhookProcessor (Bull), tokenRefresher,
│   │                             agentBuffer, freeTierWorker
│   ├── public/                ← privacy-policy.html, data-deletion.html
│   └── RAILWAY_DEPLOY.md      ← step-by-step production deploy guide
└── Frontend/
    ├── App.tsx                ← routes (client portal + admin panel)
    ├── pages/                 ← LandingPage, CreateAgent (wizard), ClientAgents,
    │                             ClientConnectedAccounts, ClientConversations,
    │                             ClientAnalytics, Admin* pages, auth pages
    └── src/api/               ← axios client + typed services per domain
```

---

## 5. Core features

### 5.1 Self-serve Meta connection
- Facebook OAuth with **HMAC-signed state** (CSRF-safe, 15-min expiry).
- Page picker → page token encrypted (AES-256-GCM) → webhook subscription
  (`feed`, `messages`, postbacks…). Linked Instagram business account offered
  automatically.
- Long-lived tokens (60 days) auto-refreshed by a 6-hourly worker before expiry.

### 5.2 AI Agents (the product)
5-step wizard (`/agents/new`): **Basics** (name, tone, greeting) → **Knowledge**
(free text + linked Knowledge Base + optional AI-generated persona + optional
own LLM key) → **Test** (playground chat before going live) → **Channel**
(Facebook / Instagram, WhatsApp planned) → **Go live**.

Live behavior:
- **DMs**: incoming bursts are buffered in Redis (default 6s debounce) so the
  agent sends one coherent reply; voice notes are transcribed and images
  described (Gemini); conversation history persisted to Postgres.
- **Auto comment replies**: new comments on FB posts / IG media get a short
  public reply from the same knowledge. Own comments and message echoes are
  never answered (loop protection).
- **Guardrails**: knowledge-grounded answers only — no invented prices, offers,
  or claims; optional human-handoff and lead-extraction behaviors.

### 5.3 Knowledge Bases
Reusable library (`/knowledge-bases`), typed `chatbot` vs `comments`, linkable
to agents; agents merge inline knowledge + linked KB content at reply time.

### 5.4 Admin panel (Seekers staff)
Client roster, platform analytics, workflow request fulfillment (legacy n8n
tier), system workflows, platform settings. Separate JWT realm + audit logging.

### 5.5 Enterprise plumbing
Per-tenant rate limiting, usage limits/metering, billing routes, notifications
(Socket.IO + queue), email (SMTP), 2FA, audit logs, free-tier trial worker.

---

## 6. Bring-Your-Own-LLM (BYO-LLM)

Clients can run their agent on **their own model and their own bill**:

| Provider | Client provides | Default model |
|---|---|---|
| Seekers AI (default) | nothing | platform-managed |
| OpenAI | API key | gpt-4o-mini |
| Anthropic | API key | claude-haiku-4-5 |
| Gemini | API key | gemini-2.5-flash |
| Custom | API key + base URL (any OpenAI-compatible endpoint: Groq, Together, vLLM…) | client-defined |

Keys are AES-256-GCM encrypted, **write-only** (API returns `llm_key_set: true`,
never the key). Reply engine order: **client's LLM → platform Claude → platform
Gemini → offline knowledge mock** — a failing client key silently falls back, so
customers never see an outage. Spec: `docs/BYO_LLM.md`.

---

## 7. How a message flows (condensed)

```
Meta → POST /api/webhooks/meta            (raw-byte HMAC verify, instant 200)
     → Bull queue → webhookRouter.processWebhook
        ├─ DM      → native agent (Redis buffer → LLM → Send API → persist)
        ├─ comment → native agent (LLM → POST /{comment_id}/replies)
        └─ else    → dedicated n8n workflow (paid) → shared base webhook
```

Full diagrams incl. OAuth and compliance flows: `docs/ARCHITECTURE.md`.

---

## 8. Database essentials (migrations 001–012)

organizations (tenant root) · users / admin_users · meta_tokens (encrypted user
token + `meta_user_id`) · facebook_pages / instagram_accounts (encrypted page
tokens; IG key column is **`instagram_id`**) · ai_agents (persona, knowledge,
channels[], status, BYO-LLM columns) · knowledge_bases · conversations /
messages · meta_deletion_requests (deletion confirmations) · n8n_workflows /
workflow_requests (legacy tier) · notifications, audit/activity logs, billing.

---

## 9. Meta App Review — status

**Done in code (2026-07-02 compliance pass):** raw-byte webhook signature
verification; signed OAuth state; correct redirect (`/accounts`); **real**
deauthorize + data-deletion callbacks with persisted confirmation codes; Graph
API v23; trimmed scope list; privacy + deletion pages served over HTTPS.

**Scopes to submit:** pages_show_list, pages_messaging, pages_manage_metadata,
pages_read_engagement, pages_manage_engagement, pages_read_user_content,
instagram_basic, instagram_manage_messages, instagram_manage_comments.

**Remaining (non-code):** Meta dashboard configuration (URLs, webhook fields,
real `META_APP_SECRET` in Railway env), **Business Verification** in Meta
Business Suite (slowest — start first), end-to-end rehearsal in dev mode,
screencast + reviewer test credentials, submit, then flip app to Live.
Step-by-step: `docs/META_APP_REVIEW_CHECKLIST.md`.

⚠️ Watch Railway credit — if the trial balance runs out the API goes down and
reviewers will hit a dead URL.

---

## 10. Running locally

```bash
# infra
cd backend && docker compose up -d postgres redis   # Postgres on host 5433

# backend
cp .env.example .env    # fill secrets; ENCRYPTION_KEY = 64 hex chars
npm install && npm run migrate && npm run dev       # :3001

# frontend
cd ../Frontend && npm install && npm run dev        # :5173 (VITE_API_URL → :3001)
```

Seeded logins — client: `client@test.com` / `Client@123`,
admin: `admin@seekers.ai` / `Admin@123`.

Checks: backend `npx tsc --noEmit` (clean — keep it clean); frontend
`npm run build` (note: Vite doesn't typecheck; ~60 legacy tsc errors live in
admin pages).

---

## 11. Progress log

Running record of launch work — append here as steps complete.

**2026-07-02 — Meta App Review readiness day**
- Full audit of the codebase against Meta App Review requirements.
- Fixed all blocking bugs (commit `87ca6e2`): raw-byte webhook signature
  verification, HMAC-signed OAuth state, `/accounts` redirect, real
  deauthorize/data-deletion callbacks (+ migration 012 +
  `meta_deletion_requests`), Graph API v18→v23, trimmed scopes,
  `instagram_accounts` column names, OnboardingFlow dead code,
  RAILWAY_DEPLOY.md callback path.
- Shipped **native auto comment reply** (FB feed + IG comments, loop-protected)
  and **BYO-LLM** (per-agent OpenAI/Anthropic/Gemini/custom keys, encrypted,
  write-only, platform fallback).
- Wrote handoff docs: `CLAUDE.md`, `PROJECT.md`, `docs/` (vision, architecture,
  review checklist, BYO-LLM).
- Pushed `main` (`3ca3a46`) to both GitHub repos → Vercel (frontend) and
  Railway (backend) auto-deploys triggered; Railway auto-runs migrations on
  deploy.
- Real `META_APP_SECRET` set in Railway variables (local `.env` still holds a
  placeholder on purpose — never commit the real one).
- Verification signal for new backend code:
  `GET /api/meta/deletion-status?code=TEST` must return
  "Unknown confirmation code" (the old stub said "completed" for any code).

**2026-07-02 (later) — Railway deploy failure diagnosed & fixed**
- Discovered ALL Railway deploys had been failing healthcheck since Jun 28
  (the "Active" version was even older than the last pushed commits).
- Root cause: `railway.json` startCommand
  `node dist/scripts/migrate.js && node dist/server.js` — Railway does not run
  the start command through a shell, so `&&` was passed to node as a literal
  argument: migrations ran, node exited, **the server never started**, zero
  logs, healthcheck timeout.
- Fix: migrations now run **inside** the server boot
  (`server.ts` → `runMigrations()` from `scripts/migrate.ts`, which is now
  importable and only auto-runs as a CLI); startCommand reverted to plain
  `node dist/server.js`.
- Reminder applied: set `META_API_VERSION=v23.0` in Railway variables
  (was v18.0 — harmless to boot, but v18 is sunset).

**2026-07-02 (evening) — ✅ Compliant backend LIVE on Railway**
- The in-process-migrations fix deployed successfully — first green deploy
  since Jun 27. Verified on production:
  `/health` → healthy · `/privacy-policy.html` → 200 ·
  `/data-deletion.html` → 200 ·
  `/api/meta/deletion-status?code=TEST` → "Unknown confirmation code"
  (proves the real compliance code is serving, migrations 010–012 applied).
- Known runtime follow-up: "(#100) nonexisting field (profile_pic…)" when
  listing IG accounts — retest after `META_API_VERSION=v23.0` is set in
  Railway variables; if it persists, confirm the IG account is a
  Professional account and reconnect Meta to refresh scopes.

**Next up** (see `docs/META_APP_REVIEW_CHECKLIST.md` §2–§5):
Meta dashboard config (callback URLs, webhook fields, OAuth redirect URI) →
Business Verification in Meta Business Suite → dev-mode end-to-end rehearsal →
screencast + reviewer credentials → submit permissions.

## 12. Roadmap ideas

- WhatsApp channel via the same agent/router.
- "Test my key" dry-run for BYO-LLM; show which engine answered per message.
- Per-org default LLM config; usage metering split platform- vs client-tokens.
- Human takeover UI on live conversations (24h-window compliant tags).
- Clean up legacy admin-page TypeScript errors; move legal pages to
  www.seekersai.org.
