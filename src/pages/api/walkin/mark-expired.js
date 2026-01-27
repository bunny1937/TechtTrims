import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const now = new Date();
    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min buffer

    // Mark expired RED bookings
    const result = await db.collection("bookings").updateMany(
      {
        queueStatus: "RED",
        expiresAt: { $lt: bufferTime },
        isExpired: false,
        arrivedAt: { $exists: false }, // 🔥 SAFETY GUARD
      },
      {
        $set: {
          isExpired: true,
          updatedAt: now,
        },
      },
    );

    console.log(`✅ Marked ${result.modifiedCount} bookings as expired`);

    res.status(200).json({
      success: true,
      markedExpired: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error marking expired bookings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
