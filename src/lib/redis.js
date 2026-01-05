// lib/redis.js - UPSTASH REST VERSION (No password needed)
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ✅ Helper: Cache with TTL
export async function cacheQueuePosition(bookingId, data) {
  try {
    await redis.setex(`queue:${bookingId}`, 5, JSON.stringify(data));
    console.log("✅ Cached queue position:", bookingId);
  } catch (error) {
    console.error("Redis cache error:", error);
  }
}

// ✅ Helper: Get cached data
export async function getCachedQueuePosition(bookingId) {
  try {
    const cached = await redis.get(`queue:${bookingId}`);
    return cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export default redis;
