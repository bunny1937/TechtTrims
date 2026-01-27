import { connectToDatabase } from "../../../lib/mongodb";
import { getCachedQueuePosition, cacheQueuePosition } from "../../../lib/redis";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId required" });
    }

    // ✅ Check Redis cache first
    const cached = await getCachedQueuePosition(bookingId);
    if (cached) {
      console.log("✅ Cache HIT for", bookingId);
      return res.status(200).json(cached);
    }

    console.log("❌ Cache MISS - fetching from DB");

    // ✅ Fetch from MongoDB
    const { db } = await connectToDatabase();

    const booking = await db.collection("bookings").findOne(
      { _id: new ObjectId(bookingId) },
      {
        projection: {
          queuePosition: 1,
          queueStatus: 1,
          barberId: 1,
          isExpired: 1,
        },
      },
    );

    if (!booking?.barberId) {
      return res.status(200).json({
        position: booking?.queuePosition ?? null,
        aheadOfYou: 0,
        serving: 0,
        status: booking?.queueStatus ?? "RED",
        isExpired: booking?.isExpired ?? false,
      });
    }

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Get queue stats
    const queueStats = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            barberId: booking.barberId,
            queueStatus: { $in: ["ORANGE", "GREEN"] },
            isExpired: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$queueStatus",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const servingCount = queueStats.find((s) => s._id === "GREEN")?.count || 0;

    const aheadCount = queueStats.find((s) => s._id === "ORANGE")?.count || 0;

    const position =
      booking.queueStatus === "RED"
        ? await db.collection("bookings").countDocuments({
            barberId: booking.barberId,
            queueStatus: "RED",
            createdAt: { $lte: booking.createdAt },
            isExpired: { $ne: true },
          })
        : booking.queuePosition;

    const arrived = await db.collection("bookings").countDocuments({
      barberId: booking.barberId,
      queueStatus: "ORANGE",
      isExpired: { $ne: true },
    });

    const serving = await db.collection("bookings").countDocuments({
      barberId: booking.barberId,
      queueStatus: "GREEN",
      isExpired: { $ne: true },
    });

    const AVG_SERVICE_TIME = 45;

    // ✅ DEFINE TOTAL QUEUE COUNT (RED + ORANGE + GREEN, non-expired)
    const totalQueueCount = await db.collection("bookings").countDocuments({
      barberId: booking.barberId,
      queueStatus: { $in: ["RED", "ORANGE", "GREEN"] },
      isExpired: { $ne: true },
    });

    const booked = Math.max(totalQueueCount - arrived - serving, 0);

    const estimatedWait =
      booking.queueStatus === "ORANGE"
        ? arrived * AVG_SERVICE_TIME
        : booking.queueStatus === "RED"
          ? (arrived + booked) * AVG_SERVICE_TIME
          : 0;
    const response = {
      position,
      arrived,
      serving,
      booked,
      status: booking.queueStatus,
      estimatedWait,
      // 🔥 expiry ONLY valid for RED queue
      isExpired:
        booking.queueStatus === "RED" ? booking.isExpired || false : false,
      // 🔥 ADD THESE
      serviceStartedAt: booking.serviceStartedAt || null,
      estimatedDuration: booking.estimatedDuration || null,
      serviceEndedAt: booking.serviceEndedAt || null,
      actualServiceMinutes: booking.actualServiceMinutes || null,
    };

    // ✅ Cache for 5 seconds
    await cacheQueuePosition(bookingId, response);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Queue position error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
