import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, breakType, until } = req.body;

    if (!barberId || !breakType || !until) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Update barber break status
    await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $set: {
          onBreak: true,
          breakType,
          breakUntil: until,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Barber break set:`, { breakType, until });

    res.status(200).json({
      success: true,
      message: `Break set for ${breakType}`,
      breakType,
      until,
    });
  } catch (error) {
    console.error("Set break error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
