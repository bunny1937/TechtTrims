import { checkIPRateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  try {
    // Apply rate limit (30 requests per minute)
    const rateLimitResult = await checkIPRateLimit(req, 30, 60000);

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: rateLimitResult.retryAfter,
        resetIn: rateLimitResult.resetIn,
      });
    }

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ping error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
