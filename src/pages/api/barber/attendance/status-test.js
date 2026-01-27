// src/pages/api/barber/attendance/status-test.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId } = req.query;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    console.log("[TEST] Checking for barberId:", barberId);

    const client = await clientPromise;
    const db = client.db("techtrims");

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ error: "Barber not found" });
    }

    const attendance = await db.collection("attendance").findOne({
      barberId: new ObjectId(barberId),
      date: todayStr,
    });

    if (barber.currentStatus === "ABSENT" && barber.absentDate === todayStr) {
      return res.status(200).json({
        clockIn: null,
        clockOut: null,
        breaks: [],
        currentBreak: null,
        status: "ABSENT",
        totalMinutes: 0,
        barberStatus: "ABSENT",
        absentReason: barber.absentReason,
        canClockIn: false,
      });
    }

    if (!barber.isAvailable && barber.currentStatus === "DEACTIVATED") {
      return res.status(200).json({
        clockIn: null,
        clockOut: null,
        breaks: [],
        currentBreak: null,
        status: "DEACTIVATED",
        totalMinutes: 0,
        barberStatus: "DEACTIVATED",
        canClockIn: false,
      });
    }

    if (!attendance) {
      return res.status(200).json({
        clockIn: null,
        clockOut: null,
        breaks: [],
        currentBreak: null,
        status: "NOT_CLOCKED_IN",
        totalMinutes: 0,
        barberStatus: barber.currentStatus || "AVAILABLE",
        canClockIn: true,
      });
    }

    const currentBreak =
      attendance.breaks?.find((b) => b.start && !b.end) || null;

    return res.status(200).json({
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut,
      breaks: attendance.breaks || [],
      currentBreak,
      totalMinutes: attendance.totalMinutes || 0,
      status: attendance.clockOut ? "CLOCKED_OUT" : "CLOCKED_IN",
      barberStatus: barber.currentStatus,
      canClockIn: !attendance.clockIn,
      canClockOut: attendance.clockIn && !attendance.clockOut,
    });
  } catch (error) {
    console.error("[TEST] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
