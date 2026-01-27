// src/pages/api/barber/attendance/status.js
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

    console.log("[Attendance Status] Checking for barberId:", barberId);

    const client = await clientPromise;
    const db = client.db("techtrims");

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    console.log("[Attendance Status] Today:", todayStr);

    // ✅ Get barber status
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      console.log("[Attendance Status] Barber not found");
      return res.status(404).json({ error: "Barber not found" });
    }

    console.log("[Attendance Status] Barber found:", {
      name: barber.name,
      currentStatus: barber.currentStatus,
      isAvailable: barber.isAvailable,
    });

    // ✅ Find today's attendance
    const attendance = await db.collection("attendance").findOne({
      barberId: new ObjectId(barberId),
      date: todayStr,
    });

    console.log("[Attendance Status] Attendance record:", attendance);

    // ✅ Check if marked absent
    if (barber.currentStatus === "ABSENT" && barber.absentDate === todayStr) {
      console.log("[Attendance Status] Barber is marked absent");
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

    // ✅ Check if deactivated
    if (!barber.isAvailable && barber.currentStatus === "DEACTIVATED") {
      console.log("[Attendance Status] Barber is deactivated");
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

    // ✅ CASE 1: No attendance record at all
    if (!attendance) {
      console.log("[Attendance Status] No attendance record - can clock in");
      return res.status(200).json({
        clockIn: null,
        clockOut: null,
        breaks: [],
        currentBreak: null,
        status: "NOT_CLOCKED_IN",
        totalMinutes: 0,
        barberStatus: barber.currentStatus || "AVAILABLE",
        canClockIn: true,
        canClockOut: false,
      });
    }

    // ✅ CASE 2: Attendance exists but no clockIn (absent record)
    if (!attendance.clockIn) {
      console.log(
        "[Attendance Status] Attendance record exists but no clock-in",
      );
      return res.status(200).json({
        clockIn: null,
        clockOut: null,
        breaks: [],
        currentBreak: null,
        status: "NOT_CLOCKED_IN",
        totalMinutes: 0,
        barberStatus: barber.currentStatus || "AVAILABLE",
        canClockIn: true,
        canClockOut: false,
      });
    }

    // ✅ CASE 3: Clocked in but not clocked out
    if (attendance.clockIn && !attendance.clockOut) {
      const currentBreak =
        attendance.breaks?.find((b) => b.start && !b.end) || null;

      console.log("[Attendance Status] Clocked in, working now");

      return res.status(200).json({
        clockIn: attendance.clockIn,
        clockOut: null,
        breaks: attendance.breaks || [],
        currentBreak,
        totalMinutes: 0, // Not calculated until clock out
        status: "CLOCKED_IN",
        barberStatus: barber.currentStatus || "AVAILABLE",
        canClockIn: false,
        canClockOut: true,
      });
    }

    // ✅ CASE 4: Already clocked out (shift completed)
    if (attendance.clockIn && attendance.clockOut) {
      console.log("[Attendance Status] Already clocked out");

      return res.status(200).json({
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        breaks: attendance.breaks || [],
        currentBreak: null,
        totalMinutes: attendance.totalMinutes || 0,
        status: "CLOCKED_OUT",
        barberStatus: barber.currentStatus || "AVAILABLE",
        canClockIn: false,
        canClockOut: false,
      });
    }

    // ✅ Fallback (should never reach here)
    console.log("[Attendance Status] Unexpected state");
    return res.status(200).json({
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut,
      breaks: attendance.breaks || [],
      currentBreak: null,
      totalMinutes: attendance.totalMinutes || 0,
      status: "NOT_CLOCKED_IN",
      barberStatus: barber.currentStatus || "AVAILABLE",
      canClockIn: true,
      canClockOut: false,
    });
  } catch (error) {
    console.error("[Attendance Status] Error:", error);
    console.error("[Attendance Status] Stack:", error.stack);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
