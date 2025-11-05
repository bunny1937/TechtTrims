import { connectToDatabase } from "../../../lib/mongodb";
import {
  getPriorityQueuePosition,
  expireOldBookings,
  calculateWaitTime,
} from "../../../lib/walkinHelpers";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId required" });
    }

    const { db } = await connectToDatabase();

    // Get booking details first
    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Expire old bookings for this barber
    await expireOldBookings(db, booking.barberId.toString());

    // Get queue position
    const position = await getPriorityQueuePosition(
      db,
      booking.barberId.toString(),
      bookingId
    );

    // Calculate wait time
    const waitTime = await calculateWaitTime(db, booking.barberId.toString());

    res.status(200).json({
      position: position || "Not Arrived",
      waitTime,
      queueStatus: booking.queueStatus,
      isExpired: booking.isExpired || false,
    });
  } catch (error) {
    console.error("Queue position API error:", error);
    res.status(500).json({ error: "Failed to fetch queue position" });
  }
}
