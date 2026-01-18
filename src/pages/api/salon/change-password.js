// src/pages/api/salon/change-password.js

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { hashPassword, verifyPassword } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, currentPassword, newPassword } = req.body;

    if (!salonId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find salon
    const salon = await db.collection("salons").findOne({
      _id: new ObjectId(salonId),
    });

    if (!salon) {
      return res.status(404).json({ message: "Salon not found" });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, salon.hashedPassword);

    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Check if new password is same as current
    const isSamePassword = await verifyPassword(
      newPassword,
      salon.hashedPassword
    );

    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await db.collection("salons").updateOne(
      { _id: new ObjectId(salonId) },
      {
        $set: {
          hashedPassword: hashedNewPassword,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
