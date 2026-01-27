// src/pages/api/barber/attendance/clock-in.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId } = req.body;

    if (!barberId) {
      return res.status(400).json({ message: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const now = new Date();

    // ✅ IST timezone - India Standard Time
    const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log("[Clock In] Request:", {
      barberId,
      date: todayStr,
      time: istNow.toISOString(),
    });

    // ✅ Get barber details
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    // ✅ CHECK 1: Is barber marked absent today?
    if (barber.currentStatus === "ABSENT" && barber.absentDate === todayStr) {
      return res.status(403).json({
        message: "You are marked absent for today. Cannot clock in.",
        reason: barber.absentReason,
        code: "MARKED_ABSENT",
      });
    }

    // ✅ CHECK 2: Is barber deactivated?
    if (!barber.isAvailable || barber.currentStatus === "DEACTIVATED") {
      return res.status(403).json({
        message: "Your account has been deactivated. Contact salon owner.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // ✅ CHECK 3: Already clocked in today?
    const existing = await db.collection("attendance").findOne({
      barberId: new ObjectId(barberId),
      date: todayStr,
    });

    if (existing) {
      if (existing.clockIn && !existing.clockOut) {
        // Already clocked in, not clocked out
        return res.status(400).json({
          message: "Already clocked in today",
          attendance: existing,
          code: "ALREADY_CLOCKED_IN",
        });
      } else if (existing.clockOut) {
        // Already completed full shift
        return res.status(400).json({
          message: "You already completed your shift today",
          attendance: existing,
          code: "SHIFT_COMPLETED",
        });
      }
    }

    // ✅ CREATE NEW ATTENDANCE RECORD
    const attendance = {
      barberId: new ObjectId(barberId),
      salonId: new ObjectId(barber.linkedId || barber.salonId),
      date: todayStr,
      clockIn: now,
      clockOut: null,
      breaks: [],
      totalMinutes: 0,
      status: "present",
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("attendance").insertOne(attendance);

    // ✅ UPDATE BARBER STATUS
    await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $set: {
          isAvailable: true,
          currentStatus: "AVAILABLE",
          updatedAt: now,
        },
        $unset: {
          absentDate: "",
          absentReason: "",
        },
      },
    );

    console.log(
      `[Clock In] ✅ Barber ${barberId} clocked in at ${istNow.toLocaleTimeString("en-IN")}`,
    );

    return res.status(200).json({
      success: true,
      message: "Clocked in successfully",
      attendance: {
        ...attendance,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("[Clock In] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

