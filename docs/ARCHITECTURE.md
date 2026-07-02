# Architecture — Seekers AI Platform

## System map

```
                     ┌────────────────────────────┐
                     │  Frontend (React + Vite)    │
                     │  client portal + admin panel│
                     └──────────────┬─────────────┘
                                    │ JWT (axios, src/api/client.ts)
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend (Express, src/app.ts)                                    │
│  /api/auth /api/meta /api/agents /api/webhooks /api/admin ...     │
│  Socket.IO (JWT-authed rooms client:{id} / admin:{id})            │
└───────┬───────────────┬───────────────────┬──────────────────────┘
        │               │                   │
        ▼               ▼                   ▼
  PostgreSQL 15      Redis            Meta Graph API
  (orgs, tokens,   (sessions, Bull    (OAuth, Send API,
   agents, convs)   queues, buffers)   comment replies, webhooks)
                                            │
                                            ▼
                                    n8n (legacy/premium
                                     per-client workflows)
```

## Flow 1 — Meta OAuth connect (self-serve)

```
Frontend /accounts → GET /api/meta/oauth/url
  backend: state = metaService.signState(orgId)   ← HMAC(orgId|expiry), 15 min
  → Facebook login dialog (scopes from config.meta.requiredScopes)
  → GET /api/meta/oauth/callback?code&state
      verifyState(state) → orgId          ← rejects tampered/expired state
      code → short token → long-lived token (60d)
      tokenService.storeUserToken(...)    ← stores meta_user_id too (migration 012)
      redirect FRONTEND_URL/accounts?success=true (or ?error=...)
  → user picks a page: POST /api/meta/pages/:pageId/connect
      page token encrypted → facebook_pages row
      metaService.subscribePageWebhook    ← fields: feed, messages, ... (NOT 'comments')
  → linked IG: POST /api/meta/instagram/:igId/connect (uses the page token)
```

Token lifecycle: `workers/tokenRefresher.ts` re-exchanges tokens expiring within
7 days (runs every 6h) and refreshes derived page tokens.

## Flow 2 — Incoming message / comment

```
Meta POST /api/webhooks/meta  (or /instagram)
  express.raw() body → verifyAndParse():
      HMAC-SHA256(raw bytes, APP_SECRET) vs X-Hub-Signature-256 (timing-safe)
  res.sendStatus(200) immediately  ← Meta requires fast ack
  events → enqueueWebhook() → Bull queue "webhook-processing" (3 retries, exp backoff)

workers/webhookProcessor.ts → webhookRouterService.processWebhook(event):
  1. resolve page/IG account row (must be is_active)
  2. DMs   → tryNativeAgent():   liveAgentService.bufferIncoming()
  3. comments → tryNativeAgentComment():  reply via POST /{comment_id}/replies
  4. else → dedicated n8n workflow (paid) → shared base webhook (fallback)
```

Loop protection: `message.is_echo` and `comment.from.id === page id` are dropped.
Comment edits/deletes (`verb !== 'add'`) are ignored.

## Flow 3 — Native agent reply (DMs)

```
liveAgentService.bufferIncoming()
  Redis list agentbuf:{platform}:{asset}:{sender} + debounce (AGENT_BUFFER_SECONDS)
agentBuffer.worker flush →
  composeCustomerMessage()   ← voice → Gemini transcription, image → description
  findOrCreateConversation() + persist inbound message
  agentService.generateReply(agent, text, history)
  metaService.sendMessage(pageToken, senderId, reply)
  persist outbound message + response time
```

## Flow 4 — Reply engine (agent.service.ts#produceReply)

```
0. BYO-LLM      agent.llm_provider != 'platform' and llm_api_key_encrypted set
                → anthropic SDK | OpenAI-compatible POST | Gemini REST
                (decrypt key per call; failure logs + falls through)
1. Platform Anthropic (ANTHROPIC_API_KEY, default claude-haiku-4-5)
2. Platform Gemini    (GEMINI_API_KEY)
3. Offline mock       keyword match over knowledge → mode:'preview'
```

System prompt = persona (custom `system_prompt` or templated from tone/business)
+ hard guardrails (no invented facts/prices) + resolved knowledge
(inline `knowledge` + linked `knowledge_bases.content`).

## Flow 5 — Meta compliance callbacks (metaCompliance.service.ts)

```
POST /api/meta/deauthorize  (signed_request, HMAC-verified)
  → delete meta_tokens for meta_user_id, deactivate pages + IG accounts

POST /api/meta/deletion     (signed_request)
  → insert meta_deletion_requests (confirmation code)
  → delete conversations (messages cascade), instagram_accounts,
    facebook_pages, meta_tokens for the mapped org(s)
  → respond { url: deletion-status?code=..., confirmation_code }

GET /api/meta/deletion-status?code=... → real status from the table
```

## Database (key tables)

| Table | Purpose |
|---|---|
| organizations | tenant root; every scoped query filters organization_id |
| users / admin_users | client users vs Seekers staff (separate JWT secrets) |
| meta_tokens | 1 row per org; encrypted user token, meta_user_id, scopes, expiry |
| facebook_pages / instagram_accounts | connected assets + encrypted page tokens (IG column: `instagram_id`) |
| ai_agents | self-serve agents: persona, knowledge, channels[], status, BYO-LLM columns |
| knowledge_bases | reusable knowledge library (type: chatbot/comments) |
| conversations / messages | live chat history (native agent path) |
| meta_deletion_requests | Meta data-deletion confirmations (migration 012) |
| n8n_workflows / workflow_requests | legacy managed-workflow tier |

Migrations: `src/migrations/NNN_*.sql`, applied by `npm run migrate`,
tracked in `_migrations`. Append-only; keep them idempotent.

## Deployment

- Backend: Railway (Dockerfile + railway.json). Guide: `backend/RAILWAY_DEPLOY.md`.
  Requires Postgres + Redis add-ons; env validated on boot.
- Frontend: any static host (Vercel/Netlify/Railway). Set `VITE_API_URL`.
  Backend `FRONTEND_URL` + `CORS_ORIGIN` must point back at it.
- Legal pages for Meta App Review are served by the backend from
  `backend/public/`: `/privacy-policy.html`, `/data-deletion.html`.
