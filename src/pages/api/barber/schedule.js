// src/pages/api/barber/schedule.js
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, date, status } = req.query;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Parse date or use today
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query
    const query = {
      barberId: new ObjectId(barberId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      isExpired: { $ne: true },
    };

    // Add status filter if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Fetch bookings
    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ createdAt: 1 }) // Sort by time ascending
      .toArray();

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = {
      today: await db.collection("bookings").countDocuments({
        barberId: new ObjectId(barberId),
        createdAt: { $gte: today, $lt: tomorrow },
        isExpired: { $ne: true },
      }),
      upcoming: await db.collection("bookings").countDocuments({
        barberId: new ObjectId(barberId),
        createdAt: { $gte: tomorrow },
        isExpired: { $ne: true },
        status: { $nin: ["completed", "cancelled"] },
      }),
      completed: await db.collection("bookings").countDocuments({
        barberId: new ObjectId(barberId),
        status: "completed",
      }),
      cancelled: await db.collection("bookings").countDocuments({
        barberId: new ObjectId(barberId),
        status: "cancelled",
      }),
    };

    return res.status(200).json({
      bookings: bookings.map((b) => ({
        _id: b._id,
        bookingCode: b.bookingCode,
        customerName: b.customerName || "Guest",
        customerPhone: b.customerPhone,
        service: b.service,
        status: b.status,
        queueStatus: b.queueStatus,
        queuePosition: b.queuePosition,
        estimatedDuration: b.estimatedDuration,
        createdAt: b.createdAt,
        arrivedAt: b.arrivedAt,
        serviceStartedAt: b.serviceStartedAt,
        serviceEndedAt: b.serviceEndedAt,
      })),
      stats,
    });
  } catch (error) {
    console.error("[Schedule API] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
