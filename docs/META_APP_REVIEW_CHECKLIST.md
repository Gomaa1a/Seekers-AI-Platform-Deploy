# Meta App Review & Go-Live Checklist

Status as of **2026-07-03** (live E2E debugging session). Code + deploy + dashboard
config are DONE and **both platforms reply live**; what remains is business
verification, screencast, and the submission forms.

## ✅ 2026-07-03 milestone: LIVE END-TO-END ON BOTH PLATFORMS

- [x] Instagram DM → AI reply, delivered and verified in production
- [x] Facebook Messenger DM → AI reply, delivered and verified in production
      (via standby-channel takeover — see below)
- [x] Conversations inbox in the dashboard shows real chats live (10s polling)
      with human-agent reply (`POST /api/conversations/:id/messages`)
- Root causes fixed this session: app-level `messages` field was unsubscribed;
  old threads owned by U Connector (solved with `standby` field + auto
  `take_thread_control`); `expires_in` missing on long-lived tokens broke the
  `meta_tokens` INSERT; conversations UI double-unwrapped the API envelope.

## ✅ Done in code (don't regress these)

- [x] Webhook signature verified over the **raw request bytes** (timing-safe),
      then parsed — `webhook.routes.ts#verifyAndParse`.
- [x] OAuth `state` HMAC-signed with 15-min expiry (CSRF) —
      `metaService.signState/verifyState`.
- [x] OAuth callback redirects to the real frontend route `/accounts`.
- [x] `META_REDIRECT_URI` path corrected to `/api/meta/oauth/callback`
      (docs, .env.example, .env).
- [x] Graph API default bumped to **v23.0** (v18 is past end-of-life).
- [x] Scope list trimmed — `business_management` removed. Requested scopes:
      pages_show_list, pages_read_engagement, pages_manage_metadata,
      pages_manage_engagement, pages_messaging, pages_read_user_content,
      instagram_basic, instagram_manage_messages, instagram_manage_comments,
      public_profile.
- [x] **Real** deauthorize + data-deletion callbacks with persisted confirmation
      codes (`metaCompliance.service.ts`, `meta_deletion_requests` table) and a
      truthful `/api/meta/deletion-status`.
- [x] `meta_user_id` stored at OAuth time (migration 012) so the callbacks can
      map Meta users → organizations.
- [x] Privacy policy + data deletion instruction pages served over the API
      domain (`backend/public/*.html`).
- [x] Echo/self-reply loop protection for DMs and comments.

## ✅ 1. Deploy (done 2026-07-02)

- [x] Backend on Railway: `seekers-ai-platform-production.up.railway.app`
      (Postgres + Redis attached; migrations auto-run on each deploy).
- [x] Migrations through 012 (applied by the auto-deploy of commit `3ca3a46`).
- [x] Frontend live on Vercel, connected to the GitHub repo.
- [x] Real `META_APP_SECRET` set in Railway variables.
- [x] Confirm `FRONTEND_URL` + `CORS_ORIGIN` in Railway point at the Vercel
      domain (and Vercel's `VITE_API_URL` points at Railway) — proven working
      end-to-end 2026-07-03 (login, OAuth, conversations UI all cross-origin OK).
- [x] Smoke test (2026-07-03): `GET /health` → 200; webhook echo on both
      `/api/webhooks/meta` + `/api/webhooks/instagram` → challenge returned.

## ✅ 2. Meta App Dashboard configuration (done 2026-07-03)

- [x] App "Seekers Chatbot-Testing" (ID `1210863244347120`); icon, category
      "Messenger bots for business", App Domains (Vercel + Railway).
- [x] Privacy Policy URL → `…railway.app/privacy-policy.html`.
- [x] **Data Deletion Callback URL** → `…railway.app/api/meta/deletion`.
- [ ] Deauthorize Callback URL → `https://<api-domain>/api/meta/deauthorize`
      (verify it's set — not re-checked this session).
- [x] Valid OAuth Redirect URI → `…/api/meta/oauth/callback`.
- [x] Webhooks product (verified via `GET /{app-id}/subscriptions`, active):
      - Page object → `/api/webhooks/meta`, fields: `messages`,
        `messaging_postbacks`, `message_deliveries`, `message_reads`, `feed`,
        **`standby`**, **`messaging_handovers`**.
      - Instagram object → `/api/webhooks/instagram`, fields: `messages`, `comments`.
- [x] Real `META_APP_SECRET` in Railway (proven: signed synthetic webhook
      accepted) AND in local `backend/.env`.
- [x] App roles: Ahmed Gomaa (Admin) + `@byahmedgomaa` as **Instagram Tester**
      (IG senders MUST have this role in dev mode, and accept the invite).
- [x] Page settings: Messenger + Instagram **conversation routing** (default
      AND social routing) → Seekers Chatbot-Testing; app granted "Take control
      of conversations" + "Access standby channel" (both platforms).

## 🔲 3. Business verification (START EARLY — slowest step)

- [ ] Meta Business Suite → Security Center → **Business Verification** for
      Seekers AI (legal registration docs, address, phone). Required for
      Advanced Access to all messaging permissions.
- [ ] Expect classification as a **Tech Provider** (we operate on behalf of
      clients) — accept the Tech Provider terms if prompted.
- [ ] Data Handling / **Data Protection Assessment** questionnaire: we store
      Platform Data (tokens encrypted AES-256-GCM, message history in Postgres),
      share it only with the org that owns it, delete on request. Recurs annually.

## 🔲 4. End-to-end rehearsal (Development Mode, before submitting)

With an admin/dev-role Meta user (works without review):
- [x] Register org → connect Page → connect IG → create agent → activate
      (Seekers.ai page `632646263265905` + @seekersai `17841473388616114`).
- [x] Send a DM from a personal account → AI reply arrives — **verified live
      2026-07-03 on BOTH Instagram and Messenger**.
- [x] Real conversations visible live in the dashboard inbox + human reply.
- [x] Comment on a page post → public AI reply arrives — verified 2026-07-04 on
      BOTH platforms (FB needed the /{id}/comments edge fix, commit on 07-04).
- [ ] Remove the app in Facebook settings → deauthorize callback fires,
      assets deactivated (not tested yet).
- [ ] Record all of this — it becomes the screencast material.

## 🔲 5. App Review submission

Per-permission use-case descriptions + one screencast covering:
login → OAuth connect → page picker → agent creation → live DM reply →
live comment reply. Provide reviewer test credentials for the platform
(a working login on the production frontend) and step-by-step instructions.
Note for `instagram_manage_messages`: the IG account must have
Settings → Privacy → Messages → **Allow access to messages** enabled.

Submit these permissions:
`pages_show_list`, `pages_messaging`, `pages_manage_metadata`,
`pages_read_engagement`, `pages_manage_engagement`, `pages_read_user_content`,
`instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`.

## 🔲 6. After approval

- [ ] Switch the app from Development to **Live** mode.
- [ ] Re-test with a non-role user (a real client).
- [ ] Rotate any secrets that were ever shared/committed.

## Known follow-ups (not blockers)

- IG webhook subscription per-account (`POST /{ig-id}/subscribed_apps`) is
  best-effort; IG events are expected via the page-level + app-level
  subscription. Verify IG delivery during the rehearsal and remove the call if
  Graph rejects it.
- 24h messaging window: the agent replies immediately to inbound messages, so
  it stays inside the standard window. If proactive/follow-up messaging is ever
  added, implement message tags / HUMAN_AGENT and request review for it.
- Frontend has ~75 pre-existing TypeScript errors in admin pages (vite build
  ignores them). Clean up opportunistically.
