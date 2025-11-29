// /src/pages/api/salons/[id]/barber-queue.js
import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { barberId } = req.query;

    if (!id || !barberId) {
      return res.status(400).json({ message: "Missing salonId or barberId" });
    }

    const { db } = await connectToDatabase();

    let salonObjectId, barberObjectId;
    try {
      salonObjectId = new ObjectId(id);
      barberObjectId = new ObjectId(barberId);
    } catch (err) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Get barber info
    const barber = await db
      .collection("barbers")
      .findOne({ _id: barberObjectId });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    const now = new Date();
    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

    const bookings = await db
      .collection("bookings")
      .find({
        salonId: salonObjectId,
        barberId: barberObjectId,
        isExpired: false,
        queueStatus: { $in: ["RED", "ORANGE", "GREEN"] },
        $or: [
          { queueStatus: { $ne: "RED" } },
          { expiresAt: { $gt: bufferTime } },
        ],
      })
      .sort([
        ["queueStatus", -1], // GREEN first
        ["arrivedAt", 1], // Then by arrival
        ["createdAt", 1], // Then by booking
      ])
      .toArray();

    // Separate by status
    const serving = bookings.find((b) => b.queueStatus === "GREEN");
    const orangeBookings = bookings.filter((b) => b.queueStatus === "ORANGE");
    const redBookings = bookings.filter((b) => b.queueStatus === "RED");

    // Format queue data with SAFE customerName
    const queue = bookings.map((booking, index) => ({
      _id: booking._id.toString(),
      customerName: booking.customerName || "Guest", // ✅ SAFE DEFAULT
      queueStatus: booking.queueStatus,
      queuePosition:
        booking.queueStatus === "ORANGE"
          ? orangeBookings.findIndex((b) => b._id.equals(booking._id)) + 1
          : null,
      arrivedAt: booking.arrivedAt ? booking.arrivedAt.toISOString() : null,
      expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
      expectedCompletionTime: booking.expectedCompletionTime
        ? booking.expectedCompletionTime.toISOString()
        : null,
      service: booking.service,
    }));

    // Calculate estimated wait
    let estimatedWait = 0;
    if (serving?.expectedCompletionTime) {
      const remaining = Math.ceil(
        (new Date(serving.expectedCompletionTime) - now) / 1000 / 60
      );
      estimatedWait = Math.max(0, remaining);
    }
    estimatedWait += orangeBookings.length * 30;

    res.status(200).json({
      success: true,
      chairNumber: barber.chairNumber || 1,
      queue: queue,
      serving: serving
        ? {
            customerName: serving.customerName || "Guest", // ✅ SAFE DEFAULT
            expectedCompletionTime:
              serving.expectedCompletionTime?.toISOString(),
          }
        : null,
      priorityQueueCount: orangeBookings.length,
      bookedCount: redBookings.length,
      estimatedWait: estimatedWait,
      totalInQueue: queue.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("❌ Barber queue API error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
