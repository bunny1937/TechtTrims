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

    // Get queue position if ORANGE
    let queuePosition = null;
    if (booking.queueStatus === "ORANGE") {
      queuePosition = await db.collection("bookings").countDocuments({
        salonId: booking.salonId,
        queueStatus: "ORANGE",
        arrivedAt: { $lte: booking.arrivedAt },
      });
    }

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
