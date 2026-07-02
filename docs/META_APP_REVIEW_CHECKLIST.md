# Meta App Review & Go-Live Checklist

Status as of 2026-07-02, after the compliance/bug-fix pass. Code items are DONE;
what remains is deployment + Meta dashboard + business paperwork.

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

## 🔲 1. Deploy (prerequisite for everything)

- [ ] Backend on Railway per `backend/RAILWAY_DEPLOY.md` (Postgres + Redis).
- [ ] Run migrations **through 012** against the production DB.
- [ ] Deploy the Frontend (Vercel/Netlify/Railway static) with
      `VITE_API_URL=https://<api-domain>`.
- [ ] Set backend `FRONTEND_URL` + `CORS_ORIGIN` to the frontend domain.
- [ ] Smoke test: `GET /health` → 200; webhook echo test:
      `GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=test` → `test`.

## 🔲 2. Meta App Dashboard configuration

- [ ] App type **Business**; icon 1024×1024, category, App Domains, Website URL.
- [ ] Privacy Policy URL → `https://<api-domain>/privacy-policy.html`
      (better long-term: host on www.seekersai.org).
- [ ] **Data Deletion Callback URL** → `https://<api-domain>/api/meta/deletion`
      (or the instructions page `/data-deletion.html`). Use the dashboard
      **Test** button — our endpoint now really deletes and returns
      `{ url, confirmation_code }`.
- [ ] Deauthorize Callback URL → `https://<api-domain>/api/meta/deauthorize`.
- [ ] Valid OAuth Redirect URI → exactly `https://<api-domain>/api/meta/oauth/callback`.
- [ ] Webhooks product:
      - Page object → callback `https://<api-domain>/api/webhooks/meta`,
        fields: `messages`, `messaging_postbacks`, `feed`.
      - Instagram object → callback `https://<api-domain>/api/webhooks/instagram`,
        fields: `messages`, `comments`.
      - Verify token = `META_WEBHOOK_VERIFY_TOKEN`.
- [ ] Set real `META_APP_SECRET` in the backend env (the local .env has a placeholder!).

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
- [ ] Register org → connect Page → connect IG → create agent → activate.
- [ ] Send a DM from a personal account → AI reply arrives.
- [ ] Comment on a page post → public AI reply arrives.
- [ ] Remove the app in Facebook settings → deauthorize callback fires,
      assets deactivated.
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
