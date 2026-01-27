// src/pages/api/barber/settings/password.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { withBarberAuth } from "../../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, currentPassword, newPassword } = req.body;

    if (!barberId || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: "barberId, currentPassword, and newPassword are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get barber
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ error: "Barber not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      barber.hashedPassword,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $set: {
          hashedPassword,
          updatedAt: new Date(),
        },
      },
    );

    console.log(`[Password Change] Barber ${barberId} password updated`);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("[Password Change] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
