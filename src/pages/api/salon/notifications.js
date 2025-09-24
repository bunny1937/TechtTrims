// pages/api/salon/notifications.js
// Simple Server-Sent Events (SSE) endpoint for salon dashboards to subscribe to live notifications.
// Note: This is a simple in-memory solution for dev. For production use Redis/Message broker.

const subscribers = {}; // { salonId: [res, ...] }

export default async function handler(req, res) {
  const { salonId } = req.query;
  if (!salonId) return res.status(400).json({ message: "Missing salonId" });
  // Set SSE headers
  res.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
  });
  res.write("\n");

  subscribers[salonId] = subscribers[salonId] || [];
  subscribers[salonId].push(res);

  req.on("close", () => {
    subscribers[salonId] = subscribers[salonId].filter((r) => r !== res);
  });
}

// Provide a small helper to publish (other modules can import this file and call publish)
export function publish(salonId, payload) {
  const list = subscribers[salonId] || [];
  list.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {}
  });
}
