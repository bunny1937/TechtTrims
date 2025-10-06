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

    // Get counts
    const totalSalons = await db.collection("salons").countDocuments();
    const totalUsers = await db.collection("users").countDocuments();
    const totalBookings = await db.collection("bookings").countDocuments();

    // Active salons
    const activeSalons = await db
      .collection("salons")
      .countDocuments({ isActive: true });

    // Total revenue from bookings
    const revenueData = await db
      .collection("bookings")
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ])
      .toArray();

    const totalRevenue = revenueData[0]?.total || 0;

    // Recent bookings
    const recentBookings = await db
      .collection("bookings")
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Bookings this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const bookingsThisMonth = await db.collection("bookings").countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    // Average rating
    const ratings = await db
      .collection("salons")
      .aggregate([
        { $group: { _id: null, avgRating: { $avg: "$ratings.overall" } } },
      ])
      .toArray();

    const avgRating = ratings[0]?.avgRating || 5.0;

    res.status(200).json({
      totalSalons,
      totalUsers,
      totalBookings,
      activeSalons,
      totalRevenue,
      bookingsThisMonth,
      avgRating: avgRating.toFixed(1),
      recentBookings,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
