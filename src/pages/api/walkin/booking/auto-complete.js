import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: "Missing bookingId" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get booking
    const booking = await db
      .collection("bookings")
      .findOne({ _id: new ObjectId(bookingId) });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Already completed or not in service
    if (booking.queueStatus !== "GREEN" || booking.isExpired) {
      return res
        .status(400)
        .json({ error: "Cannot auto-complete this booking" });
    }

    const serviceStarted = new Date(booking.serviceStartedAt);
    const duration =
      booking.selectedDuration || booking.estimatedDuration || 45;
    const gracePeriod = 5; // 5 min buffer
    const maxServiceTime = duration + gracePeriod;
    const elapsedMinutes = Math.floor(
      (new Date() - serviceStarted) / (1000 * 60)
    );

    // Only auto-complete if exceeded max time
    if (elapsedMinutes < maxServiceTime) {
      return res.status(400).json({
        error: "Service still within grace period",
        elapsed: elapsedMinutes,
        maxTime: maxServiceTime,
      });
    }

    console.log("🔴 [AUTO-COMPLETE] Service exceeded grace period:", {
      bookingCode: booking.code,
      elapsed: elapsedMinutes,
      maxTime: maxServiceTime,
    });

    // Mark as completed
    const result = await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          queueStatus: "COMPLETED",
          completedAt: new Date(),
          autoCompleted: true, // Track auto vs manual
          reason: "Auto-completed due to timeout",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Service auto-completed",
      booking: {
        bookingId: booking._id.toString(),
        code: booking.code,
        elapsed: elapsedMinutes,
      },
    });
  } catch (error) {
    console.error("❌ Auto-complete error:", error);
    res.status(500).json({ error: error.message });
  }
}
