import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { config } from './environment';
import { logger } from './logger';

// PostgreSQL connection pool configuration
const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
};

// Create the connection pool
const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  logger.debug('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

pool.on('remove', () => {
  logger.debug('Client removed from PostgreSQL pool');
});

// Database helper class
class Database {
  private pool: Pool;

  constructor(dbPool: Pool) {
    this.pool = dbPool;
  }

  /**
   * Execute a query with parameters
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });
      
      return result;
    } catch (error) {
      logger.error('Query error', { text: text.substring(0, 100), error });
      throw error;
    }
  }

  /**
   * Get a single row from query
   */
  async queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Get all rows from query
   */
  async queryAll<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: {
      query: <R extends QueryResultRow = any>(text: string, params?: any[]) => Promise<QueryResult<R>>;
    }) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback({
        query: <R extends QueryResultRow = any>(text: string, params?: any[]) => 
          client.query<R>(text, params),
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('PostgreSQL pool closed');
  }
}

// Export singleton instance
export const db = new Database(pool);

// Export pool for direct access if needed
export { pool };

// Initialize database connection on import
export const initializeDatabase = async (): Promise<void> => {
  try {
    const isHealthy = await db.healthCheck();
    if (isHealthy) {
      logger.info('✅ PostgreSQL connection established', {
        poolStats: db.getPoolStats(),
      });
    } else {
      throw new Error('Database health check failed');
    }
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL', error);
    throw error;
  }
};

export default db;
