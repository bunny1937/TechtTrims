import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id) {
      console.error("❌ No salon ID provided");
      return res.status(400).json({ message: "Invalid salon ID" });
    }

    let salonObjectId;
    try {
      salonObjectId = new ObjectId(id);
    } catch (err) {
      console.error("❌ Invalid ObjectId format:", id);
      return res.status(400).json({ message: "Invalid salon ID format" });
    }

    // ✅ CORRECT: destructure client and db
    const { client, db } = await connectToDatabase();
    const now = new Date();

    console.log("📍 Fetching bookings for salon:", id);

    // Step 1: Auto-expire RED bookings that exceeded 45 minutes
    try {
      const expireResult = await db.collection("bookings").updateMany(
        {
          salonId: salonObjectId,
          queueStatus: "RED",
          isExpired: false,
          expiresAt: { $lt: now },
        },
        {
          $set: {
            isExpired: true,
            queueStatus: "EXPIRED",
            lastUpdated: now,
          },
        }
      );
    } catch (expireErr) {
      console.error("⚠️ Error auto-expiring bookings:", expireErr.message);
    }

    // Step 2: Fetch ALL active bookings for this salon
    let bookings = [];
    try {
      bookings = await db
        .collection("bookings")
        .find({
          salonId: salonObjectId,
          isExpired: { $ne: true },
          queueStatus: { $in: ["RED", "ORANGE", "GREEN"] },
        })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (findErr) {
      console.error("❌ Error finding bookings:", findErr.message);
      return res.status(500).json({
        message: "Error fetching bookings from database",
        error: findErr.message,
      });
    }

    // Step 3: Format bookings for frontend
    const formattedBookings = bookings
      .map((booking) => {
        try {
          return {
            _id: booking._id ? booking._id.toString() : null,
            bookingCode: booking.bookingCode || "N/A",
            customerName: booking.customerName || "Guest",
            customerPhone: booking.customerPhone || null,
            barberId: booking.barberId ? booking.barberId.toString() : null,
            barber: booking.barber || "Unassigned",
            queueStatus: booking.queueStatus || "RED",
            queuePosition: booking.queuePosition || null,
            service: booking.service || null,
            serviceStartedAt: booking.serviceStartedAt
              ? booking.serviceStartedAt.toISOString()
              : null,
            arrivedAt: booking.arrivedAt
              ? booking.arrivedAt.toISOString()
              : null,
            expiresAt: booking.expiresAt
              ? booking.expiresAt.toISOString()
              : null,
            expectedCompletionTime: booking.expectedCompletionTime
              ? booking.expectedCompletionTime.toISOString()
              : null,
            status: booking.status || "confirmed",
            isExpired: booking.isExpired || false,
            createdAt: booking.createdAt
              ? booking.createdAt.toISOString()
              : null,
          };
        } catch (formatErr) {
          console.error("⚠️ Error formatting booking:", formatErr.message);
          return null;
        }
      })
      .filter((b) => b !== null); // Remove any null entries

    res.status(200).json({
      success: true,
      bookings: formattedBookings,
      totalCount: formattedBookings.length,
      stats: {
        red: formattedBookings.filter((b) => b.queueStatus === "RED").length,
        orange: formattedBookings.filter((b) => b.queueStatus === "ORANGE")
          .length,
        green: formattedBookings.filter((b) => b.queueStatus === "GREEN")
          .length,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("❌❌❌ BOOKINGS-DETAILED API ERROR:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
