import clientPromise from "../../../lib/mongodb";
import { verifyToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";
import { withAuth } from "../../../lib/middleware/withAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ req.user is already set by withAuth middleware
    const { userId } = req.user;

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get user's bookings first
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get payments from bookings (since payment data is stored in bookings)
    const bookings = await db
      .collection("bookings")
      .find({
        $or: [{ userId: new ObjectId(userId) }, { customerPhone: user.phone }],
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
export default withAuth(handler);
