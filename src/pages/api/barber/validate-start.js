import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { bookingId, barberId } = req.body;

    if (!bookingId || !barberId) {
      return res.status(400).json({ 
        canStart: false,
        reason: "Missing bookingId or barberId" 
      });
    }

    const { db } = await connectToDatabase();

    // Get the booking
    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    if (!booking) {
      return res.status(404).json({ 
        canStart: false,
        reason: "Booking not found" 
      });
    }

    // ✅ CHECK 1: Must be in ORANGE status
    if (booking.queueStatus !== "ORANGE") {
      return res.status(400).json({
        canStart: false,
        reason: `Customer is not checked in (status: ${booking.queueStatus})`,
      });
    }

    // ✅ CHECK 2: No one else should be in GREEN for this barber
    const currentlyServing = await db.collection("bookings").findOne({
      $or: [
        { barberId: new ObjectId(barberId) },
        { barberId: barberId }
      ],
      queueStatus: "GREEN",
      _id: { $ne: new ObjectId(bookingId) },
    });

    if (currentlyServing) {
      return res.status(400).json({
        canStart: false,
        reason: `${currentlyServing.customerName} is currently being served`,
      });
    }

    // ✅ CHECK 3: Must be #1 in ORANGE queue (with priority)
    const orangeQueue = await db
      .collection("bookings")
      .find({
        $or: [
          { barberId: new ObjectId(barberId) },
          { barberId: barberId }
        ],
        queueStatus: "ORANGE",
      })
      .toArray();

    // Sort by priority (prebook first, then by arrival time)
    orangeQueue.sort((a, b) => {
      const aIsPrebook = a.bookingType === "PREBOOK";
      const bIsPrebook = b.bookingType === "PREBOOK";

      if (aIsPrebook && !bIsPrebook) return -1;
      if (!aIsPrebook && bIsPrebook) return 1;

      const aTime = new Date(a.arrivedAt || a.createdAt);
      const bTime = new Date(b.arrivedAt || b.createdAt);
      return aTime - bTime;
    });

    if (orangeQueue[0]?._id.toString() !== booking._id.toString()) {
      return res.status(400).json({
        canStart: false,
        reason: `${orangeQueue[0]?.customerName} should be served first (position #1)`,
      });
    }

    // ✅ CHECK 4: Prebook time validation
    if (booking.bookingType === "PREBOOK" && booking.scheduledFor) {
      const now = new Date();
      const appointmentTime = new Date(booking.scheduledFor);
      const minutesUntilAppointment = (appointmentTime - now) / (60 * 1000);

      if (minutesUntilAppointment > 10) {
        return res.status(400).json({
          canStart: false,
          reason: `Appointment is in ${Math.ceil(minutesUntilAppointment)} minutes - too early to start`,
        });
      }
    }

    // ✅ ALL CHECKS PASSED
    return res.status(200).json({
      canStart: true,
      message: "Can start service",
    });
  } catch (error) {
    console.error("❌ Validate start error:", error);
    return res.status(500).json({
      canStart: false,
      reason: "Server error: " + error.message,
    });
  }
}
