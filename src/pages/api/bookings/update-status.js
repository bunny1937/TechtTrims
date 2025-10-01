// src/pages/api/bookings/update-status.js
import { connectToDatabase } from "../../../lib/mongodb";
import { updateSalonStats, updateBarberStats } from "../../../lib/statsHelper";
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
    if (status === "completed") {
      const booking = await db
        .collection("bookings")
        .findOne({ _id: new ObjectId(bookingId) });
      if (booking) {
        const scheduledTime = new Date(`${booking.date}T${booking.time}:00`);
        const waitMinutes = Math.max(
          0,
          (booking.completedAt - scheduledTime) / 60000
        );

        // Get current average and update it
        const salon = await db
          .collection("salons")
          .findOne({ _id: booking.salonId });
        const currentAvg = salon?.stats?.averageWaitTime || 0;
        const totalBookings = salon?.stats?.totalBookings || 1;
        const newAvg = Math.round(
          (currentAvg * (totalBookings - 1) + waitMinutes) / totalBookings
        );

        await db
          .collection("salons")
          .updateOne(
            { _id: booking.salonId },
            { $set: { "stats.averageWaitTime": newAvg } }
          );
      }
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const updatedBooking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    // ✅ UPDATE SALON STATS IN REAL-TIME
    if (updatedBooking?.salonId) {
      await updateSalonStats(updatedBooking.salonId);
    }

    // ✅ UPDATE BARBER STATS IF COMPLETED
    if (status === "completed" && updatedBooking?.barber) {
      const barber = await db.collection("barbers").findOne({
        name: updatedBooking.barber,
      });
      if (barber) {
        await updateBarberStats(
          barber._id,
          barber.name,
          updatedBooking.salonId
        );
      }
    }

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
