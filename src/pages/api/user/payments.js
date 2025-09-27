import clientPromise from "../../../lib/mongodb";
import { verifyToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get user's bookings first
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get payments from bookings (since payment data is stored in bookings)
    const bookings = await db
      .collection("bookings")
      .find({
        $or: [
          { userId: new ObjectId(decoded.userId) },
          { customerPhone: user.phone },
        ],
        price: { $gt: 0 }, // Only bookings with payment
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Transform bookings to payment format
    const payments = bookings.map((booking) => ({
      _id: booking._id,
      amount: booking.price || 0,
      bookingId: booking._id,
      status: booking.paymentStatus || "pending",
      createdAt: booking.createdAt,
      service: booking.service,
      date: booking.date,
    }));

    res.status(200).json(payments);
  } catch (error) {
    console.error("User payments API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
