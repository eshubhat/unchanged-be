import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number;   // seconds; undefined = no expiry
  prefix?: string;
}

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    this.client = new Redis(this.configService.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));
  }

  // ─── Core Operations ──────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      this.logger.warn(`Cache GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.logger.warn(`Cache SET failed for key "${key}": ${err.message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Cache DEL failed: ${err.message}`);
    }
  }

  async delByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      await this.client.del(...keys);
      return keys.length;
    } catch (err) {
      this.logger.warn(`Cache DEL pattern "${pattern}" failed: ${err.message}`);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.client.incr(key);
    if (ttlSeconds && val === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return val;
  }

  // ─── Cache-Aside Pattern ───────────────────────────────────────────────────

  /**
   * Fetch from cache or execute factory function and cache the result.
   *
   * @example
   * const product = await cacheService.wrap(
   *   `product:${slug}`,
   *   () => productRepo.findBySlug(slug),
   *   600,
   * );
   */
  async wrap<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttlSeconds);
    }
    return value;
  }

  // ─── Distributed Lock (Redlock-lite) ──────────────────────────────────────

  /**
   * Acquire a distributed lock. Returns false if already locked.
   * Use to prevent race conditions in inventory reservation, payment processing.
   */
  async acquireLock(resource: string, ttlSeconds = 30): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const result = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(resource: string): Promise<void> {
    await this.del(`lock:${resource}`);
  }

  // ─── Pub/Sub ──────────────────────────────────────────────────────────────

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}

// ─── Cache Key Constants ──────────────────────────────────────────────────────

export const CacheKeys = {
  product: (slug: string) => `product:${slug}`,
  productsList: (hash: string) => `products:list:${hash}`,
  categoriesTree: () => 'categories:tree',
  brandsAll: () => 'brands:all',
  collectionsActive: () => 'collections:active',
  flashSales: () => 'flash-sales',
  coupon: (code: string) => `coupon:${code.toUpperCase()}`,
  cart: (userId: string) => `cart:${userId}`,
  wishlist: (userId: string) => `wishlist:${userId}`,
  userProfile: (userId: string) => `user:${userId}`,
  rateLimitAuth: (ip: string) => `rate:auth:${ip}`,
};

export const CacheTTL = {
  PRODUCT: 600,          // 10 minutes
  PRODUCT_LIST: 300,     // 5 minutes
  CATEGORIES: 1800,      // 30 minutes
  BRANDS: 1800,          // 30 minutes
  COLLECTIONS: 1800,     // 30 minutes
  FLASH_SALE: 60,        // 1 minute (high freshness)
  COUPON: 300,           // 5 minutes
  CART: 86400,           // 24 hours
  USER_PROFILE: 3600,    // 1 hour
};
