# Product Vision — Seekers AI Platform

## The one-liner

**Seekers is the host. Clients build and own everything themselves.**

Any organization (store, clinic, school, e-commerce brand) signs up, connects
its own Facebook Page and Instagram account, and builds its own in-house AI
chatbot and auto comment replier — with zero involvement from the Seekers team.
Seekers provides the infrastructure: Meta connectivity, webhook routing,
knowledge storage, the agent runtime, and analytics.

## The self-serve journey (every step is the client's, not ours)

1. **Register** an organization → email verification → login.
2. **Connect Meta** (`/accounts`): OAuth with Facebook → pick a Page → the
   linked Instagram business account is offered automatically. Tokens are
   encrypted (AES-256-GCM) and refreshed automatically before the 60-day expiry.
3. **Create an AI agent** (`/agents/new`, 5-step wizard):
   - **Basics** — name, business type, tone of voice, greeting.
   - **Knowledge** — paste FAQs/prices/policies, or link a Knowledge Base from
     the library; optional AI-generated persona; **optional own LLM key (BYO-LLM)**.
   - **Test** — chat with the agent in the playground before going live.
   - **Channel** — pick Facebook / Instagram (WhatsApp planned).
   - **Go live** — the agent starts answering DMs *and* comments immediately.
4. **Operate** — watch conversations (`/conversations`), analytics
   (`/analytics`), refine knowledge any time; pause/activate the agent freely.

## What the agent does once live

- **Messenger + Instagram DMs**: buffered burst replies (Redis debounce, default
  6s) so multi-message customers get one coherent answer; voice notes and
  images are understood via Gemini; conversation history is persisted.
- **Auto comment replies**: new comments on FB posts / IG media get a short
  public reply generated from the same knowledge base
  (`webhookRouter.service.ts#tryNativeAgentComment`). Own comments/echoes are
  never answered (loop protection).
- **Guardrails**: answers only from the client's knowledge; never invents
  prices/offers; optional human-handoff and lead-extraction behaviors.

## Bring-Your-Own-LLM (BYO-LLM)

Clients can run their agent on **their own model and their own bill** instead of
the platform's shared AI:

| Provider   | What the client provides            | Default model     |
|------------|-------------------------------------|-------------------|
| Seekers AI | nothing (default)                   | platform-managed  |
| OpenAI     | API key (+ optional model)          | gpt-4o-mini       |
| Anthropic  | API key (+ optional model)          | claude-haiku-4-5  |
| Gemini     | API key (+ optional model)          | gemini-2.5-flash  |
| Custom     | API key + base URL (OpenAI-compatible: Groq, Together, Ollama behind a proxy, self-hosted vLLM…) | client-defined |

Keys are stored encrypted, are write-only (the API never returns them —
only `llm_key_set: true`), and a failing client key silently falls back to the
platform engines so customers never see an outage.

Why it matters commercially: enterprises with data/vendor constraints can adopt
the platform without routing content through Seekers' AI accounts, and heavy
users stop being a token-cost risk — they bring their own capacity.

## Tiers (current shape)

- **Self-serve agents** (the core product): everything above, per-org limits
  via `usageLimit` middleware + `usageMetering.service`.
- **Managed n8n workflows** (legacy/premium path): the Seekers team builds
  custom n8n automations per client; the webhook router prefers a native agent
  and falls back to dedicated n8n workflows, then the shared base webhook.

## North-star principles for future work

1. Nothing in the client journey may require a Seekers admin to act.
2. The platform never invents answers — knowledge-grounded replies only.
3. Clients own their data: connect, export, delete — including the Meta
   deauthorize/deletion callbacks doing real deletion.
4. Every new channel (WhatsApp next) should plug into the same agent, knowledge,
   and router — one agent, many channels.
