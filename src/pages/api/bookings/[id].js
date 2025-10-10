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

    // Get salon name
    if (booking.salonId) {
      const salon = await db.collection("salons").findOne({
        _id: new ObjectId(booking.salonId),
      });
      booking.salonName = salon?.salonName || "Unknown Salon";
    }

    // Convert ObjectId to string
    booking._id = booking._id.toString();
    if (booking.salonId) booking.salonId = booking.salonId.toString();
    if (booking.barberId) booking.barberId = booking.barberId.toString();

    res.status(200).json({ booking });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
