import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, isPaused, reason, until } = req.body;

    if (!salonId) {
      return res.status(400).json({ message: "Salon ID required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Update salon status
    await db.collection("salons").updateOne(
      { _id: new ObjectId(salonId) },
      {
        $set: {
          isPaused,
          pauseReason: reason,
          pauseUntil: until,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Salon ${isPaused ? "paused" : "resumed"}:`, {
      reason,
      until,
    });

    res.status(200).json({
      success: true,
      message: `Salon ${isPaused ? "paused" : "resumed"}`,
    });
  } catch (error) {
    console.error("Toggle pause error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
