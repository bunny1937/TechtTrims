// src/pages/api/barber/settings/notifications.js
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
      emailNotifications,
      smsNotifications,
      bookingAlerts,
      reviewAlerts,
      promotionAlerts,
    } = req.body;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Build notifications object
    const notifications = {
      emailNotifications: emailNotifications ?? true,
      smsNotifications: smsNotifications ?? true,
      bookingAlerts: bookingAlerts ?? true,
      reviewAlerts: reviewAlerts ?? true,
      promotionAlerts: promotionAlerts ?? false,
    };

    // Update barber
    const result = await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $set: {
          notifications,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Barber not found" });
    }

    console.log(
      `[Notifications Update] Barber ${barberId} preferences updated`,
    );

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      notifications,
    });
  } catch (error) {
    console.error("[Notifications Update] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
