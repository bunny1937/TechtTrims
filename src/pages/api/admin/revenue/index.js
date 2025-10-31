import clientPromise from "../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../lib/adminAuth";
import { ObjectId } from "mongodb";
import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import {
  logAdminAction,
  AuditActions,
  getClientIP,
} from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // req.admin is set by withAdminAuth middleware
    if (!req.admin || !req.admin.adminId) {
      console.log("❌ Admin not authenticated in req.admin");
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const { adminId, username } = req.admin;
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get all salons
    const allSalons = await db.collection("salons").find({}).toArray();

    // Calculate revenue for each salon
    const salonsWithRevenue = await Promise.all(
      allSalons.map(async (salon) => {
        const salonIdStr = salon._id.toString();
        const salonIdObj = salon._id;

        // Count bookings with confirmed OR completed status
        const revenueBookings = await db
          .collection("bookings")
          .find({
            $or: [{ salonId: salonIdStr }, { salonId: salonIdObj }],
            status: { $in: ["confirmed", "completed"] },
          })
          .toArray();

        const totalBookings = revenueBookings.length;
        const totalRevenue = revenueBookings.reduce(
          (sum, b) => sum + (b.price || 0),
          0
        );
        const commission = Math.round(totalRevenue * 0.15);

        return {
          id: salon._id,
          salonName: salon.salonName,
          ownerName: salon.ownerName,
          email: salon.email,
          phone: salon.phone,
          totalBookings,
          totalRevenue,
          commission,
          paid: 0,
          balance: commission,
          createdAt: salon.createdAt,
        };
      })
    );

    // Calculate summary
    const totalRevenue = salonsWithRevenue.reduce(
      (sum, s) => sum + s.totalRevenue,
      0
    );
    const summary = {
      totalRevenue,
      collected: 0,
      pending: salonsWithRevenue.reduce((sum, s) => sum + s.balance, 0),
    };

    // Log revenue data access
    await logAdminAction(
      adminId,
      username,
      AuditActions.VIEWREVENUE,
      "Revenue",
      null,
      {
        totalRevenue: summary.totalRevenue,
        dateRange: req.query.dateRange || "all",
        accessedAt: new Date(),
      },
      getClientIP(req),
      req.headers["user-agent"],
      "SUCCESS"
    );

    return res.status(200).json({
      summary,
      salons: salonsWithRevenue,
    });
  } catch (error) {
    console.error("❌ Revenue API error:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
