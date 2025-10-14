import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, additionalMinutes, newEstimatedDuration } = req.body;

    console.log("Received add-time request:", {
      bookingId,
      additionalMinutes,
      newEstimatedDuration,
    });

    if (!bookingId || !additionalMinutes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Convert string to ObjectId for MongoDB query
    const bookingObjectId = new ObjectId(bookingId);

    console.log("Searching with ObjectId:", bookingObjectId);

    // Find the booking in the BOOKINGS collection (both walkin and pre-bookings are here)
    const booking = await db.collection("bookings").findOne({
      _id: bookingObjectId,
    });

    console.log("Found booking:", booking ? "Yes" : "No");

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
        bookingId,
      });
    }

    // Calculate new end time
    let currentEndTime;
    if (booking.expectedCompletionTime) {
      currentEndTime = new Date(booking.expectedCompletionTime);
    } else if (booking.serviceStartedAt) {
      currentEndTime = new Date(booking.serviceStartedAt);
      currentEndTime.setMinutes(
        currentEndTime.getMinutes() + (booking.estimatedDuration || 30)
      );
    } else {
      return res.status(400).json({ error: "Service not yet started" });
    }

    const newEndTime = new Date(
      currentEndTime.getTime() + additionalMinutes * 60 * 1000
    );

    // Update booking in BOOKINGS collection
    const result = await db.collection("bookings").updateOne(
      { _id: bookingObjectId },
      {
        $set: {
          estimatedDuration: newEstimatedDuration,
          expectedCompletionTime: newEndTime,
          updatedAt: new Date(),
        },
      }
    );

    // Also update barber's currentServiceEndTime if this booking is active
    if (booking.barberId && booking.queueStatus === "GREEN") {
      const barberObjectId = new ObjectId(booking.barberId);
      await db.collection("barbers").updateOne(
        { _id: barberObjectId },
        {
          $set: {
            currentServiceEndTime: newEndTime,
            updatedAt: new Date(),
          },
        }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Failed to update booking" });
    }

    console.log("Successfully added time:", {
      newEndTime,
      newEstimatedDuration,
    });

    res.status(200).json({
      success: true,
      newEndTime,
      newEstimatedDuration,
      message: `Added ${additionalMinutes} minutes successfully`,
    });
  } catch (error) {
    console.error("Error adding time:", error);
    res.status(500).json({
      error: "Failed to add time",
      details: error.message,
    });
  }
}
