// File: /api/barber/service-control.js
// POST /api/barber/service-control

// Request Body:
// {
//   action: "START" | "END",
//   bookingId: String,
//   barberId: String,
//   duration: Number // only for START action
// }

// Response:
// {
//   success: true,
//   message: "Service started successfully",
//   nextCustomer: {
//     bookingCode: "...",
//     customerName: "...",
//     service: "..."
//   } | null
// }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { action, bookingId, barberId, duration } = req.body;
    const db = await connectToDatabase();

    if (action === "START") {
      // Start service - move from ORANGE to GREEN
      const now = new Date();
      const serviceEndTime = new Date(now.getTime() + duration * 60 * 1000);

      await db.collection("bookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "GREEN",
            status: "in_service",
            serviceStartedAt: now,
            selectedDuration: duration,
            lastUpdated: now,
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
            timeLeftInMinutes: duration,
          },
        }
      );

      res.status(200).json({
        success: true,
        message: "Service started successfully",
      });
    } else if (action === "END") {
      // End service
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      const actualDuration = booking.serviceStartedAt
        ? (Date.now() - new Date(booking.serviceStartedAt).getTime()) /
          1000 /
          60
        : null;

      await db.collection("bookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "COMPLETED",
            status: "completed",
            serviceEndedAt: new Date(),
            actualDuration: Math.round(actualDuration),
            lastUpdated: new Date(),
          },
        }
      );

      // Get next customer in queue
      const nextCustomer = await db.collection("bookings").findOne(
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
            currentStatus: nextCustomer ? "OCCUPIED" : "AVAILABLE",
            currentBookingId: nextCustomer?._id || null,
            timeLeftInMinutes: 0,
          },
          $inc: { queueLength: -1 },
          $pull: { waitingCustomers: new ObjectId(bookingId) },
        }
      );

      // Auto-start next customer's service
      if (nextCustomer) {
        await db.collection("bookings").updateOne(
          { _id: nextCustomer._id },
          {
            $set: {
              queueStatus: "GREEN",
              status: "in_service",
              serviceStartedAt: new Date(),
            },
          }
        );
      }

      res.status(200).json({
        success: true,
        message: "Service completed successfully",
        nextCustomer: nextCustomer
          ? {
              bookingCode: nextCustomer.bookingCode,
              customerName: nextCustomer.customerName,
              service: nextCustomer.service,
            }
          : null,
      });
    }

    // Update salon realtime state
    await updateSalonRealtimeState(db, booking.salonId);
  } catch (error) {
    console.error("Service control error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
