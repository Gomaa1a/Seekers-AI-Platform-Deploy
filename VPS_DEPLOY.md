# VPS Deployment Guide — Seekers AI (backend + frontend)

This deploys the whole stack on one VPS so Meta App Review can reach it over HTTPS.
Repo: `Gomaa1a/Seekers-AI-Platform`. Root contains `backend/` and `Frontend/`.

## 0. What you'll end up with
- `https://api.<domain>`  → backend API + webhooks (Node/Express, port 3000)
- `https://app.<domain>`  → frontend app (Vite static build, served by Nginx)
- PostgreSQL + Redis (via Docker)

> Use any two subdomains you like; examples below use `api.seekersai.org` and
> `app.seekersai.org`. **HTTPS is mandatory** — Meta will not call an http:// webhook.

---

## 1. Server prerequisites
```bash
# Ubuntu 22.04+
sudo apt update && sudo apt install -y nginx git docker.io docker-compose certbot python3-certbot-nginx
# Node 20 (for building the frontend + running migrations)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo systemctl enable --now docker
```
Point DNS A-records `api.<domain>` and `app.<domain>` at the VPS IP.

## 2. Get the code
```bash
git clone https://github.com/Gomaa1a/Seekers-AI-Platform.git
cd Seekers-AI-Platform
```

## 3. Backend — Postgres + Redis + API (Docker)
The repo ships `backend/docker-compose.yml` (postgres, redis, backend, optional n8n).

```bash
cd backend
cp .env.example .env
```
Edit `.env` and set **at minimum**:
- `NODE_ENV=production`, `PORT=3000`
- `DATABASE_URL=postgresql://seekers:<db_pw>@postgres:5432/seekers_platform`
- `DATABASE_SSL=false` (internal docker network)
- `REDIS_HOST=redis`, `REDIS_PORT=6379`, `REDIS_PASSWORD=<redis_pw>`
- `API_BASE_URL=https://api.<domain>`
- `FRONTEND_URL=https://app.<domain>`
- `CORS_ORIGIN=https://app.<domain>`
- `META_APP_ID=1210863244347120`
- `META_APP_SECRET=<from Meta dashboard>`
- `META_REDIRECT_URI=https://api.<domain>/api/meta/oauth/callback`
- The 5 secrets (`ENCRYPTION_KEY` 64 hex, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `ADMIN_JWT_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`) — ask Ahmed for the values in
  `backend/.railway-secrets.local`, OR generate fresh:
  `openssl rand -hex 32` (ENCRYPTION_KEY) / `openssl rand -base64 48` (the rest).
- `N8N_DEFAULT_SERVER_URL` / `N8N_WEBHOOK_BASE_URL` — any valid URL if n8n unused.

Start it:
```bash
docker-compose up -d --build postgres redis backend
```

Run DB migrations once:
```bash
npm ci
DATABASE_URL="postgresql://seekers:<db_pw>@localhost:5432/seekers_platform" npm run migrate
```
Check: `curl http://localhost:3000/health` → `{"status":"healthy"}`.

## 4. Frontend — build + serve
```bash
cd ../Frontend
# Point the app at the live backend BEFORE building:
echo "VITE_API_URL=https://api.<domain>"   >  .env.production
echo "VITE_SOCKET_URL=https://api.<domain>" >> .env.production
echo "VITE_META_APP_ID=1210863244347120"    >> .env.production
echo "VITE_ENV=production"                   >> .env.production
npm ci
npm run build      # outputs ./dist
sudo mkdir -p /var/www/seekers-app && sudo cp -r dist/* /var/www/seekers-app/
```

## 5. Nginx + HTTPS
`/etc/nginx/sites-available/seekers`:
```nginx
# Backend API
server {
  server_name api.<domain>;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;          # websockets
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
# Frontend SPA
server {
  server_name app.<domain>;
  root /var/www/seekers-app;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }   # SPA routing
}
```
```bash
sudo ln -s /etc/nginx/sites-available/seekers /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.<domain> -d app.<domain>   # issues HTTPS certs
```

## 6. Verify
- `https://api.<domain>/health` → 200
- `https://api.<domain>/privacy-policy.html` → loads
- `https://app.<domain>` → app loads, login works

## 7. Update Meta dashboard to the new domains
Once live, change these from the Railway URLs to the VPS URLs:
- Messenger webhook callback → `https://api.<domain>/api/webhooks/meta`
- Instagram webhook callback → `https://api.<domain>/api/webhooks/instagram`
  (verify token unchanged)
- Facebook Login → Valid OAuth Redirect URI → `https://api.<domain>/api/meta/oauth/callback`
- App settings → Basic → App Domains: add `<domain>`
- Privacy Policy URL → `https://api.<domain>/privacy-policy.html`
- User Data Deletion → `https://api.<domain>/api/meta/deletion`

## Notes
- Secrets are NOT in the repo (`.railway-secrets.local` is gitignored). Share them
  with the deployer over a secure channel, or generate fresh ones on the VPS.
- Auto-deploy on push: optionally add a `git pull && docker-compose up -d --build`
  step, or a webhook/CI later.
