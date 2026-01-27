// src/pages/api/barber/attendance/history.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../../lib/middleware/withBarberAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, month, year } = req.query;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Default to current month/year if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    // Get all attendance records for the month
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const endMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const endYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const records = await db
      .collection("attendance")
      .find({
        barberId: new ObjectId(barberId),
        date: { $gte: startDate, $lt: endDate },
      })
      .sort({ date: 1 })
      .toArray();

    // Calculate stats
    const totalDays = records.length;
    const presentDays = records.filter((r) => r.clockIn).length;
    const absentDays = records.filter((r) => r.status === "absent").length;
    const totalHours = records.reduce((sum, r) => {
      return sum + (r.totalMinutes || 0) / 60;
    }, 0);

    return res.status(200).json({
      records,
      stats: {
        totalDays,
        presentDays,
        absentDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        month: targetMonth,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error("[Attendance History] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

