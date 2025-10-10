import { ObjectId } from "mongodb";

export async function calculateWaitTime(db, barberId) {
  try {
    // Get barber's current service time left
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) return 0;

    let timeLeft = 0;

    // If barber is currently serving someone
    if (
      barber.currentBookingId &&
      barber.currentServiceStartTime &&
      barber.currentServiceEndTime
    ) {
      const now = new Date();
      const endTime = new Date(barber.currentServiceEndTime);
      timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000 / 60)); // minutes
    }

    // Get queue count
    const queueCount = await db.collection("walkinbookings").countDocuments({
      barberId: new ObjectId(barberId),
      queueStatus: "ORANGE",
      isExpired: false,
    });

    // Estimated wait = time left + (queue * 45 mins average)
    const estimatedWait = timeLeft + queueCount * 45;

    return estimatedWait;
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
          await db.collection("walkinbookings").updateOne(
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
