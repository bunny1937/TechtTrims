import clientPromise from "../../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../../lib/adminAuth";
import { ObjectId } from "mongodb";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    const client = await clientPromise;
    const db = client.db("techtrims");

    // userId is stored as ObjectId
    const bookings = await db
      .collection("bookings")
      .find({ userId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get salon names
    const bookingsWithSalon = await Promise.all(
      bookings.map(async (booking) => {
        const salon = await db.collection("salons").findOne({
          _id: new ObjectId(booking.salonId),
        });
        return {
          ...booking,
          salonName: salon?.salonName || "Unknown Salon",
        };
      })
    );

    res.status(200).json({ bookings: bookingsWithSalon });
  } catch (error) {
    console.error("Fetch user bookings error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
export default withAdminAuth(handler);
