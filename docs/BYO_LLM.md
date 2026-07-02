# Bring-Your-Own-LLM (BYO-LLM)

Clients can run their AI agent on **their own LLM API key** instead of the
platform's shared AI. Added in migration `012_meta_compliance_byo_llm.sql`.

## Data model (`ai_agents`)

| Column | Meaning |
|---|---|
| `llm_provider` | `platform` (default) \| `anthropic` \| `openai` \| `gemini` \| `custom` |
| `llm_model` | optional model override (defaults: claude-haiku-4-5 / gpt-4o-mini / gemini-2.5-flash) |
| `llm_api_key_encrypted` | client's key, AES-256-GCM via `utils/encryption.ts`. **Never returned by the API.** |
| `llm_base_url` | required for `custom`: any OpenAI-compatible `/v1` endpoint |

## API contract

- Create/update agents with `llmProvider`, `llmModel`, `llmApiKey`, `llmBaseUrl`
  (camelCase inputs, `agent.routes.ts` → `agent.service.ts`).
- `llmApiKey` is **write-only**: send a string to set, `null` to clear, omit to keep.
- Responses pass through `sanitizeAgent()` → the key is stripped and replaced by
  `llm_key_set: boolean`.
- Validation: non-platform provider requires a key; `custom` requires `llmBaseUrl`.

## Runtime behavior (`agent.service.ts`)

`produceReply()` order:

1. **BYO** — `produceByoReply()`: decrypts the key per call and dispatches:
   - `anthropic` → `@anthropic-ai/sdk` `messages.create`
   - `openai` / `custom` → `POST {base}/chat/completions` (axios, Bearer key)
   - `gemini` → `POST generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
2. Platform Anthropic key (env `ANTHROPIC_API_KEY`)
3. Platform Gemini key (env `GEMINI_API_KEY`)
4. Offline keyword mock (playground never dies)

A failing BYO call **logs and falls through** to the platform engines — the
client's customers never see an outage because of a bad/expired client key.

## Frontend

`pages/CreateAgent.tsx`, Step 2 ("Knowledge") → "AI model (optional)" block:
provider chips, password-type key input, optional model, base URL for custom.
Types in `src/api/services/agents.ts` (`LlmProvider`, `llm_key_set`).

## Ideas for later

- Per-agent "Test my key" button (dry-run completion before saving).
- Show which engine actually answered in the conversation view (`mode` is
  already returned by the playground endpoint).
- Per-org default LLM config inherited by all agents.
- Usage metering split: platform-tokens vs client-tokens (billing impact).
