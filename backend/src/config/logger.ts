import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Get config without circular dependency
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || './logs';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(metadata).length > 0 && !metadata.stack) {
      log += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    
    if (metadata.stack) {
      log += `\n${metadata.stack}`;
    }
    
    return log;
  })
);

// Transport configurations
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    level: LOG_LEVEL,
  })
);

// File transports (only in non-test environments)
if (NODE_ENV !== 'test') {
  // Combined log file
  transports.push(
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: NODE_ENV === 'production' ? jsonFormat : customFormat,
      level: LOG_LEVEL,
    })
  );

  // Error log file
  transports.push(
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: NODE_ENV === 'production' ? jsonFormat : customFormat,
      level: 'error',
    })
  );

  // Access log file (for HTTP requests)
  transports.push(
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'access-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: jsonFormat,
      level: 'http',
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'seekers-saas' },
  transports,
  exitOnError: false,
});

// Add stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
export const loggers = {
  /**
   * Log API request
   */
  apiRequest: (method: string, path: string, userId?: string, duration?: number) => {
    logger.http('API Request', { method, path, userId, duration });
  },

  /**
   * Log API error
   */
  apiError: (method: string, path: string, error: Error, userId?: string) => {
    logger.error('API Error', { 
      method, 
      path, 
      userId, 
      error: error.message,
      stack: error.stack,
    });
  },

  /**
   * Log database query
   */
  dbQuery: (query: string, duration: number, rowCount?: number) => {
    logger.debug('Database Query', { 
      query: query.substring(0, 100), 
      duration, 
      rowCount,
    });
  },

  /**
   * Log webhook event
   */
  webhook: (platform: string, eventType: string, assetId: string, success: boolean) => {
    logger.info('Webhook Event', { platform, eventType, assetId, success });
  },

  /**
   * Log n8n routing
   */
  n8nRoute: (workflowId: string, webhookUrl: string, success: boolean, responseTime?: number) => {
    logger.info('n8n Route', { workflowId, webhookUrl, success, responseTime });
  },

  /**
   * Log authentication event
   */
  auth: (action: string, userId: string, success: boolean, ip?: string) => {
    logger.info('Auth Event', { action, userId, success, ip });
  },

  /**
   * Log admin action
   */
  adminAction: (adminId: string, action: string, targetType: string, targetId: string) => {
    logger.info('Admin Action', { adminId, action, targetType, targetId });
  },

  /**
   * Log Meta API call
   */
  metaApi: (endpoint: string, method: string, success: boolean, duration?: number) => {
    logger.debug('Meta API Call', { endpoint, method, success, duration });
  },

  /**
   * Log notification
   */
  notification: (type: string, targetId: string, sent: boolean) => {
    logger.info('Notification', { type, targetId, sent });
  },
};

// Graceful shutdown
export const closeLogger = (): Promise<void> => {
  return new Promise((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });
};

export default logger;
