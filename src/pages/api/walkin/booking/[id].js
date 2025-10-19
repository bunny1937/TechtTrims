import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    let barber = null;
    if (booking.barberId) {
      barber = await db.collection("barbers").findOne({
        _id: booking.barberId,
      });
    }

    const salon = await db.collection("salons").findOne({
      _id: booking.salonId,
    });

    // ✅ CRITICAL FIX: Use STORED position only
    let queuePosition = booking.queuePosition || null;

    // Only calculate if missing
    if (!queuePosition && booking.barberId) {
      console.warn("⚠️ Position missing:", booking.bookingCode);

      const allBookings = await db
        .collection("bookings")
        .find({
          barberId: booking.barberId,
          salonId: booking.salonId,
          queueStatus: { $in: ["RED", "ORANGE"] },
          isExpired: { $ne: true },
        })
        .sort({ createdAt: 1 })
        .toArray();

      const index = allBookings.findIndex(
        (b) => b._id.toString() === booking._id.toString()
      );
      queuePosition = index >= 0 ? index + 1 : null;

      if (queuePosition) {
        await db
          .collection("bookings")
          .updateOne({ _id: booking._id }, { $set: { queuePosition } });
      }
    } else if (!queuePosition) {
      queuePosition = "Pending Assignment";
    }

    console.log("📊 Queue:", {
      code: booking.bookingCode,
      barber: barber?.name,
      position: queuePosition,
      status: booking.queueStatus,
    });

    res.status(200).json({
      booking: {
        ...booking,
        _id: booking._id.toString(),
        salonId: booking.salonId.toString(),
        barberId: booking.barberId ? booking.barberId.toString() : null,
        barberName: barber?.name || booking.barber || "Unassigned",
        chairNumber: barber?.chairNumber || 1,
        salonName: salon?.salonName || "Unknown Salon",
        salonLocation: salon?.location?.address || null,
        salonCoordinates: salon?.location?.coordinates || null,
        queuePosition,
      },
    });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
