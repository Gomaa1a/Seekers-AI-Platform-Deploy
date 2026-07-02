# Deploying the Seekers backend to Railway

Goal: a public **HTTPS** URL for the API so Meta can reach the webhook during App Review.

The app reads its config from env vars validated by `src/config/environment.ts` (Zod).
Missing/invalid vars = the container exits on boot. This guide lists every required var.

---

## 1. Create the project + data stores

1. Go to https://railway.app → **New Project**.
2. **Add Postgres**: New → Database → PostgreSQL.
3. **Add Redis**: New → Database → Redis.
4. **Add the backend service**: New → GitHub Repo → select this repo.
   - Set **Root Directory** to `Seekers_main/backend`.
   - Railway detects the `Dockerfile` (also configured in `railway.json`).

## 2. Set environment variables on the backend service

In the backend service → **Variables**. Use Railway's variable references
(`${{Postgres.*}}`, `${{Redis.*}}`) so the services stay linked.

```
NODE_ENV=production
PORT=3000

# --- Database (Railway Postgres) ---
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# --- Redis (Railway Redis) — app uses host/port/password, NOT REDIS_URL ---
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
REDIS_DB=0

# --- URLs (fill PUBLIC_DOMAIN after step 4) ---
API_BASE_URL=https://PUBLIC_DOMAIN
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
CORS_ORIGIN=https://YOUR_FRONTEND_DOMAIN
META_REDIRECT_URI=https://PUBLIC_DOMAIN/api/meta/oauth/callback

# --- Meta app credentials (from developers.facebook.com → your app) ---
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_API_VERSION=v23.0

# --- Secrets: see the gitignored file backend/.railway-secrets.local ---
# (Never commit real secret values. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#  ENCRYPTION_KEY must be 64 hex chars; JWT/webhook secrets >= 32 chars.)
ENCRYPTION_KEY=<from .railway-secrets.local>
JWT_SECRET=<from .railway-secrets.local>
JWT_REFRESH_SECRET=<from .railway-secrets.local>
ADMIN_JWT_SECRET=<from .railway-secrets.local>
META_WEBHOOK_VERIFY_TOKEN=<from .railway-secrets.local>

# --- n8n: required by schema (must be valid URLs). Use real n8n or placeholders ---
N8N_DEFAULT_SERVER_URL=https://n8n.example.com
N8N_WEBHOOK_BASE_URL=https://n8n.example.com/webhook
```

> `META_REDIRECT_URI` must also be added to your Meta app's **Valid OAuth Redirect URIs**.

## 3. Run the database migrations (once, from your machine)

The deployed production image has no `ts-node`, so migrations are run locally
against the DB's **public** URL:

1. Railway → Postgres service → **Variables** → copy `DATABASE_PUBLIC_URL`.
2. From `Seekers_main/backend`:
   ```bash
   DATABASE_URL="<DATABASE_PUBLIC_URL>" DATABASE_SSL=true npm run migrate
   ```
   This creates a `_migrations` table and applies `src/migrations/00*.sql` in order.

## 4. Get the public domain + wire it up

1. Backend service → **Settings → Networking → Generate Domain**. Copy the
   `*.up.railway.app` URL.
2. Replace `PUBLIC_DOMAIN` in `API_BASE_URL` and `META_REDIRECT_URI` (step 2) with it. Redeploy.
3. Verify it's live:
   - `https://PUBLIC_DOMAIN/health` → 200
   - `https://PUBLIC_DOMAIN/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=test`
     → should echo back `test`

## 5. Configure the Meta webhook

In Meta App Dashboard → **Messenger / Instagram → Webhooks**:
- Callback URL: `https://PUBLIC_DOMAIN/api/webhooks/meta` (and `/api/webhooks/instagram`)
- Verify Token: *(value in backend/.railway-secrets.local)*
- Subscribe to fields: `messages`, `messaging_postbacks`, `feed` (FB) /
  `messages`, `comments`, `mentions` (IG).

---

## Notes
- Meta only needs the backend reachable over HTTPS + the SaaS frontend reachable
  with a test login for the reviewer. The app can stay in **Development mode**
  during review; it does not need to be public/Live first.
- The secrets above were freshly generated for this deploy. Rotate them if this
  file is ever shared. Do not commit real `META_APP_SECRET`.
- If the internal Postgres connection rejects SSL, set `DATABASE_SSL=false` and
  use the internal `${{Postgres.DATABASE_URL}}` reference (private networking).
