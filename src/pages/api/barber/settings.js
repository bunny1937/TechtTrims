// src/pages/api/barber/settings.js
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId } = req.query;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get barber details
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ error: "Barber not found" });
    }

    // Structure settings data
    return res.status(200).json({
      profile: {
        name: barber.name || "",
        email: barber.email || "",
        phone: barber.phone || "",
        bio: barber.bio || "",
        skills: barber.skills || [],
        experience: barber.experience || "",
        profileImage: barber.profileImage || "",
      },
      notifications: {
        emailNotifications: barber.notifications?.emailNotifications ?? true,
        smsNotifications: barber.notifications?.smsNotifications ?? true,
        bookingAlerts: barber.notifications?.bookingAlerts ?? true,
        reviewAlerts: barber.notifications?.reviewAlerts ?? true,
        promotionAlerts: barber.notifications?.promotionAlerts ?? false,
      },
      availability: barber.availability || {
        monday: { enabled: true, start: "09:00", end: "18:00" },
        tuesday: { enabled: true, start: "09:00", end: "18:00" },
        wednesday: { enabled: true, start: "09:00", end: "18:00" },
        thursday: { enabled: true, start: "09:00", end: "18:00" },
        friday: { enabled: true, start: "09:00", end: "18:00" },
        saturday: { enabled: true, start: "09:00", end: "18:00" },
        sunday: { enabled: false, start: "09:00", end: "18:00" },
      },
    });
  } catch (error) {
    console.error("[Settings API] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
