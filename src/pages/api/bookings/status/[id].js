import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    const client = await clientPromise;
    const db = client.db("techtrims");

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ✅ USE STORED POSITION ONLY
    const queuePosition = booking.queuePosition || "Pending";

    res.status(200).json({
      status: booking.status,
      queueStatus: booking.queueStatus,
      queuePosition,
      isExpired:
        booking.isExpired ||
        (booking.expiresAt && new Date(booking.expiresAt) < new Date()),
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
