// src/lib/rateLimit.js - COMPLETE REPLACEMENT

// Use Redis in production for distributed rate limiting
const rateLimit = new Map();

export function checkRateLimit(
  identifier,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
) {
  const now = Date.now();
  const key = `limit:${identifier}`;

  // Get existing attempts
  const attempts = rateLimit.get(key) || [];

  // Filter out expired attempts
  const validAttempts = attempts.filter(
    (timestamp) => now - timestamp < windowMs
  );

  // Check if limit exceeded
  if (validAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...validAttempts);
    const timeUntilReset = Math.ceil(
      (windowMs - (now - oldestAttempt)) / 1000 / 60
    );

    return {
      allowed: false,
      remaining: 0,
      resetIn: timeUntilReset,
      retryAfter: Math.ceil((windowMs - (now - oldestAttempt)) / 1000),
    };
  }

  // Add current attempt
  validAttempts.push(now);
  rateLimit.set(key, validAttempts);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    cleanupRateLimit(windowMs);
  }

  return {
    allowed: true,
    remaining: maxAttempts - validAttempts.length,
    resetIn: null,
  };
}

function cleanupRateLimit(windowMs) {
  const now = Date.now();
  for (const [key, attempts] of rateLimit.entries()) {
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < windowMs
    );
    if (validAttempts.length === 0) {
      rateLimit.delete(key);
    } else {
      rateLimit.set(key, validAttempts);
    }
  }
}

// Add IP-based rate limiting for sensitive endpoints
export function checkIPRateLimit(req, maxAttempts = 10, windowMs = 60 * 1000) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    "unknown";

  return checkRateLimit(`ip:${ip}`, maxAttempts, windowMs);
}
