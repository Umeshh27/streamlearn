import Redis from "ioredis";

let redisClient = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Initializes and connects to Redis with full graceful fallback.
 * If Redis is not available, the application continues to run without crashing.
 */
export const connectRedis = async () => {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 3) {
          // Stop retrying excessively if Redis is not running locally/configured
          return null;
        }
        return Math.min(times * 1000, 3000);
      },
    });

    redisClient.on("connect", () => {
      isConnected = true;
      console.log("⚡ [Redis] Successfully connected to Redis server");
    });

    redisClient.on("ready", () => {
      isConnected = true;
    });

    redisClient.on("error", (err) => {
      isConnected = false;
      // Log cleanly without noisy stack trace if offline
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        // Suppress repeated connection logs
      } else {
        console.warn("⚠️ [Redis Warning]:", err.message);
      }
    });

    redisClient.on("close", () => {
      isConnected = false;
    });

    await redisClient.connect();
    isConnected = true;
    return redisClient;
  } catch (err) {
    isConnected = false;
    console.log("ℹ️ [Redis] Running without Redis cache (Local or REDIS_URL not active). Operating in direct-mode.");
    return null;
  }
};

/**
 * Check if Redis is currently connected and healthy
 */
export const isRedisConnected = () => {
  return isConnected && redisClient && redisClient.status === "ready";
};

/**
 * Retrieve a JSON or string value from Redis cache
 */
export const getCache = async (key) => {
  if (!isRedisConnected()) return null;
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  } catch (err) {
    return null;
  }
};

/**
 * Set a value in Redis cache with an optional TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 3600) => {
  if (!isRedisConnected()) return false;
  try {
    const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    if (ttlSeconds > 0) {
      await redisClient.set(key, stringValue, "EX", ttlSeconds);
    } else {
      await redisClient.set(key, stringValue);
    }
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Delete a specific key from Redis
 */
export const deleteCache = async (key) => {
  if (!isRedisConnected()) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Delete keys matching a wildcard pattern (e.g. "tts:cache:*")
 */
export const deletePattern = async (pattern) => {
  if (!isRedisConnected()) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const getRedisClient = () => redisClient;

export { redisClient };
