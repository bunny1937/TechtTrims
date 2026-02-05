// ✅ Minimal ping endpoint for health checks only
export default function handler(req, res) {
  // Set cache headers to reduce unnecessary requests
  res.setHeader("Cache-Control", "public, max-age=60"); // Cache for 1 minute

  return res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
  });
}
