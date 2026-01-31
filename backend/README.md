# Seekers AI Platform - Backend

A professional multi-tenant SaaS backend for managing Meta (Facebook/Instagram) business automation through n8n workflows.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Dashboard                          │
│                    (React/Next.js Frontend)                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Seekers API Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Auth      │  │   Meta      │  │   Workflow Requests     │ │
│  │   Service   │  │   Service   │  │   Service               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Knowledge  │  │  Webhook    │  │   Notification          │ │
│  │  Base Svc   │  │  Router     │  │   Service               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             ▼                                ▼
┌────────────────────────┐      ┌────────────────────────────────┐
│     PostgreSQL 15      │      │        n8n Workflows           │
│  ┌──────────────────┐  │      │  ┌──────────────────────────┐  │
│  │ Organizations    │  │      │  │ Chatbot Workflows        │  │
│  │ Users/Admins     │  │      │  │ Comment Reply Workflows  │  │
│  │ Knowledge Bases  │  │      │  │ Custom Automations       │  │
│  │ Workflow Requests│  │      │  └──────────────────────────┘  │
│  └──────────────────┘  │      └────────────────────────────────┘
└────────────────────────┘
             │
             ▼
┌────────────────────────┐
│        Redis           │
│  ┌──────────────────┐  │
│  │ Sessions         │  │
│  │ Rate Limiting    │  │
│  │ Notification Q   │  │
│  └──────────────────┘  │
└────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Using Docker (Recommended)

```bash
# Clone and navigate
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your Meta API credentials
# Then start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Manual Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration

# Run database migrations
psql -U your_user -d your_database -f src/migrations/001_initial_schema.sql

# Build TypeScript
npm run build

# Start in development
npm run dev

# Or start in production
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration (env, database, redis, logger)
│   ├── middleware/       # Express middleware (auth, rate limiting, validation)
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── migrations/       # Database migrations
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔐 Authentication

### Client Authentication

- JWT tokens with 7-day expiration
- Refresh token support
- Password reset flow

### Admin Authentication

- Separate JWT secret for admins
- 8-hour token expiration
- Role-based access control (superadmin, admin, support)

## 📡 API Endpoints

### Auth Routes (`/api/auth`)
- `POST /register` - Register new user & organization
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user
- `PUT /password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token

### Admin Auth Routes (`/api/admin/auth`)
- `POST /login` - Admin login
- `POST /logout` - Admin logout
- `GET /me` - Get current admin
- `PUT /password` - Change password
- `GET /admins` - List all admins (superadmin)
- `POST /admins` - Create admin (superadmin)

### Meta Routes (`/api/meta`)
- `GET /oauth/url` - Get Meta OAuth URL
- `GET /oauth/callback` - OAuth callback handler
- `GET /pages` - Get available Facebook pages
- `POST /pages/:pageId/connect` - Connect a page
- `DELETE /pages/:id/disconnect` - Disconnect a page
- `GET /instagram` - Get Instagram accounts
- `POST /instagram/:id/connect` - Connect Instagram
- `GET /connection-status` - Get connection status

### Knowledge Base Routes (`/api/knowledge-bases`)
- `GET /` - List knowledge bases
- `GET /:id` - Get knowledge base
- `POST /` - Create knowledge base
- `PUT /:id` - Update knowledge base
- `DELETE /:id` - Delete knowledge base
- `GET /:id/history` - Get version history
- `POST /:id/restore/:versionId` - Restore version

### Workflow Request Routes (`/api/workflow-requests`)
- `GET /` - List workflow requests
- `GET /:id` - Get request details
- `POST /` - Create workflow request
- `GET /addons/list` - List add-on requests
- `POST /addons` - Create add-on request
- `GET /addons/available` - List available add-ons

### Webhook Routes (`/api/webhooks`)
- `GET /meta` - Meta webhook verification
- `POST /meta` - Meta webhook handler
- `GET /instagram` - Instagram webhook verification
- `POST /instagram` - Instagram webhook handler

### Admin Routes (`/api/admin`)
- `GET /dashboard` - Dashboard statistics
- `GET /organizations` - List organizations
- `GET /organizations/:id` - Organization details
- `PUT /organizations/:id` - Update organization
- `GET /workflow-requests` - List all requests
- `PUT /workflow-requests/:id` - Update request
- `GET /addon-requests` - List add-on requests
- `POST /workflows` - Create n8n workflow
- `PUT /workflows/:id` - Update workflow

## 🔑 Environment Variables

See `.env.example` for all required environment variables.

## 🛡️ Security Features

- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting (configurable)
- JWT authentication
- AES-256-GCM token encryption
- Input validation with Zod
- SQL injection prevention
- XSS protection

## 📊 Monitoring

- Winston logging with daily rotation
- Health check endpoint (`/health`)
- Request/response logging
- Error tracking

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| backend | 3000 | API Server |
| postgres | 5432 | Database |
| redis | 6379 | Cache/Queue |
| n8n | 5678 | Workflow Automation |
| pgadmin | 5050 | Database Admin (optional) |

## 📝 License

Proprietary - Seekers AI © 2024
