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

    // ✅ Calculate REAL-TIME queue position
    let queuePosition = null;

    if (booking.queueStatus === "ORANGE" && booking.barberId) {
      // Count ONLY ORANGE bookings that checked in BEFORE this one
      const position = await db.collection("bookings").countDocuments({
        barberId: booking.barberId,
        salonId: booking.salonId,
        queueStatus: "ORANGE",
        isExpired: { $ne: true },
        arrivedAt: { $lt: booking.arrivedAt || booking.createdAt },
      });
      queuePosition = position + 1;
    } else if (booking.queueStatus === "RED") {
      queuePosition = "Not Arrived";
    } else if (booking.queueStatus === "GREEN") {
      queuePosition = "In Service";
    } else if (booking.queueStatus === "COMPLETED") {
      queuePosition = "Completed";
    } else {
      queuePosition = "Pending";
    }

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
