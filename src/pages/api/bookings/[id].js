import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Get salon details
    const salon = await db.collection("salons").findOne({
      _id: booking.salonId,
    });

    // Get barber details
    const barber = booking.barberId
      ? await db.collection("barbers").findOne({ _id: booking.barberId })
      : null;

    res.status(200).json({
      booking: {
        ...booking,
        _id: booking._id.toString(),
        salonId: booking.salonId.toString(),
        barberId: booking.barberId?.toString(),
        salonName: salon?.salonName || "Unknown",
        barberName: barber?.name || booking.barber || "Unassigned",
      },
    });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
