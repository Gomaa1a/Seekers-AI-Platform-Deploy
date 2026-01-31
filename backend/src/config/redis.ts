import Redis from 'ioredis';
import { config } from './environment';
import { logger } from './logger';

// Redis configuration
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Event handlers
redis.on('connect', () => {
  logger.info('✅ Redis client connected');
});

redis.on('ready', () => {
  logger.info('✅ Redis client ready');
});

redis.on('error', (err) => {
  logger.error('Redis client error', err);
});

redis.on('close', () => {
  logger.warn('Redis client disconnected');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

// Redis helper class with typed methods
class RedisClient {
  private client: Redis;

  constructor(redisClient: Redis) {
    this.client = redisClient;
  }

  /**
   * Get the raw Redis client
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Set a key with optional expiration
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Delete keys by pattern
   */
  async delByPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Set JSON data
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttlSeconds);
  }

  /**
   * Get JSON data
   */
  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Hash operations
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  /**
   * List operations
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  /**
   * Set operations
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  /**
   * Increment operations
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.client.incrby(key, increment);
  }

  /**
   * Pub/Sub
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', error);
      return false;
    }
  }

  /**
   * Get info
   */
  async info(): Promise<string> {
    return this.client.info();
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis connection closed');
  }
}

// Export singleton instance
export const redisClient = new RedisClient(redis);

// Export raw client for Bull queues
export { redis };

// Initialize Redis connection
export const initializeRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    const isHealthy = await redisClient.healthCheck();
    if (isHealthy) {
      logger.info('✅ Redis connection established');
    } else {
      throw new Error('Redis health check failed');
    }
  } catch (error) {
    logger.error('❌ Failed to connect to Redis', error);
    throw error;
  }
};

export default redisClient;
