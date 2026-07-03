# Meta App Review — Submission Tracker

Mark each step `[x]` as we finish it. Fill the **VALUES TO FILL** as you get them.

> Reference docs: [RAILWAY_DEPLOY.md](backend/RAILWAY_DEPLOY.md) ·
> [APP_REVIEW_SUBMISSION.md](APP_REVIEW_SUBMISSION.md) · legal pages in [legal/](legal/)

---

## VALUES TO FILL (shared across steps)
- Backend public domain: `seekers-ai-platform-production.up.railway.app`
- Frontend / site domain: `https://www.seekersai.org`
- Webhook verify token: *(see backend/.railway-secrets.local)*
- Meta App ID: `1210863244347120` (app name: "Seekers Chatbot-Testing")
- Reviewer test login: email `__________` / password `__________`
- Test Facebook Page: `Seekers.ai` (pageId `632646263265905`)  ·  Test Instagram account: `@seekersai` (IG id `17841473388616114`)
- Test sender IG account: `@byahmedgomaa` (added as Instagram Tester in App roles)

---

## Phase 0 — Code prep (Claude can do now)
- [x] Add `business_management` to OAuth scopes *(done in code — live after deploy)*
- [ ] Implement real data-deletion logic in `/api/meta/deletion` + `/deauthorize`
- [ ] Wire legal pages into the site (or confirm where they're hosted)

## Phase 1 — Deploy backend to Railway  (YOU)
- [x] Create Railway project + add PostgreSQL + add Redis
- [x] Add backend service from repo, root dir = `backend`
- [x] Set all environment variables (see RAILWAY_DEPLOY.md)
- [x] Update API_BASE_URL + META_REDIRECT_URI with real domain
- [x] Run DB migrations once (`npm run migrate` against public DB URL)
- [x] Generate public domain → record it in VALUES above
- [x] Verify `https://DOMAIN/health` returns 200
- [x] Verify webhook challenge URL echoes back `test`

## Phase 2 — Host legal pages  (DONE — served from backend)
- [x] Privacy Policy live at `https://seekers-ai-platform-production.up.railway.app/privacy-policy.html`
- [x] Data Deletion page live at `https://seekers-ai-platform-production.up.railway.app/data-deletion.html`

## Phase 3 — Configure Meta app dashboard  (YOU)
- [x] Webhooks: callback `…/api/webhooks/meta` + `…/api/webhooks/instagram` + verify token (verified live)
- [x] Subscribe webhook fields (FB: messages, messaging_postbacks, message_deliveries, message_reads, feed / IG: messages, comments)
- [x] Fix META_REDIRECT_URI to `/api/meta/oauth/callback` (Railway var)
- [x] Facebook Login: Valid OAuth Redirect URI `…/api/meta/oauth/callback`
- [x] Settings → Basic: Privacy Policy URL set (`…/privacy-policy.html`, verified 2026-07-03)
- [x] Settings → Basic: User Data Deletion = `…/api/meta/deletion` (verified 2026-07-03)

## Phase 4 — Test data + assets  (YOU)
- [ ] Create reviewer test account in the app → record login in VALUES
- [x] Connect a Facebook Page to the test account (Seekers.ai — webhook subscription verified in logs 2026-07-03)
- [x] Connect an Instagram Professional account to the test account (@seekersai)

### Live E2E test status (2026-07-03)
- [x] **Instagram DM auto-reply VERIFIED WORKING** — webhook → agent → take_thread_control → reply delivered
- [ ] Facebook Messenger auto-reply — webhooks not delivered yet. Root causes found:
  1. Page Settings → Advanced Messaging: app originally had no Messenger perms → fixed by reconnect (Page webhook subscription successful)
  2. Messenger conversation routing → Default routing app set to Seekers Chatbot-Testing ✅
  3. **REMAINING: Social routing → "Facebook Page" still routes to U Connector** → change to Seekers Chatbot-Testing
  4. Old threads keep their old owner app — test with a FRESH conversation (delete old thread or use a new Tester account)
- Learned: dev-mode senders need an app role; IG senders need the **Instagram Tester** role specifically
- Learned: error #100/2534037 = another app owns thread (auto-handled via take_thread_control since f20b1bc);
  error #27/2534118 = Page admin must enable "Take control of conversations" for the app (Advanced Messaging → Edit)

## Phase 5 — API test calls  ⚠️ DO FIRST (up to 24h to register)  (YOU)
Graph API Explorer, one call per permission (see APP_REVIEW_SUBMISSION.md):
- [ ] pages_show_list — `GET /me/accounts`
- [ ] pages_read_engagement — `GET /{page-id}?fields=fan_count,posts{message,comments}`
- [ ] pages_read_user_content — `GET /{page-id}/feed`
- [ ] pages_manage_metadata — `POST /{page-id}/subscribed_apps?subscribed_fields=messages,feed`
- [ ] pages_manage_engagement — `POST /{comment-id}/comments`
- [ ] pages_messaging — `POST /{page-id}/messages` (reply to a test user)
- [ ] instagram_basic — `GET /{ig-user-id}?fields=id,username`
- [ ] instagram_manage_messages — `GET /{ig-user-id}/conversations`
- [ ] instagram_manage_comments — `GET /{ig-media-id}/comments`
- [ ] business_management — `GET /me/businesses`

## Phase 6 — Screencast  (YOU)
- [ ] Record one end-to-end video (shot list in APP_REVIEW_SUBMISSION.md)
- [ ] Video shows: login → connect assets → Messenger DM auto-reply → IG DM → comments → analytics

## Phase 7 — Fill the submission forms  (YOU)
Per permission: paste description, upload screencast, tick agreement.
- [ ] pages_show_list
- [ ] pages_read_engagement
- [ ] pages_read_user_content
- [ ] pages_manage_metadata
- [ ] pages_manage_engagement
- [ ] pages_messaging (+ reproduction instructions)
- [ ] instagram_basic
- [ ] instagram_manage_messages
- [ ] instagram_manage_comments
- [ ] business_management

## Phase 8 — Top-level sections  (YOU, paste from pack)
- [ ] Allowed usage
- [ ] Data handling (privacy + deletion URLs)
- [ ] Reviewer instructions (with test login)

## Phase 9 — Submit
- [ ] All cards green
- [ ] Click **Submit for review** 🚀
