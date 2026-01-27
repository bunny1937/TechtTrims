// src/pages/api/barber/leave/apply.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      barberId,
      salonId,
      barberName,
      fromDate,
      toDate,
      fromTime,
      toTime,
      reason,
    } = req.body;

    if (
      !barberId ||
      !salonId ||
      !fromDate ||
      !toDate ||
      !fromTime ||
      !toTime ||
      !reason
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Create leave request
    const leaveRequest = {
      barberId: new ObjectId(barberId),
      salonId: new ObjectId(salonId),
      barberName,
      fromDate,
      toDate,
      fromTime,
      toTime,
      reason,
      status: "PENDING", // PENDING, APPROVED, REJECTED
      appliedAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("leave_requests")
      .insertOne(leaveRequest);

    // Create notification for salon owner
    await db.collection("notifications").insertOne({
      salonId: new ObjectId(salonId),
      type: "LEAVE_REQUEST",
      title: "New Leave Request",
      message: `${barberName} has requested leave from ${fromDate} to ${toDate}`,
      data: {
        leaveRequestId: result.insertedId,
        barberId: new ObjectId(barberId),
        barberName,
        fromDate,
        toDate,
        fromTime,
        toTime,
        reason,
      },
      isRead: false,
      createdAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Leave request submitted successfully",
      leaveRequestId: result.insertedId,
    });
  } catch (error) {
    console.error("Apply leave error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
