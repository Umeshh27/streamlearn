import { isRedisConnected, redisClient } from "../lib/redis.js";

/**
 * Creates a rate limiter middleware backed by Redis with in-memory fallback.
 * @param {Object} options
 * @param {number} options.windowSeconds Time window in seconds (default: 60s)
 * @param {number} options.maxRequests Maximum allowed requests per window (default: 30)
 * @param {string} options.keyPrefix Prefix for Redis keys
 * @param {string} options.message Custom error message
 */
export const createRateLimiter = ({
  windowSeconds = 60,
  maxRequests = 40,
  keyPrefix = "rl:ai",
  message = "Too many requests. Please wait a moment before trying again.",
} = {}) => {
  // In-memory fallback map if Redis is not running
  const memoryFallback = new Map();

  return async (req, res, next) => {
    // Identifier is user ID if authenticated, otherwise client IP
    const identifier = req.user?._id || req.user?.id || req.ip || "anonymous";
    const key = `${keyPrefix}:${identifier}`;

    if (isRedisConnected()) {
      try {
        const current = await redisClient.incr(key);
        if (current === 1) {
          await redisClient.expire(key, windowSeconds);
        }

        const ttl = await redisClient.ttl(key);
        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current));
        res.setHeader("X-RateLimit-Reset", Math.max(0, ttl));

        if (current > maxRequests) {
          res.setHeader("Retry-After", Math.max(1, ttl));
          return res.status(429).json({
            error: "Too Many Requests",
            message,
            retryAfterSeconds: Math.max(1, ttl),
          });
        }
        return next();
      } catch (err) {
        // Fail open if Redis operation errors
        return next();
      }
    }

    // Fallback: In-memory sliding window
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const userHistory = memoryFallback.get(identifier) || [];
    const recentRequests = userHistory.filter((timestamp) => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      const oldestRequest = recentRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      res.setHeader("Retry-After", Math.max(1, retryAfter));
      return res.status(429).json({
        error: "Too Many Requests",
        message,
        retryAfterSeconds: Math.max(1, retryAfter),
      });
    }

    recentRequests.push(now);
    memoryFallback.set(identifier, recentRequests);

    // Clean up memory map periodically
    if (memoryFallback.size > 1000) {
      for (const [id, timestamps] of memoryFallback.entries()) {
        const valid = timestamps.filter((t) => now - t < windowMs);
        if (valid.length === 0) memoryFallback.delete(id);
        else memoryFallback.set(id, valid);
      }
    }

    return next();
  };
};

/**
 * Pre-configured rate limiter for AI Chat & Voice synthesis
 */
export const aiRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 35,
  keyPrefix: "rl:ai",
  message: "You are sending voice/chat requests too quickly. Please pause for a moment.",
});
