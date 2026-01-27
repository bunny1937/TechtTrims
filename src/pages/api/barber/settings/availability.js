// src/pages/api/barber/settings/availability.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, availability } = req.body;

    if (!barberId || !availability) {
      return res.status(400).json({
        error: "barberId and availability are required",
      });
    }

    // Validate availability structure
    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    for (const day of validDays) {
      if (!availability[day]) {
        return res.status(400).json({
          error: `Missing availability for ${day}`,
        });
      }

      const { enabled, start, end } = availability[day];

      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          error: `Invalid enabled value for ${day}`,
        });
      }

      if (enabled && (!start || !end)) {
        return res.status(400).json({
          error: `Start and end times required for ${day}`,
        });
      }
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Update barber availability
    const result = await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $set: {
          availability,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Barber not found" });
    }

    console.log(`[Availability Update] Barber ${barberId} schedule updated`);

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability,
    });
  } catch (error) {
    console.error("[Availability Update] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
