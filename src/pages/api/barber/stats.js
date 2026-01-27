// src/pages/api/barber/stats.js - Dashboard stats
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId } = req.query;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const barberObjectId = new ObjectId(barberId);

    // Today's date
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get today's bookings
    const todayBookings = await db
      .collection("bookings")
      .find({
        barberId: { $in: [barberId, barberObjectId] },
        date: todayStr,
        isExpired: { $ne: true },
      })
      .toArray();

    // Calculate stats
    const completedToday = todayBookings.filter(
      (b) => b.queueStatus === "COMPLETED",
    ).length;

    const todayEarnings = todayBookings
      .filter((b) => b.queueStatus === "COMPLETED")
      .reduce((sum, b) => sum + (b.price || 0), 0);

    // Get barber details for rating
    const barber = await db
      .collection("barbers")
      .findOne(
        { _id: barberObjectId },
        { projection: { rating: 1, totalBookings: 1 } },
      );

    return res.status(200).json({
      todayBookings: todayBookings.length,
      completedToday,
      todayEarnings,
      rating: barber?.rating || 5.0,
      totalBookings: barber?.totalBookings || 0,
    });
  } catch (error) {
    console.error("[Barber Stats] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
