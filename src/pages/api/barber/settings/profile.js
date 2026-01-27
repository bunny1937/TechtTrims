// src/pages/api/barber/settings/profile.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      barberId,
      name,
      email,
      phone,
      bio,
      experience,
      skills,
      profileImage,
    } = req.body;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (experience !== undefined) updateData.experience = experience;
    if (skills !== undefined) updateData.skills = skills;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    // Update barber
    const result = await db
      .collection("barbers")
      .updateOne({ _id: new ObjectId(barberId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Barber not found" });
    }

    // Get updated barber
    const updatedBarber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    console.log(`[Profile Update] Barber ${barberId} profile updated`);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      barber: updatedBarber,
    });
  } catch (error) {
    console.error("[Profile Update] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
