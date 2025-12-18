import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import clientPromise from "../../../../lib/mongodb";
import { addOrUpdateContact } from "../../../../lib/brevo_email/brevoMarketing";
import { logAdminAction, getClientIP } from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { adminId, username } = req.admin;

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get all verified users
    const users = await db
      .collection("users")
      .find({
        isVerified: true,
        isActive: true,
      })
      .toArray();

    let synced = 0;
    let failed = 0;

    for (const user of users) {
      const result = await addOrUpdateContact(user.email, {
        name: user.name,
        phone: user.phone || user.phoneNumber,
        gender: user.gender,
        totalBookings: user.bookingHistory?.length || 0,
      });

      if (result.success) {
        synced++;
      } else {
        failed++;
      }

      // Rate limit to avoid overwhelming Brevo API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await logAdminAction(
      adminId,
      username,
      "SYNC_CONTACTS",
      "Contacts",
      null,
      { totalUsers: users.length, synced, failed },
      getClientIP(req),
      req.headers["user-agent"],
      "SUCCESS"
    );

    return res.status(200).json({
      success: true,
      message: `Synced ${synced} contacts to Brevo`,
      stats: {
        total: users.length,
        synced,
        failed,
      },
    });
  } catch (error) {
    console.error("Contact sync error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
