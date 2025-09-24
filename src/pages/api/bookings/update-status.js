// src/pages/api/bookings/update-status.js
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, status } = req.body;

    if (!bookingId || !status) {
      return res
        .status(400)
        .json({ error: "Booking ID and status are required" });
    }

    const { client, db } = await connectToDatabase();

    // Update booking status
    const result = await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
          // Add completion timestamp when service is done
          ...(status === "completed" && { completedAt: new Date() }),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Get updated booking to return
    const updatedBooking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
