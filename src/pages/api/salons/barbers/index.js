// pages/api/salons/barbers/index.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const { method } = req;

  // Extract salonId from query parameters or request body
  const salonId = req.query.salonId || req.body.salonId;

  console.log("=== BARBERS API DEBUG ===");
  console.log("Method:", method);
  console.log("Raw salonId:", salonId);
  console.log("SalonId type:", typeof salonId);

  if (!salonId) {
    return res.status(400).json({ error: "salonId required" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const barbersCollection = db.collection("barbers");

    console.log("Database connected successfully");

    if (method === "GET") {
      // Get all barbers for salon
      console.log("Fetching barbers for salon:", salonId);

      // Convert salonId to ObjectId - ADD VALIDATION
      let salonObjectId;
      try {
        salonObjectId = new ObjectId(salonId);
        console.log("Converted to ObjectId:", salonObjectId);
      } catch (objIdError) {
        console.error("Invalid ObjectId:", salonId, objIdError);
        return res.status(400).json({ error: "Invalid salonId format" });
      }

      const barbers = await barbersCollection
        .find({
          salonId: salonObjectId,
        })
        .sort({ name: 1 })
        .toArray();

      console.log("Found barbers:", barbers.length);
      console.log("Barbers data:", barbers);

      return res.status(200).json(barbers);
    }

    if (method === "POST") {
      // Create new barber
      let salonObjectId;
      try {
        salonObjectId = new ObjectId(salonId);
      } catch (objIdError) {
        return res.status(400).json({ error: "Invalid salonId format" });
      }

      const barberData = {
        ...req.body,
        salonId: salonObjectId,
        totalBookings: 0,
        rating: 5.0,
        isAvailable: req.body.isAvailable !== false,
        workingHours: {
          start: "09:00",
          end: "21:00",
        },
        accomplishments: [],
        earnings: 0,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("Creating barber:", barberData);

      const result = await barbersCollection.insertOne(barberData);
      const createdBarber = await barbersCollection.findOne({
        _id: result.insertedId,
      });

      console.log("Barber created:", result.insertedId);
      return res.status(201).json(createdBarber);
    }

    return res
      .setHeader("Allow", ["GET", "POST"])
      .status(405)
      .json({ error: "Method not allowed" });
  } catch (err) {
    console.error("=== API ERROR ===");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("=== END ERROR ===");

    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
      name: err.name,
    });
  }
}
