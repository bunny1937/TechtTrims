import clientPromise from "../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const admin = verifyAdminToken(req);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get all users
    const users = await db
      .collection("users")
      .find({}, { projection: { hashedPassword: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    // Get booking counts for each user
    const usersWithBookings = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await db.collection("bookings").countDocuments({
          $or: [{ userId: user._id }, { customerPhone: user.phone }],
        });

        return {
          ...user,
          totalBookings: bookingCount,
        };
      })
    );

    res.status(200).json({ users: usersWithBookings });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
