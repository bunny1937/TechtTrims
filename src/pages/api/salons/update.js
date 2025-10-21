// src/pages/api/salons/update.js - COMPLETE NEW FILE
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, ...updateData } = req.body;

    if (!salonId) {
      return res.status(400).json({ error: "Salon ID required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.hashedPassword;
    delete updateData.createdAt;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Validate time formats and convert 24:00 if needed
    if (updateData.operatingHours) {
      Object.keys(updateData.operatingHours).forEach((day) => {
        const hours = updateData.operatingHours[day];
        // Allow 24:00 but ensure it's stored correctly
        if (hours.close === "23:59") {
          hours.close = "24:00";
        }
        if (hours.open === "00:00") {
          hours.open = "00:00";
        }
      });
    }

    // Convert to ObjectId if valid
    let query;
    if (ObjectId.isValid(salonId)) {
      query = { _id: new ObjectId(salonId) };
    } else {
      return res.status(400).json({ error: "Invalid salon ID format" });
    }

    const result = await db
      .collection("salons")
      .updateOne(query, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Salon not found" });
    }

    // Fetch updated salon
    const updatedSalon = await db.collection("salons").findOne(query);

    // Update session storage
    res.status(200).json({
      success: true,
      message: "Salon updated successfully",
      salon: updatedSalon,
    });
  } catch (e) {
    console.error("Update Profile API Error:", e);
    res.status(500).json({ error: "Failed to update salon profile" });
  }
}
