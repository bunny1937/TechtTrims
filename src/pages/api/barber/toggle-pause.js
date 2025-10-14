import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { barberId, isPaused } = req.body;

    if (!barberId || typeof isPaused !== "boolean") {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const barberObjectId = new ObjectId(barberId);

    // Update barber pause status
    const result = await db.collection("barbers").updateOne(
      { _id: barberObjectId },
      {
        $set: {
          isPaused: isPaused,
          pausedAt: isPaused ? new Date() : null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Barber not found" });
    }

    res.status(200).json({
      success: true,
      isPaused,
      message: isPaused ? "Barber queue paused" : "Barber queue resumed",
    });
  } catch (error) {
    console.error("Error toggling pause:", error);
    res.status(500).json({
      error: "Failed to toggle pause",
      details: error.message,
    });
  }
}
