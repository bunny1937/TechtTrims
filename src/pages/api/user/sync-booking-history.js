import clientPromise from "../../../lib/mongodb";
import { verifyToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";
import { withAuth } from "../../../lib/middleware/withAuth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ req.user is already set by withAuth middleware
    const { userId } = req.user;

    const client = await clientPromise;
    const db = client.db("techtrims");

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find all bookings for this user
    const allBookings = await db
      .collection("bookings")
      .find({
        $or: [
          { userId: new ObjectId(userId) },
          { customerPhone: user.phone },
          { customerName: { $regex: user.name, $options: "i" } },
        ],
      })
      .toArray();

    // Update bookings with userId if not set
    const bookingsToUpdate = allBookings.filter((b) => !b.userId);
    if (bookingsToUpdate.length > 0) {
      await db
        .collection("bookings")
        .updateMany(
          { _id: { $in: bookingsToUpdate.map((b) => b._id) } },
          { $set: { userId: new ObjectId(userId) } }
        );
    }

    // Update user's booking history
    const bookingIds = allBookings.map((b) => b._id);
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          bookingHistory: bookingIds,
        },
      }
    );

    res.status(200).json({
      message: "Booking history synced successfully",
      totalBookings: allBookings.length,
      newlyLinked: bookingsToUpdate.length,
    });
  } catch (error) {
    console.error("Sync booking history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default withAuth(handler);
