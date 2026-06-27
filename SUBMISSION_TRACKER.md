# Meta App Review — Submission Tracker

Mark each step `[x]` as we finish it. Fill the **VALUES TO FILL** as you get them.

> Reference docs: [RAILWAY_DEPLOY.md](backend/RAILWAY_DEPLOY.md) ·
> [APP_REVIEW_SUBMISSION.md](APP_REVIEW_SUBMISSION.md) · legal pages in [legal/](legal/)

---

## VALUES TO FILL (shared across steps)
- Backend public domain: `__________` (e.g. `seekers-backend.up.railway.app`)
- Frontend / site domain: `https://www.seekersai.org`
- Webhook verify token: *(see backend/.railway-secrets.local)*
- Meta App ID: `__________`
- Reviewer test login: email `__________` / password `__________`
- Test Facebook Page: `__________`  ·  Test Instagram account: `__________`

---

## Phase 0 — Code prep (Claude can do now)
- [x] Add `business_management` to OAuth scopes *(done in code — live after deploy)*
- [ ] Implement real data-deletion logic in `/api/meta/deletion` + `/deauthorize`
- [ ] Wire legal pages into the site (or confirm where they're hosted)

## Phase 1 — Deploy backend to Railway  (YOU)
- [ ] Create Railway project + add PostgreSQL + add Redis
- [ ] Add backend service from repo, root dir = `Seekers_main/backend`
- [ ] Set all environment variables (see RAILWAY_DEPLOY.md)
- [ ] Run DB migrations once (`npm run migrate` against public DB URL)
- [ ] Generate public domain → record it in VALUES above
- [ ] Verify `https://DOMAIN/health` returns 200
- [ ] Verify webhook challenge URL echoes back `test`

## Phase 2 — Host legal pages  (YOU / Claude)
- [ ] Privacy Policy live at `https://www.seekersai.org/privacy-policy.html`
- [ ] Data Deletion page live at `https://www.seekersai.org/data-deletion.html`

## Phase 3 — Configure Meta app dashboard  (YOU)
- [ ] Webhooks: callback `…/api/webhooks/meta` + `…/api/webhooks/instagram` + verify token
- [ ] Subscribe webhook fields (messages, messaging_postbacks, feed / messages, comments, mentions)
- [ ] Facebook Login: Valid OAuth Redirect URI `…/api/meta/callback`
- [ ] Settings → Basic: Privacy Policy URL set
- [ ] Settings → Basic: User Data Deletion = `…/api/meta/deletion`

## Phase 4 — Test data + assets  (YOU)
- [ ] Create reviewer test account in the app → record login in VALUES
- [ ] Connect a Facebook Page to the test account
- [ ] Connect an Instagram Professional account to the test account

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
