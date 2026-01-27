// src/pages/api/barber/attendance/clock-out.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarber } from "../../../../lib/middleware/requireRole";

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

    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().split("T")[0];

    console.log("[Clock Out] Request:", { barberId, date: todayStr });

    // ✅ Find today's attendance
    const attendance = await db.collection("attendance").findOne({
      barberId: new ObjectId(barberId),
      date: todayStr,
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No clock-in record found for today. Please clock in first.",
        code: "NOT_CLOCKED_IN",
      });
    }

    if (!attendance.clockIn) {
      return res.status(400).json({
        message: "Invalid attendance record. No clock-in time found.",
        code: "INVALID_RECORD",
      });
    }

    if (attendance.clockOut) {
      return res.status(400).json({
        message: "Already clocked out today",
        attendance,
        code: "ALREADY_CLOCKED_OUT",
      });
    }

    // ✅ CHECK: If on break, auto-end it
    const currentBreak = attendance.breaks?.find((b) => b.start && !b.end);
    if (currentBreak) {
      const breakIndex = attendance.breaks.indexOf(currentBreak);
      await db.collection("attendance").updateOne(
        { _id: attendance._id },
        {
          $set: {
            [`breaks.${breakIndex}.end`]: now,
          },
        },
      );
      console.log("[Clock Out] Auto-ended active break");
    }

    // ✅ Calculate total working time
    const clockInTime = new Date(attendance.clockIn);
    const totalMs = now - clockInTime;

    // Subtract break time
    let breakTimeMs = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      breakTimeMs = attendance.breaks.reduce((total, brk) => {
        if (brk.start && brk.end) {
          return total + (new Date(brk.end) - new Date(brk.start));
        }
        return total;
      }, 0);
    }

    const workingMs = totalMs - breakTimeMs;
    const totalMinutes = Math.floor(workingMs / (1000 * 60));
    const totalHours = (totalMinutes / 60).toFixed(2);

    // ✅ UPDATE ATTENDANCE
    await db.collection("attendance").updateOne(
      { _id: attendance._id },
      {
        $set: {
          clockOut: now,
          totalMinutes,
          isLocked: true,
          updatedAt: now,
        },
      },
    );

    console.log(
      `[Clock Out] ✅ Barber ${barberId} clocked out. Total: ${totalHours}h`,
    );

    return res.status(200).json({
      success: true,
      message: `Clocked out successfully. Total: ${totalHours} hours`,
      totalHours,
      totalMinutes,
      attendance: {
        ...attendance,
        clockOut: now,
        totalMinutes,
        isLocked: true,
      },
    });
  } catch (error) {
    console.error("[Clock Out] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

