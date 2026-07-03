# Seekers AI Platform — Guide for AI Assistants

Multi-tenant SaaS: businesses connect their **Facebook Pages & Instagram accounts**
and build **their own AI chatbot + auto comment reply** entirely self-serve.
Seekers is the host; clients own their agents. See `docs/PRODUCT_VISION.md`.

## Repo layout

```
Seekers_main/
├── backend/     Node 20 + TypeScript + Express, PostgreSQL 15, Redis, Bull queues
│   ├── src/migrations/   Plain SQL, applied in order by `npm run migrate` (_migrations table)
│   ├── src/routes/       Express routers (mounted in src/app.ts)
│   ├── src/services/     Business logic (class + singleton export pattern)
│   ├── src/workers/      Bull queue processors + interval workers (started in server.ts)
│   └── public/           privacy-policy.html, data-deletion.html (Meta App Review URLs)
├── Frontend/    React 19 + Vite + react-router. Pages in pages/, API layer in src/api/
└── docs/        Architecture, product vision, Meta App Review checklist
```

## Commands

```bash
# Backend (from Seekers_main/backend)
npm run dev          # ts-node-dev on :3001
npm run build        # tsc -> dist/
npm run migrate      # apply src/migrations/*.sql in order
npx tsc --noEmit     # typecheck (clean — keep it that way)

# Frontend (from Seekers_main/Frontend)
npm run dev          # vite on :5173  (needs VITE_API_URL pointing at backend)
npm run build        # vite build (NOTE: does NOT typecheck; ~75 pre-existing tsc errors
                     # in admin pages — don't add new ones in files you touch)
```

Backend `.env` is validated by Zod in `src/config/environment.ts` — a missing var
kills the process on boot. Copy `.env.example` and fill it.

## Load-bearing facts (learned the hard way)

1. **Webhook bodies are raw Buffers.** `app.ts` mounts `express.raw()` on
   `/api/webhooks` so Meta's HMAC can be verified over the exact bytes.
   `webhook.routes.ts#verifyAndParse` verifies then `JSON.parse`s. Never switch
   this to `express.json()` and never HMAC a re-serialized object.
2. **OAuth callback path is `/api/meta/oauth/callback`** (not `/api/meta/callback`).
   `META_REDIRECT_URI` must match it exactly AND be whitelisted in the Meta app.
3. **OAuth `state` is HMAC-signed** (`metaService.signState/verifyState`) —
   orgId + 15-min expiry. Don't pass a raw org ID as state.
4. **After OAuth the backend redirects to the frontend `/accounts` route**
   (ClientConnectedAccounts.tsx reads `?success` / `?error`). There is no
   `/dashboard/settings/integrations` route.
5. **instagram_accounts column is `instagram_id`** (not
   `instagram_business_account_id`). Check `migrations/001` before writing SQL —
   several service queries historically referenced non-existent columns.
6. **Meta compliance callbacks are real** (`metaCompliance.service.ts`):
   deauthorize deactivates assets, deletion deletes tokens/pages/conversations
   and persists a confirmation code in `meta_deletion_requests`. The mapping
   works via `meta_tokens.meta_user_id` (migration 012) — keep storing it.
7. **BYO-LLM keys are write-only.** `ai_agents.llm_api_key_encrypted` is
   AES-256-GCM encrypted (`utils/encryption.ts`, needs 64-hex `ENCRYPTION_KEY`).
   API responses must go through `sanitizeAgent()` (agent.routes.ts) which strips
   the key and exposes `llm_key_set: boolean` instead.
8. **Reply engine order** (`agent.service.ts#produceReply`):
   client's own LLM (BYO) → platform Anthropic key → platform Gemini key →
   offline keyword mock (`mode: 'preview'`). Failures fall through, never throw
   to the customer.
9. **Comment replies**: FB Page comments arrive on the `feed` webhook field
   (NOT `comments` — subscribing a Page to `comments` fails the whole call).
   IG comments arrive on the `comments` field of the `instagram` object.
   Both reply via `POST /{comment-id}/replies` with the page token.
10. **Never reply to yourself**: message echoes (`message.is_echo`) and comments
    where `from.id === page/ig id` must be dropped or the bot loops.
11. **Thread ownership decides who gets webhooks + who may reply.** Send error
    `#100 subcode 2534037` = another app owns the thread → we auto-call
    `take_thread_control` and retry (meta.service.ts). That call fails with
    `#27 subcode 2534118` until the Page admin enables **"Take control of
    conversations"** for our app (Page Settings → Advanced Messaging → Edit app).
    Also check Page Settings → **Messenger/Instagram conversation routing**:
    BOTH "Default routing app" AND **"Social routing"** must point at our app —
    Social routing overrides the default for Page-entry-point chats. No Graph
    API exists to change routing — it's Page-admin-only (document for clients).
    **Asymmetry:** IG delivers message webhooks to all subscribed apps
    (ownership only gates sending); Messenger delivers an owned thread's events
    ONLY to the owner. Escape hatch (implemented): subscribe the `standby`
    webhook field + Page grants "Access standby channel" → standby events are
    processed like normal messages and the send-retry takes the thread over.
    Keep `standby` in BOTH the app-level subscription and page-level
    `subscribed_apps` fields — and note the frontend "Reconnect Meta" button
    only re-runs OAuth; only a Page disconnect→connect re-runs `subscribed_apps`.
12. **Dev-mode webhooks are silently dropped for non-role senders.** FB senders
    need an app role (Admin/Dev/Tester); IG senders need the **Instagram Tester**
    role (App roles → Roles) AND must accept the invite in IG settings.
13. **Meta may omit `expires_in`** on long-lived token exchanges —
    token.service.ts falls back to 60 days; never feed raw `expires_in` into
    `new Date()` math (Invalid Date → Postgres 22007 DateTimeParseError).

## Architecture in one paragraph

Meta webhook → `webhook.routes.ts` (signature check, immediate 200) →
Bull queue (`workers/webhookProcessor.ts`) → `webhookRouter.service.ts`, which
tries in order: **native AI agent** (DMs via `liveAgent.service.ts` with Redis
burst-buffering; comments via `tryNativeAgentComment`) → dedicated per-client
n8n workflow (paid tier) → shared base n8n webhook (legacy free tier).
Full diagrams: `docs/ARCHITECTURE.md`.

## Conventions

- Services: `class XService {}` + `export const xService = new XService()`.
- All org-scoped queries filter by `organization_id` — this is the tenancy
  boundary; never trust an ID from the client without it.
- Migrations are append-only numbered SQL files; make them idempotent
  (`IF NOT EXISTS` / `DROP ... IF EXISTS`) like 007–012.
- Routes wrap handlers in `asyncHandler`; auth via `authenticate` middleware
  which sets `req.user = { userId, organizationId, ... }`.
- Meta App Review status and remaining launch tasks: `docs/META_APP_REVIEW_CHECKLIST.md`.
