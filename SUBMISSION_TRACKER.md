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

### Live E2E test status — ✅ COMPLETE (2026-07-03)
- [x] **Instagram DM auto-reply VERIFIED WORKING** — webhook → agent → take_thread_control → reply delivered
- [x] **Facebook Messenger auto-reply VERIFIED WORKING** — full fix chain:
  1. App-level webhook `messages` field was UNSUBSCRIBED → subscribed (+ `standby`, `messaging_handovers` via Graph API)
  2. App had no Messenger perms on the Page → fixed by Page disconnect→reconnect (grants scopes + `subscribed_apps`)
  3. Messenger conversation routing: Default AND Social routing → Seekers Chatbot-Testing
  4. Old threads owned by U Connector (kept for other clients) → solved in code: `standby` webhook field
     + auto `take_thread_control` on send (commit 9d729b7) — no need to remove competing apps
- [x] **Conversations inbox shows real chats live** (10s polling) + human-agent reply from the UI
  (conversation.routes.ts + ClientConversations rewrite, commits e2601ba + 82cfced)
- [x] `expires_in` sometimes missing from Meta long-lived tokens → 60-day fallback (commit 293f983)
- Learned: dev-mode senders need an app role; IG senders need the **Instagram Tester** role specifically (+ accept invite)
- Learned: error #100/2534037 = another app owns thread (auto take_thread_control);
  error #27/2534118 = Page admin must enable "Take control of conversations" (Advanced Messaging → Edit app);
  Messenger delivers owned threads ONLY to the owner app (standby field is the escape hatch), IG delivers to all
- Learned: "Reconnect Meta" button ≠ Page reconnect — only Page disconnect→connect re-runs `subscribed_apps`

## ⏭️ NEXT UP (in order)
1. ~~Phase 5 API calls~~ ✅ done 07-04 · ~~comment auto-reply test~~ ✅ both platforms
2. ~~Business verification~~ ✅ Seekers Llc verified since 2026-01-29
3. Reviewer test account — register fresh client login, record creds in VALUES
4. 07-05: check App Review → Permissions and Features → usage indicators green
5. Screencast (Phase 6) — everything it must show now works; record it
6. Forms (Phases 7–8) — ask Claude to draft the per-permission descriptions
7. Top up Railway credit (~$4.75 left!) before recording
8. Post-approval backlog: BYO n8n webhook feature (forward msg → wait reply → send back)

## ✅ Phase 5 — API test calls  (DONE 2026-07-04 — usage registers within 24h)
- [x] pages_show_list — `GET /me/accounts` (Explorer)
- [x] pages_read_engagement — `GET /{page-id}?fields=fan_count,followers_count` (Explorer)
- [x] pages_read_user_content — `GET /{page-id}/feed` (Explorer + live comment webhooks)
- [x] pages_manage_metadata — `subscribed_apps` calls during page reconnects
- [x] pages_manage_engagement — FB comment auto-reply live (after /replies→/comments edge fix)
- [x] pages_messaging — Messenger DM auto-replies live
- [x] instagram_basic — `GET /{ig-id}?fields=id,username` (Explorer)
- [x] instagram_manage_messages — `GET /{page-id}/conversations?platform=instagram` + live DM replies
- [x] instagram_manage_comments — IG comment auto-reply live
- ~~business_management~~ — SKIPPED on purpose: not in our OAuth scopes, not submitted
- ⏳ Verify tomorrow: App Review → Permissions and Features → each permission shows recent API activity
- **Bonus: comment auto-reply verified live on BOTH platforms (2026-07-04)**

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
