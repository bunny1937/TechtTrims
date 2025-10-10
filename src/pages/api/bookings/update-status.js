import { connectToDatabase } from "../../../lib/mongodb";
import { updateSalonStats, updateBarberStats } from "../../../lib/statsHelper";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, status, queueStatus, estimatedDuration } = req.body;

    if (!bookingId || !status) {
      return res
        .status(400)
        .json({ error: "Booking ID and status are required" });
    }

    const { client, db } = await connectToDatabase();

    // Prepare update data
    const updateData = {
      status,
      updatedAt: new Date(),
    };

    // ✅ Map status to queueStatus for real-time updates
    const queueStatusMap = {
      confirmed: "RED",
      arrived: "ORANGE",
      started: "GREEN",
      completed: "COMPLETED",
    };

    // Set queueStatus based on status
    updateData.queueStatus = queueStatus || queueStatusMap[status] || "RED";

    // ✅ Add timestamps based on status
    if (status === "arrived") {
      updateData.arrivedAt = new Date();
    } else if (status === "started") {
      updateData.serviceStartedAt = new Date();
      if (estimatedDuration) {
        updateData.estimatedDuration = estimatedDuration;
        updateData.expectedCompletionTime = new Date(
          Date.now() + estimatedDuration * 60000
        );
      }
    } else if (status === "completed") {
      updateData.completedAt = new Date();
      updateData.serviceEndedAt = new Date();
    }

    // Update booking status
    const result = await db
      .collection("bookings")
      .updateOne({ _id: new ObjectId(bookingId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // ✅ UPDATE BARBER STATUS WHEN SERVICE STARTS/ENDS
    const updatedBooking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    if (status === "started" && updatedBooking?.barberId) {
      const endTime = new Date(Date.now() + (estimatedDuration || 45) * 60000);

      await db.collection("barbers").updateOne(
        { _id: new ObjectId(updatedBooking.barberId) },
        {
          $set: {
            currentStatus: "OCCUPIED",
            currentBookingId: updatedBooking._id,
            currentCustomerName: updatedBooking.customerName,
            currentServiceStartTime: new Date(),
            currentServiceEndTime: endTime,
            isAvailable: false,
          },
        }
      );
    } else if (status === "completed" && updatedBooking?.barberId) {
      await db.collection("barbers").updateOne(
        { _id: new ObjectId(updatedBooking.barberId) },
        {
          $set: {
            currentStatus: "AVAILABLE",
            currentBookingId: null,
            currentCustomerName: null,
            currentServiceStartTime: null,
            currentServiceEndTime: null,
            isAvailable: true,
          },
        }
      );
    }

    // ✅ Calculate wait time when completed
    if (status === "completed" && updatedBooking) {
      const scheduledTime = new Date(
        `${updatedBooking.date}T${updatedBooking.time}:00`
      );
      const waitMinutes = Math.max(
        0,
        Math.round((updatedBooking.completedAt - scheduledTime) / 60000)
      );

      // Get current average and update it
      const salon = await db
        .collection("salons")
        .findOne({ _id: updatedBooking.salonId });

      const currentAvg = salon?.stats?.averageWaitTime || 0;
      const totalBookings = salon?.stats?.totalBookings || 1;
      const newAvg = Math.round(
        (currentAvg * (totalBookings - 1) + waitMinutes) / totalBookings
      );

      await db
        .collection("salons")
        .updateOne(
          { _id: updatedBooking.salonId },
          { $set: { "stats.averageWaitTime": newAvg } }
        );
    }

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
      queueStatus: updateData.queueStatus,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
