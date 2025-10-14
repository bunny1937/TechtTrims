import { ObjectId } from "mongodb";

export async function calculateWaitTime(db, barberId) {
  try {
    // Get barber's current service time left
    const barber = await db
      .collection("barbers")
      .findOne({ _id: new ObjectId(barberId) });
    if (!barber) return 0;

    let timeLeft = 0;

    // If barber is currently serving someone (GREEN status)
    if (barber.currentServiceEndTime) {
      const now = new Date();
      const endTime = new Date(barber.currentServiceEndTime);
      timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000 / 60)); // minutes
    }

    // Get all ORANGE (waiting) bookings with their estimated durations
    const waitingBookings = await db
      .collection("bookings")
      .find({
        barberId: new ObjectId(barberId),
        queueStatus: "ORANGE",
        isExpired: false,
      })
      .toArray();

    // Calculate total wait time from ORANGE bookings
    const orangeWaitTime = waitingBookings.reduce((total, booking) => {
      return total + (booking.estimatedDuration || 30);
    }, 0);

    // Total wait time = current service time left + all waiting bookings time
    const totalWait = timeLeft + orangeWaitTime;

    // CRITICAL FIX: Return timeLeft if no orange bookings, otherwise return total
    return totalWait > 0 ? totalWait : 0;
  } catch (error) {
    console.error("Calculate wait time error:", error);
    return 0;
  }
}

export async function updateBarberStatus(db, barberId) {
  try {
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) return;

    // Check if current service has ended
    if (barber.currentServiceEndTime) {
      const now = new Date();
      const endTime = new Date(barber.currentServiceEndTime);

      if (now >= endTime) {
        // Service should be done, auto-complete it
        if (barber.currentBookingId) {
          await db.collection("bookings").updateOne(
            { _id: barber.currentBookingId },
            {
              $set: {
                queueStatus: "COMPLETED",
                serviceEndedAt: now,
              },
            }
          );
        }

        // Reset barber to available
        await db.collection("barbers").updateOne(
          { _id: new ObjectId(barberId) },
          {
            $set: {
              currentStatus: "AVAILABLE",
              currentBookingId: null,
              currentServiceStartTime: null,
              currentServiceEndTime: null,
            },
          }
        );
      }
    }
  } catch (error) {
    console.error("Update barber status error:", error);
  }
}
