import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, isAvailable } = req.body;

    if (!barberId || typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $set: {
          isAvailable: isAvailable,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Barber not found" });
    }

    console.log(`✅ Barber ${barberId} availability updated to:`, isAvailable);

    res.status(200).json({
      success: true,
      isAvailable: isAvailable,
      message: `Barber is now ${isAvailable ? "available" : "unavailable"}`,
    });
  } catch (error) {
    console.error("❌ Toggle availability error:", error);
    res.status(500).json({
      message: "Failed to update availability",
      error: error.message,
    });
  }
}
