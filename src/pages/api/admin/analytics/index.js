import clientPromise from "../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../lib/adminAuth";
import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import { logAdminAction, AuditActions } from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { adminId } = req.admin; // ✅ Already authenticated by middleware

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Peak hours
    const peakHours = await db
      .collection("bookings")
      .aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$time",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { hour: "$_id", count: 1, _id: 0 } },
      ])
      .toArray();

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

    // Day-wise trends (last 7 days)
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayTrends = days.map((day, index) => ({
      day,
      bookings: 0, // You can calculate this based on date
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
    await logAdminAction({
      adminId: adminId,
      adminUsername: username,
      action: AuditActions.VIEW_ANALYTICS,
      resource: "Analytics",
      resourceId: null,
      details: {
        metricsAccessed: Object.keys(analyticsData),
        timestamp: new Date(),
      },
      ipAddress: req.admin.getClientIP(),
      userAgent: req.admin.getUserAgent(),
      status: "SUCCESS",
    });

    res.status(200).json({
      peakHours:
        peakHours.length > 0 ? peakHours : [{ hour: "10:00", count: 0 }],
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
    console.error("Analytics API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default withAdminAuth(handler);
