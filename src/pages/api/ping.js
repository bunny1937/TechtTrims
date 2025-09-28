export default function handler(req, res) {
  // Simple ping endpoint for connection testing
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
