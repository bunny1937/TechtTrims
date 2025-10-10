import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { action, bookingId, barberId, duration } = req.body;

    if (!action || !bookingId || !barberId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    if (action === "START") {
      if (!duration) {
        return res
          .status(400)
          .json({ message: "Duration is required for START action" });
      }

      const now = new Date();
      const serviceEndTime = new Date(now.getTime() + duration * 60 * 1000);

      // Update booking to GREEN (in service)
      await db.collection("walkinbookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "GREEN",
            serviceStartedAt: now,
            selectedDuration: duration,
          },
        }
      );

      // Update barber status
      await db.collection("barbers").updateOne(
        { _id: new ObjectId(barberId) },
        {
          $set: {
            currentStatus: "OCCUPIED",
            currentBookingId: new ObjectId(bookingId),
            currentServiceStartTime: now,
            currentServiceEndTime: serviceEndTime,
          },
        }
      );

      res.status(200).json({
        success: true,
        message: "Service started successfully",
      });
    } else if (action === "END") {
      const now = new Date();

      // Get booking to calculate actual duration
      const booking = await db.collection("walkinbookings").findOne({
        _id: new ObjectId(bookingId),
      });

      const actualDuration = booking?.serviceStartedAt
        ? Math.round((now - new Date(booking.serviceStartedAt)) / 1000 / 60)
        : null;

      // Update booking to COMPLETED
      await db.collection("walkinbookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "COMPLETED",
            serviceEndedAt: now,
            actualDuration,
          },
        }
      );

      // Get next customer in queue
      const nextCustomer = await db.collection("walkinbookings").findOne(
        {
          barberId: new ObjectId(barberId),
          queueStatus: "ORANGE",
          isExpired: false,
        },
        {
          sort: { arrivedAt: 1 },
        }
      );

      // Update barber status
      await db.collection("barbers").updateOne(
        { _id: new ObjectId(barberId) },
        {
          $set: {
            currentStatus: nextCustomer ? "AVAILABLE" : "AVAILABLE",
            currentBookingId: null,
            currentServiceStartTime: null,
            currentServiceEndTime: null,
          },
          $inc: { queueLength: -1 },
        }
      );

      res.status(200).json({
        success: true,
        message: "Service completed successfully",
        nextCustomer: nextCustomer
          ? {
              bookingCode: nextCustomer.bookingCode,
              customerName: nextCustomer.customerName,
            }
          : null,
      });
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    console.error("Service control error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
