// /src/pages/api/salons/[id]/barber-queue.js
import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { barberId } = req.query;

    if (!id || !barberId) {
      return res.status(400).json({ message: "Missing salonId or barberId" });
    }

    const { db } = await connectToDatabase();

    let salonObjectId, barberObjectId;
    try {
      salonObjectId = new ObjectId(id);
      barberObjectId = new ObjectId(barberId);
    } catch (err) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Get barber info
    const barber = await db
      .collection("barbers")
      .findOne({ _id: barberObjectId });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    const now = new Date();
    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

    const bookings = await db
      .collection("bookings")
      .find({
        salonId: salonObjectId,
        $or: [{ barberId: barberObjectId }, { barberId: barberId }],
        isExpired: false,
        queueStatus: { $in: ["RED", "ORANGE", "GREEN"] },
        $and: [
          {
            $or: [
              { queueStatus: { $ne: "RED" } },
              { expiresAt: { $gt: bufferTime } },
              { expiresAt: { $exists: false } },
            ],
          },
        ],
      })
      .toArray();

    // ✅ CALCULATE PRIORITY FOR SMART QUEUE ORDERING
    const bookingsWithPriority = bookings.map((b) => {
      let priority = 0;

      // GREEN status gets highest priority (currently serving)
      if (b.queueStatus === "GREEN") {
        priority = 10000;
      }
      // ORANGE status - calculate priority based on booking type and appointment time
      else if (b.queueStatus === "ORANGE") {
        // PREBOOK gets +1000 base priority
        if (b.bookingType === "PREBOOK") {
          priority += 1000;

          // If appointment is within 30 mins, add urgency bonus
          if (b.scheduledFor) {
            const timeUntilAppointment = new Date(b.scheduledFor) - now;
            const minsUntilAppointment = timeUntilAppointment / (60 * 1000);

            if (minsUntilAppointment <= 30 && minsUntilAppointment >= 0) {
              priority += 500;
            }
            // Bonus for appointments happening RIGHT NOW or past due
            if (minsUntilAppointment <= 0) {
              priority += 1000;
            }
          }
        }

        // Earlier arrivals get slight priority (fairness)
        if (b.arrivedAt) {
          const minutesSinceArrival = (now - new Date(b.arrivedAt)) / (60 * 1000);
          priority += Math.floor(minutesSinceArrival); // +1 per minute waited
        }
      }
      // RED status - lowest priority (not arrived yet)
      else if (b.queueStatus === "RED") {
        priority = -1000;
      }

      return { ...b, priority };
    });

    // ✅ SORT BY PRIORITY SCORE
    bookingsWithPriority.sort((a, b) => b.priority - a.priority);

    // Separate by status AFTER sorting
    const serving = bookingsWithPriority.find((b) => b.queueStatus === "GREEN");
    const orangeBookings = bookingsWithPriority.filter(
      (b) => b.queueStatus === "ORANGE"
    );
    const redBookings = bookingsWithPriority.filter(
      (b) => b.queueStatus === "RED"
    );

    // ✅ CALCULATE PERSONAL WAIT TIME FOR EACH BOOKING
    const queue = bookingsWithPriority.map((booking, index) => {
      let personalWait = 0;

    // If you're in ORANGE, calculate wait based on your position
if (booking.queueStatus === "ORANGE") {
  const myPosition = orangeBookings.findIndex((b) =>
    b._id.equals(booking._id)
  );

  // Add remaining time of current GREEN customer + 5 min buffer
  if (serving?.expectedCompletionTime) {
    const remaining = Math.ceil(
      (new Date(serving.expectedCompletionTime) - now) / 1000 / 60
    );
    personalWait = Math.max(0, remaining) + 5; // ✅ ADD 5 MIN BUFFER
  } else if (serving) {
    // If someone is serving but no completion time, assume 15 mins left + buffer
    personalWait = 20;
  }

  // Add 35 mins for each person AHEAD of you (30 min service + 5 min buffer)
  personalWait += myPosition * 35; // ✅ CHANGED FROM 30 TO 35
}


      return {
        _id: booking._id.toString(),
        customerName: booking.customerName || "Guest",
        queueStatus: booking.queueStatus,
        bookingType: booking.bookingType,
        scheduledFor: booking.scheduledFor,
        queuePosition:
          booking.queueStatus === "ORANGE"
            ? orangeBookings.findIndex((b) => b._id.equals(booking._id)) + 1
            : null,
        arrivedAt: booking.arrivedAt ? booking.arrivedAt.toISOString() : null,
        expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
        expectedCompletionTime: booking.expectedCompletionTime
          ? booking.expectedCompletionTime.toISOString()
          : null,
        service: booking.service,
        createdAt: booking.createdAt,
        estimatedWait: personalWait, // ✅ PERSONAL WAIT FOR THIS BOOKING
      };
    });

    // Calculate GLOBAL estimated wait (for salon-wide display)
    let globalEstimatedWait = 0;
    if (serving?.expectedCompletionTime) {
      const remaining = Math.ceil(
        (new Date(serving.expectedCompletionTime) - now) / 1000 / 60
      );
      globalEstimatedWait = Math.max(0, remaining);
    }
    globalEstimatedWait += orangeBookings.length * 30;

    res.status(200).json({
      success: true,
      chairNumber: barber.chairNumber || 1,
      queue: queue,
      serving: serving
        ? {
            customerName: serving.customerName || "Guest",
            expectedCompletionTime:
              serving.expectedCompletionTime?.toISOString(),
            timeRemaining: serving.expectedCompletionTime
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(serving.expectedCompletionTime) - now) /
                      1000 /
                      60
                  )
                )
              : 0,
          }
        : null,
      priorityQueueCount: orangeBookings.length,
      bookedCount: redBookings.length,
      waitingCount: orangeBookings.length,
      totalRedQueue: redBookings.length,
      estimatedWait: globalEstimatedWait, // ✅ Global wait for salon display
      totalInQueue: queue.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("❌ Barber queue API error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
