import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';

import { config } from './config/environment';
import { logger } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, webhookLimiter } from './middleware/rateLimiter';
import { tenantRateLimiter } from './middleware/tenantRateLimiter';

// Import routes
import {
  authRoutes,
  adminAuthRoutes,
  adminRoutes,
  metaRoutes,
  organizationRoutes,
  knowledgeBaseRoutes,
  workflowRequestRoutes,
  agentRoutes,
  webhookRoutes,
  notificationRoutes,
  analyticsRoutes,
  conversationRoutes,
  billingRoutes,
} from './routes';

// Create Express app
const app: Application = express();

// Behind Railway's proxy: trust the first hop so rate-limiting and client IPs
// work correctly (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
app.set('trust proxy', 1);

// Create HTTP server for Socket.IO
const httpServer: HTTPServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: config.app.isProduction ? undefined : false,
}));

// CORS
app.use(cors({
  origin: config.security.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: config.security.corsCredentials,
}));

// Body parsing
// Raw body for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// JSON parsing for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log after response
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: _res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
  
  next();
});

// ============================================
// Rate Limiting
// ============================================

// Meta webhooks are mounted BEFORE the global apiLimiter: they arrive
// unauthenticated from a shared pool of Meta IPs, and one conversation fires
// several events (message + delivery + read + echo) — the 100/15min IP limit
// would 429 real events and Meta disables endpoints that keep failing.
// webhookLimiter (1000/min) still bounds abuse; signatures gate authenticity.
app.use('/api/webhooks', webhookLimiter, webhookRoutes);

// Apply rate limiting to all other API routes
app.use('/api/', apiLimiter);

// ============================================
// Health Check
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ============================================
// Static legal pages (privacy policy, data deletion) for Meta App Review
// ============================================

app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// API Routes
// ============================================

// Public routes (webhooks are mounted above, before the global rate limiter)
app.use('/api/auth', authRoutes);

// Admin auth routes
app.use('/api/admin/auth', adminAuthRoutes);

// Per-tenant rate limiting (applied after auth middleware sets req.user)
app.use('/api/', tenantRateLimiter());

// Protected client routes
app.use('/api/organization', organizationRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/knowledge-bases', knowledgeBaseRoutes);
app.use('/api/workflow-requests', workflowRequestRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/conversations', conversationRoutes);

// Billing routes
app.use('/api/billing', billingRoutes);

// Protected admin routes
app.use('/api/admin', adminRoutes);

// ============================================
// Socket.IO
// ============================================

// Socket.IO JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    logger.warn('Socket.IO connection rejected: No token provided', { socketId: socket.id });
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
    socket.data.user = decoded;
    next();
  } catch (err) {
    logger.warn('Socket.IO connection rejected: Invalid token', { socketId: socket.id });
    next(new Error('Invalid authentication token'));
  }
});

io.on('connection', (socket) => {
  logger.info('Socket.IO client connected', { 
    socketId: socket.id, 
    userId: socket.data.user?.userId 
  });

  // Join room based on user/admin type
  socket.on('join', (data: { type: 'client' | 'admin'; id: string }) => {
    // Verify user can only join their own room
    if (data.id !== socket.data.user?.userId) {
      logger.warn('Socket.IO room join rejected: User ID mismatch', { 
        socketId: socket.id, 
        requestedId: data.id, 
        actualUserId: socket.data.user?.userId 
      });
      return;
    }
    
    const room = `${data.type}:${data.id}`;
    socket.join(room);
    logger.debug('Socket joined room', { socketId: socket.id, room });
  });

  // Leave room
  socket.on('leave', (data: { type: 'client' | 'admin'; id: string }) => {
    const room = `${data.type}:${data.id}`;
    socket.leave(room);
    logger.debug('Socket left room', { socketId: socket.id, room });
  });

  socket.on('disconnect', () => {
    logger.info('Socket.IO client disconnected', { socketId: socket.id });
  });
});

// Export io instance for use in services
export { io };

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// Export
// ============================================

export { app, httpServer };
export default app;
