import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { salonId } = req.query;

    if (!salonId) {
      return res.status(400).json({ error: "salonId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // ✅ SINGLE aggregation pipeline
    const [stats] = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            salonId: new ObjectId(salonId),
            date: todayStr,
          },
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            activeQueue: {
              $sum: {
                $cond: [{ $in: ["$queueStatus", ["ORANGE", "GREEN"]] }, 1, 0],
              },
            },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, "$price", 0],
              },
            },
          },
        },
      ])
      .toArray();

    // Count active barbers
    const barbersActive = await db.collection("barbers").countDocuments({
      salonId: new ObjectId(salonId),
      isAvailable: true,
    });

    return res.status(200).json({
      todayBookings: stats?.totalBookings || 0,
      activeQueue: stats?.activeQueue || 0,
      revenueToday: stats?.revenue || 0,
      barbersActive,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
