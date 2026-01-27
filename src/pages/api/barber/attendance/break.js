// src/pages/api/barber/attendance/break.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, action } = req.body;

    if (!barberId || !action) {
      return res.status(400).json({ message: "barberId and action required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Find today's attendance
    const attendance = await db.collection("attendance").findOne({
      barberId: new ObjectId(barberId),
      date: todayStr,
    });

    if (!attendance) {
      return res.status(404).json({ message: "Not clocked in today" });
    }

    if (attendance.clockOut) {
      return res.status(400).json({ message: "Already clocked out" });
    }

    let updateOp;

    if (action === "start") {
      // Check if already on break
      const onBreak = attendance.breaks?.some((b) => b.start && !b.end);
      if (onBreak) {
        return res.status(400).json({ message: "Already on break" });
      }

      // Start new break
      updateOp = {
        $push: {
          breaks: {
            start: now,
            end: null,
          },
        },
        $set: { updatedAt: now },
      };
    } else if (action === "end") {
      // Find current break
      const currentBreakIndex = attendance.breaks?.findIndex(
        (b) => b.start && !b.end,
      );
      if (currentBreakIndex === undefined || currentBreakIndex === -1) {
        return res.status(400).json({ message: "No active break found" });
      }

      // End break
      updateOp = {
        $set: {
          [`breaks.${currentBreakIndex}.end`]: now,
          updatedAt: now,
        },
      };
    } else {
      return res
        .status(400)
        .json({ message: 'Invalid action. Use "start" or "end"' });
    }

    await db
      .collection("attendance")
      .updateOne({ _id: attendance._id }, updateOp);

    // Fetch updated attendance
    const updated = await db
      .collection("attendance")
      .findOne({ _id: attendance._id });

    return res.status(200).json({
      success: true,
      message: action === "start" ? "Break started" : "Break ended",
      attendance: updated,
    });
  } catch (error) {
    console.error("[Break] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
