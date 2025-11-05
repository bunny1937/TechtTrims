import { connectToDatabase } from "../../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min buffer

    // Mark expired bookings
    const result = await db.collection("bookings").updateMany(
      {
        queueStatus: "RED",
        expiresAt: { $lt: bufferTime },
        isExpired: false,
      },
      {
        $set: {
          isExpired: true,
          expiredAt: now,
        },
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} bookings as expired`);

    res.status(200).json({
      success: true,
      expired: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Mark expired error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
