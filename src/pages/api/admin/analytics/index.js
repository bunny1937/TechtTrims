import clientPromise from "../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../lib/adminAuth";
import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import {
  logAdminAction,
  AuditActions,
  getClientIP,
} from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  // AUTH/ADMIN CHECK
  if (!req.admin || !req.admin.adminId) {
    return res.status(401).json({ message: "Admin authentication required" });
  }

  const { adminId, username } = req.admin;
  try {
    const { adminId } = req.admin; // ✅ Already authenticated by middleware

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Peak hours
    const peakHours = await db
      .collection("bookings")
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { hour: "$_id", count: 1, _id: 0 } },
      ])
      .toArray();
    const peakHoursFormatted = peakHours.map(({ hour, count }) => {
      let hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const suffix = hour < 12 ? "am" : "pm";
      return {
        label: `${hour12} ${suffix}`,
        hourOriginal: hour,
        count,
      };
    });
    // Popular services
    const popularServices = await db
      .collection("bookings")
      .aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$service",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ])
      .toArray();

    // Get bookings from the last 7 days (last week)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekBookings = await db
      .collection("bookings")
      .find({
        status: "completed",
        createdAt: { $gte: weekAgo },
      })
      .toArray();

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayCounts = Array(7).fill(0);

    weekBookings.forEach((b) => {
      const dayIdx = new Date(b.createdAt).getDay();
      dayCounts[dayIdx]++;
    });

    const dayTrends = days.map((day, idx) => ({
      day,
      bookings: dayCounts[idx],
    }));

    // Top salons - FIXED to handle location properly
    const topSalons = await db
      .collection("salons")
      .aggregate([
        {
          $addFields: {
            totalBookings: { $ifNull: ["$stats.totalBookings", 0] },
            rating: { $ifNull: ["$ratings.overall", 5.0] },
          },
        },
        { $sort: { totalBookings: -1 } },
        { $limit: 10 },
        {
          $project: {
            salonName: 1,
            totalBookings: 1,
            rating: 1,
            location: "$location.address", // FIXED: Extract address properly
          },
        },
      ])
      .toArray();

    // Repeat customer rate
    const allUsers = await db.collection("users").countDocuments();
    const repeatUsers = await db.collection("users").countDocuments({
      $expr: { $gt: [{ $size: { $ifNull: ["$bookingHistory", []] } }, 1] },
    });
    const repeatRate =
      allUsers > 0 ? ((repeatUsers / allUsers) * 100).toFixed(1) : 0;

    // Average booking value
    const avgValue = await db
      .collection("bookings")
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, avg: { $avg: "$price" } } },
      ])
      .toArray();

    const avgBookingValue = Math.round(avgValue[0]?.avg || 0);

    // Average rating
    const avgRatingData = await db
      .collection("salons")
      .aggregate([{ $group: { _id: null, avg: { $avg: "$ratings.overall" } } }])
      .toArray();

    const avgRating = (avgRatingData[0]?.avg || 5.0).toFixed(1);
    // ✅ Log analytics access
    const analyticsData = {
      peakHours, // Already in your code
      popularServices, // "
      dayTrends, // "
      topSalons, // "
      repeatRate, // "
      avgBookingValue, // "
      avgRating, // "
    };

    await logAdminAction(
      adminId,
      username,
      AuditActions.VIEW_ANALYTICS,
      "Analytics",
      null,
      {
        metricsAccessed: Object.keys(analyticsData),
        timestamp: new Date(),
      },
      getClientIP(req),
      req.headers["user-agent"],
      "SUCCESS"
    );

    res.status(200).json({
      peakHours: peakHoursFormatted,
      popularServices:
        popularServices.length > 0
          ? popularServices
          : [{ name: "Haircut", count: 0 }],
      dayTrends,
      topSalons,
      repeatRate,
      avgBookingValue,
      avgRating,
    });
  } catch (error) {
    console.error("❌ Analytics API error:", error.message, error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
export default withAdminAuth(handler);
