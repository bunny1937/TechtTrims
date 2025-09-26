// pages/api/salons/barbers/available.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { salonId, service } = req.query;

  console.log("=== AVAILABLE BARBERS API DEBUG ===");
  console.log("SalonId:", salonId);
  console.log("Service:", service);

  if (!salonId) {
    return res.status(400).json({ error: "salonId required" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const barbersCollection = db.collection("barbers");

    // Convert salonId to ObjectId
    let salonObjectId;
    try {
      salonObjectId = new ObjectId(salonId);
    } catch (objIdError) {
      return res.status(400).json({ error: "Invalid salonId format" });
    }

    // Find barbers who can perform the requested service
    const query = {
      salonId: salonObjectId,
      isAvailable: true,
    };

    if (service) {
      // Check if the barber has this skill
      query.skills = { $in: [service] };
    }

    console.log("Database query:", JSON.stringify(query, null, 2));

    const barbers = await barbersCollection
      .find(query)
      .sort({ rating: -1, totalBookings: -1 })
      .toArray();

    console.log("Found available barbers:", barbers.length);
    console.log("Barbers:", barbers);

    return res.status(200).json(barbers);
  } catch (err) {
    console.error("Available barbers API error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
}
