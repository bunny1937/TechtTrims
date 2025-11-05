import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  // Protect with secret key
  if (req.headers["x-api-key"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const now = new Date();

    // Find all GREEN bookings that exceeded max time
    const bookings = await db
      .collection("bookings")
      .find({
        queueStatus: "GREEN",
        isExpired: { $ne: true },
      })
      .toArray();

    let autoCompleted = 0;

    for (const booking of bookings) {
      const serviceStarted = new Date(booking.serviceStartedAt);
      const duration =
        booking.selectedDuration || booking.estimatedDuration || 45;
      const extended = booking.timeExtended || 0;
      const maxServiceTime = duration + extended + 5; // 5min grace
      const elapsedMinutes = Math.floor((now - serviceStarted) / (1000 * 60));

      if (elapsedMinutes >= maxServiceTime) {
        await db.collection("bookings").updateOne(
          { _id: booking._id },
          {
            $set: {
              queueStatus: "COMPLETED",
              completedAt: now,
              autoCompleted: true,
              reason: "Auto-completed by cron job",
            },
          }
        );

        console.log("🔴 [AUTO-CRON] Auto-completed:", {
          code: booking.bookingCode,
          elapsed: elapsedMinutes,
          max: maxServiceTime,
        });

        autoCompleted++;
      }
    }

    res.status(200).json({
      success: true,
      autoCompleted,
      timestamp: now,
    });
  } catch (error) {
    console.error("❌ Cron error:", error);
    res.status(500).json({ error: error.message });
  }
}
