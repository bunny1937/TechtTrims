// src/pages/api/barber/attendance/mark-absent.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, date, reason } = req.body;

    console.log("[Mark Absent] Received:", { barberId, date, reason });

    if (!barberId || !date || !reason) {
      return res.status(400).json({
        message: "barberId, date, and reason required",
        received: { barberId, date, reason },
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Convert barberId to ObjectId
    const barberObjectId = new ObjectId(barberId);

    // Get barber to get salonId
    const barber = await db
      .collection("barbers")
      .findOne({ _id: barberObjectId });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    const salonId = barber.linkedId || barber.salonId;

    if (!salonId) {
      return res
        .status(400)
        .json({ message: "Salon ID not found for this barber" });
    }

    // Check if already marked
    const existing = await db.collection("attendance").findOne({
      barberId: barberObjectId,
      date: date,
    });

    if (existing) {
      // Update existing record
      await db.collection("attendance").updateOne(
        { _id: existing._id },
        {
          $set: {
            status: "absent",
            absentReason: reason,
            markedBy: "barber", // ✅ Marked by barber themselves
            updatedAt: new Date(),
          },
        },
      );
    } else {
      // Create new absent record
      await db.collection("attendance").insertOne({
        barberId: barberObjectId,
        salonId: new ObjectId(salonId),
        date: date,
        clockIn: null,
        clockOut: null,
        status: "absent",
        absentReason: reason,
        markedBy: "barber", // ✅ Self-marked
        breaks: [],
        totalMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Update barber status
    await db.collection("barbers").updateOne(
      { _id: barberObjectId },
      {
        $set: {
          isAvailable: false,
          currentStatus: "ABSENT",
          absentDate: date,
          absentReason: reason,
          updatedAt: new Date(),
        },
      },
    );

    console.log(
      `[Mark Absent] Barber ${barberId} marked absent for ${date}. Reason: ${reason}`,
    );

    return res.status(200).json({
      success: true,
      message: "Barber marked absent",
      date,
      reason,
    });
  } catch (error) {
    console.error("[Mark Absent] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
