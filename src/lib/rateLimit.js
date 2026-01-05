import redis from "./redis";

const memoryStore = new Map();

/**
 * Rate limit helper
 * @param {string} key
 * @param {number} limit
 * @param {number} windowMs
 */
export async function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const resetAt = now + windowMs;

  try {
    // 🔹 Redis path
    const redisKey = `rate:${key}`;

    const current = await redis.get(redisKey);

    if (!current) {
      await redis.set(
        redisKey,
        {
          count: 1,
          resetAt,
        },
        { ex: Math.ceil(windowMs / 1000) }
      );

      return {
        allowed: true,
        remaining: limit - 1,
        resetIn: Math.ceil(windowMs / 60000),
      };
    }

    const data = typeof current === "string" ? JSON.parse(current) : current;

    if (data.count >= limit) {
      const retryMs = Math.max(0, data.resetAt - now);

      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.max(1, Math.ceil(retryMs / 60000)),
      };
    }

    await redis.set(
      redisKey,
      {
        count: data.count + 1,
        resetAt: data.resetAt,
      },
      { ex: Math.ceil((data.resetAt - now) / 1000) }
    );

    return {
      allowed: true,
      remaining: limit - data.count - 1,
      resetIn: Math.ceil((data.resetAt - now) / 60000),
    };
  } catch (err) {
    // 🔹 MEMORY FALLBACK (SAFE)
    const entry = memoryStore.get(key);

    if (!entry || entry.resetAt < now) {
      memoryStore.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetIn: Math.ceil(windowMs / 60000),
      };
    }

    if (entry.count >= limit) {
      const retryMs = Math.max(0, entry.resetAt - now);
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.max(1, Math.ceil(retryMs / 60000)),
      };
    }

    entry.count += 1;
    memoryStore.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetIn: Math.ceil((entry.resetAt - now) / 60000),
    };
  }
}
// ✅ IP-based rate limiting
export async function checkIPRateLimit(
  req,
  maxAttempts = 10,
  windowMs = 60 * 1000
) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown";

  return await checkRateLimit(`ip:${ip}`, maxAttempts, windowMs);
}
