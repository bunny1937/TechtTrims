import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId } = req.query;

    if (!salonId) {
      return res.status(400).json({ message: "salonId is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const now = new Date();
    const expiredResult = await db.collection("bookings").updateMany(
      {
        salonId: new ObjectId(salonId),
        queueStatus: "RED",
        expiresAt: { $lt: now },
        isExpired: false,
      },
      {
        $set: {
          isExpired: true,
          queueStatus: "EXPIRED",
        },
      }
    );

    // Get all barbers
    const barbers = await db
      .collection("barbers")
      .find({
        salonId: new ObjectId(salonId),
      })
      .toArray();

    // Simple barber states
    const barberStates = await Promise.all(
      barbers.map(async (barber) => {
        let timeLeft = 0;
        let currentCustomer = null;

        if (
          barber.currentStatus === "OCCUPIED" &&
          barber.currentServiceEndTime
        ) {
          const now = new Date();
          const endTime = new Date(barber.currentServiceEndTime);
          timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000 / 60));
          currentCustomer = barber.currentCustomerName || null;
        }

        // Count queue for this barber
        const queueCount = await db.collection("bookings").countDocuments({
          barberId: barber._id,
          queueStatus: "ORANGE",
          isExpired: { $ne: true },
        });

        return {
          barberId: barber._id.toString(),
          name: barber.name,
          chairNumber: barber.chairNumber || 1,
          status: barber.currentStatus || "AVAILABLE",
          timeLeft,
          queueCount,
          currentCustomer,
          isPaused: barber.isPaused || false, // ✅ ADD THIS
        };
      })
    );

    // Count RED bookings - Only count non-expired, future expiry
    const redCount = await db.collection("bookings").countDocuments({
      salonId: new ObjectId(salonId),
      queueStatus: "RED", // GREY UI - booked but not arrived
      isExpired: false, // NOT expired yet
      expiresAt: { $gt: now }, // Expiry time still in future
    });

    // Count ORANGE bookings - Arrived users in priority queue (GOLDEN UI)
    const orangeCount = await db.collection("bookings").countDocuments({
      salonId: new ObjectId(salonId),
      queueStatus: "ORANGE", // GOLDEN UI - arrived at salon
      isExpired: false,
      arrivedAt: { $exists: true }, // Must have arrival timestamp
    });

    // Count GREEN bookings - Currently being served
    const greenCount = await db.collection("bookings").countDocuments({
      salonId: new ObjectId(salonId),
      queueStatus: "GREEN", // GREEN UI - serving now
      isExpired: false,
      serviceStartedAt: { $exists: true }, // Service must have started
    });

    const availableCount = barbers.filter((b) => !b.currentBookingId).length;

    // ✅ Calculate average wait time from current services
    const servingBookings = await db
      .collection("bookings")
      .find({
        salonId: new ObjectId(salonId),
        queueStatus: "GREEN",
        isExpired: { $ne: true },
      })
      .toArray();

    let totalTimeLeft = 0;
    servingBookings.forEach((b) => {
      if (b.expectedCompletionTime) {
        const timeLeft = Math.max(
          0,
          Math.ceil(
            (new Date(b.expectedCompletionTime) - new Date()) / 1000 / 60
          )
        );
        totalTimeLeft += timeLeft;
      }
    });

    // ✅ CORRECT: Total wait = GREEN time left + ORANGE durations (NO DIVISION)
    const avgWaitTime =
      greenCount > 0 && orangeCount === 0
        ? Math.round(totalTimeLeft / greenCount) // Only GREEN → avg time left per barber
        : orangeCount > 0
        ? totalTimeLeft + orangeCount * 30 // GREEN time left + ORANGE waiting time
        : 0;

    res.status(200).json({
      barbers: barberStates,
      totalServing: greenCount,
      totalWaiting: orangeCount,
      totalBooked: redCount,
      availableNow: barberStates.filter((b) => b.status === "AVAILABLE").length,
      avgWaitTime,
      statusCounts: {
        RED: redCount,
        ORANGE: orangeCount,
        GREEN: greenCount,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Salon state error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      stack: error.stack,
    });
  }
}
