// src/pages/api/barber/attendance/monthly-report.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../../lib/middleware/withBarberAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const barberId = req.auth.linkedId;
    const { month, year } = req.query;

    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get barber details for salary calculation
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    // Date range for the month
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const endMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const endYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    // Get all attendance records
    const records = await db
      .collection("attendance")
      .find({
        barberId: new ObjectId(barberId),
        date: { $gte: startDate, $lt: endDate },
      })
      .sort({ date: 1 })
      .toArray();

    // Calculate stats
    const presentDays = records.filter(
      (r) => r.clockIn && r.status !== "absent",
    ).length;
    const absentDays = records.filter((r) => r.status === "absent").length;
    const totalHours = records.reduce(
      (sum, r) => sum + (r.totalMinutes || 0) / 60,
      0,
    );

    // Calculate salary (example: ₹500 per day present)
    const dailyRate = barber.dailyRate || 500;
    const calculatedSalary = presentDays * dailyRate;

    return res.status(200).json({
      month: targetMonth,
      year: targetYear,
      barberName: barber.name,
      presentDays,
      absentDays,
      totalDays: records.length,
      totalHours: parseFloat(totalHours.toFixed(2)),
      dailyRate,
      calculatedSalary,
      records: records.map((r) => ({
        date: r.date,
        status: r.status || "present",
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        totalHours: r.totalMinutes ? (r.totalMinutes / 60).toFixed(2) : 0,
        absentReason: r.absentReason || null,
      })),
    });
  } catch (error) {
    console.error("[Monthly Report] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

