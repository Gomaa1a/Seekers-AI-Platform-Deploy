import { httpServer } from './app';
import { config } from './config/environment';
import { db, redis, logger } from './config';
import { startTokenRefresher, stopTokenRefresher } from './workers/tokenRefresher';
import { closeQueue } from './workers/webhookProcessor';
import { startFreeTierWorker, stopFreeTierWorker } from './workers/freeTierWorker';

// ============================================
// Startup Function
// ============================================

async function startServer(): Promise<void> {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await db.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Test Redis connection
    logger.info('Testing Redis connection...');
    await redis.ping();
    logger.info('Redis connected successfully');

    // Start background workers
    startTokenRefresher();
    logger.info('Token refresh worker started');

    startFreeTierWorker();
    logger.info('Free tier trial worker started');

    // Webhook queue worker is auto-started on import
    logger.info('Webhook queue worker initialized');

    // Start HTTP server
    httpServer.listen(config.app.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 Seekers AI Platform Backend                         ║
║                                                          ║
║   Server running on port ${config.app.port}                          ║
║   Environment: ${config.app.nodeEnv.padEnd(18)}                    ║
║   API URL: ${config.app.apiBaseUrl.padEnd(22)}                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// ============================================
// Graceful Shutdown
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Stop background workers
      stopTokenRefresher();
      logger.info('Token refresh worker stopped');

      stopFreeTierWorker();
      logger.info('Free tier trial worker stopped');

      // Close webhook queue
      await closeQueue();
      logger.info('Webhook queue closed');

      // Close database connection
      await db.close();
      logger.info('Database connection closed');

      // Close Redis connection
      await redis.quit();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  });

  // Force close after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection', { reason, promise });
});

// ============================================
// Start Server
// ============================================

startServer();
