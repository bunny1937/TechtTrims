import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Fetch barber details if assigned
    let barber = null;
    if (booking.barberId) {
      barber = await db.collection("barbers").findOne({
        _id: booking.barberId,
      });
    }

    // Calculate real-time queue status for prebook
    const now = new Date();
    const scheduledTime = new Date(booking.scheduledFor);
    const oneHourBefore = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
    console.log("🕐 Now:", now);
    console.log("⏰ Scheduled:", scheduledTime);
    console.log("⏰ One Hour Before:", oneHourBefore);
    console.log("📊 Current Status:", booking.queueStatus);

    // Update queueStatus based on time
    let currentQueueStatus = booking.queueStatus;

    if (booking.queueStatus === "PREBOOK_PENDING" && now >= oneHourBefore) {
      // Activate priority queue
      currentQueueStatus = "RED";
      await db.collection("bookings").updateOne(
        { _id: booking._id },
        {
          $set: {
            queueStatus: "RED",
            priorityQueueActivatedAt: now,
          },
        },
      );
    }

    res.status(200).json({
      success: true,
      booking: {
        ...booking,
        _id: booking._id.toString(),
        salonId: booking.salonId?.toString() || booking.salonId, // ✅ Handle both ObjectId and string
        barberId: booking.barberId?.toString() || booking.barberId, // ✅ Handle null
        barberName: barber?.name || booking.barber,
        chairNumber: barber?.chairNumber || null,
        queueStatus: currentQueueStatus || booking.queueStatus, // ✅ Fallback
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        service: booking.service,
        date: booking.date,
        time: booking.time,
        price: booking.price,
        bookingCode: booking.bookingCode,
        bookingType: booking.bookingType,
        scheduledFor: booking.scheduledFor,
        arrivedAt: booking.arrivedAt,
        serviceStartedAt: booking.serviceStartedAt,
        feedback: booking.feedback,
      },
    });
  } catch (error) {
    console.error("[Fetch Prebook Error]:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
