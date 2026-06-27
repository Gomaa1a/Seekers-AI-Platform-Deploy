import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  FRONTEND_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  APP_NAME: z.string().default('Seekers AI Platform'),

  // Database
  DATABASE_URL: z.string(),
  DATABASE_POOL_MIN: z.string().default('2'),
  DATABASE_POOL_MAX: z.string().default('10'),
  DATABASE_SSL: z.string().default('false'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  REDIS_URL: z.string().optional(),

  // Meta/Facebook
  META_APP_ID: z.string(),
  META_APP_SECRET: z.string(),
  META_REDIRECT_URI: z.string().url(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(32),
  META_API_VERSION: z.string().default('v18.0'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  ADMIN_JWT_SECRET: z.string().min(32),
  ADMIN_JWT_EXPIRES_IN: z.string().default('8h'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64),

  // n8n
  N8N_DEFAULT_SERVER_URL: z.string().url(),
  N8N_API_KEY: z.string().optional(),
  N8N_WEBHOOK_BASE_URL: z.string().url(),
  N8N_WEBHOOK_TIMEOUT: z.string().default('30000'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // GCP Cloud Storage
  GCS_PROJECT_ID: z.string().optional(),
  GCS_BUCKET: z.string().optional(),
  GCS_KEY_FILE: z.string().optional(),

  // Security
  CORS_ORIGIN: z.string(),
  CORS_CREDENTIALS: z.string().default('true'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  RATE_LIMIT_ADMIN_MAX: z.string().default('500'),
  BCRYPT_ROUNDS: z.string().default('12'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_DIR: z.string().default('./logs'),
  SENTRY_DSN: z.string().optional(),

  // WebSocket
  WS_ENABLED: z.string().default('true'),

  // Branding
  COMPANY_NAME: z.string().default('Seekers AI'),
  PRODUCT_NAME: z.string().default('Seekers AI Platform'),
  SUPPORT_EMAIL: z.string().email().default('support@seekersai.org'),
  CONTACT_PHONE: z.string().default('01044332566'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      console.error('❌ Environment validation failed:');
      missingVars.forEach(v => console.error(`  - ${v}`));
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

// Export typed configuration
export const config = {
  app: {
    nodeEnv: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    frontendUrl: env.FRONTEND_URL,
    apiBaseUrl: env.API_BASE_URL,
    name: env.APP_NAME,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
  },

  database: {
    url: env.DATABASE_URL,
    poolMin: parseInt(env.DATABASE_POOL_MIN, 10),
    poolMax: parseInt(env.DATABASE_POOL_MAX, 10),
    ssl: env.DATABASE_SSL === 'true',
  },

  redis: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
    password: env.REDIS_PASSWORD || undefined,
    db: parseInt(env.REDIS_DB, 10),
    url: env.REDIS_URL,
  },

  meta: {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    redirectUri: env.META_REDIRECT_URI,
    webhookVerifyToken: env.META_WEBHOOK_VERIFY_TOKEN,
    apiVersion: env.META_API_VERSION,
    graphApiBaseUrl: `https://graph.facebook.com/${env.META_API_VERSION}`,
    requiredScopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_manage_engagement',
      'pages_messaging',
      'pages_read_user_content',
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'business_management',
      'public_profile',
      'email',
    ],
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    adminSecret: env.ADMIN_JWT_SECRET,
    adminExpiresIn: env.ADMIN_JWT_EXPIRES_IN,
  },

  encryption: {
    key: env.ENCRYPTION_KEY,
    algorithm: 'aes-256-gcm' as const,
  },

  n8n: {
    serverUrl: env.N8N_DEFAULT_SERVER_URL,
    apiKey: env.N8N_API_KEY,
    webhookBaseUrl: env.N8N_WEBHOOK_BASE_URL,
    timeout: parseInt(env.N8N_WEBHOOK_TIMEOUT, 10),
  },

  gcs: {
    projectId: env.GCS_PROJECT_ID,
    bucket: env.GCS_BUCKET,
    keyFile: env.GCS_KEY_FILE,
  },

  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  },

  security: {
    corsOrigin: env.CORS_ORIGIN.split(',').map(s => s.trim()),
    corsCredentials: env.CORS_CREDENTIALS === 'true',
    rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
    rateLimitAdminMax: parseInt(env.RATE_LIMIT_ADMIN_MAX, 10),
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS, 10),
  },

  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
    sentryDsn: env.SENTRY_DSN,
  },

  websocket: {
    enabled: env.WS_ENABLED === 'true',
  },

  branding: {
    companyName: env.COMPANY_NAME,
    productName: env.PRODUCT_NAME,
    supportEmail: env.SUPPORT_EMAIL,
    contactPhone: env.CONTACT_PHONE,
  },
} as const;

export type Config = typeof config;
export default config;
