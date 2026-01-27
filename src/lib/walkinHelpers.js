// src/lib/walkinHelpers.js

import { ObjectId } from "mongodb";

// NEW LOGIC: Calculate wait time based on PRIORITY QUEUE (arrived users)
export async function calculateWaitTime(db, barberId) {
  try {
    const barber = await db
      .collection("barbers")
      .findOne({ _id: new ObjectId(barberId) });

    if (!barber) return 0;

    let timeLeft = 0;

    // 1. If barber is currently serving someone (GREEN status)
    if (barber.currentServiceEndTime) {
      const now = new Date();
      const endTime = new Date(barber.currentServiceEndTime);
      timeLeft = Math.max(0, Math.ceil((endTime - now) / (1000 * 60))); // minutes
    }

    // 2. Get ONLY GOLDEN (arrived & waiting) bookings - PRIORITY QUEUE
    const priorityQueueBookings = await db
      .collection("bookings")
      .find({
        barberId: new ObjectId(barberId),
        queueStatus: "ORANGE", // ORANGE = arrived at salon (GOLDEN UI)
        isExpired: false,
      })
      .sort({ arrivedAt: 1 }) // Sort by arrival time (first come, first served)
      .toArray();

    // Calculate total wait time from PRIORITY QUEUE only
    const priorityWaitTime = priorityQueueBookings.reduce((total, booking) => {
      return total + (booking.estimatedDuration || 30);
    }, 0);

    // Total wait = current service time + all arrived users' time
    const totalWait = timeLeft + priorityWaitTime;

    return totalWait > 0 ? totalWait : 0;
  } catch (error) {
    console.error("Calculate wait time error:", error);
    return 0;
  }
}

// NEW HELPER: Get position in priority queue for an arrived user
export async function getPriorityQueuePosition(db, barberId, bookingId) {
  try {
    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    if (!booking || booking.queueStatus !== "ORANGE") {
      return null; // Not in priority queue
    }

    // Count how many ORANGE users arrived BEFORE this user
    const position = await db.collection("bookings").countDocuments({
      barberId: new ObjectId(barberId),
      queueStatus: "ORANGE",
      isExpired: false,
      arrivedAt: { $lt: booking.arrivedAt }, // Arrived before this user
    });

    return position + 1; // Position starts from 1
  } catch (error) {
    console.error("Get priority queue position error:", error);
    return null;
  }
}

// NEW HELPER: Update queue positions when someone is served
export async function updateQueuePositionsAfterServe(db, barberId) {
  try {
    // Get all ORANGE bookings sorted by arrivedAt
    const orangeBookings = await db
      .collection("bookings")
      .find({
        barberId: new ObjectId(barberId),
        queueStatus: "ORANGE",
        isExpired: false,
      })
      .sort({ arrivedAt: 1 })
      .toArray();

    // Update positions
    const bulkOps = orangeBookings.map((booking, index) => ({
      updateOne: {
        filter: { _id: booking._id },
        update: { $set: { queuePosition: index + 1, lastUpdated: new Date() } },
      },
    }));

    if (bulkOps.length > 0) {
      await db.collection("bookings").bulkWrite(bulkOps);
    }

    return orangeBookings.length;
  } catch (error) {
    console.error("Update queue positions error:", error);
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
            },
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
          },
        );
      }
    }
  } catch (error) {
    console.error("Update barber status error:", error);
  }
}
// ALIAS for backward compatibility
export const getQueuePositionWithPriority = getPriorityQueuePosition;

// NEW: Expire old bookings (RED status older than 45 min + 5 min buffer)
export async function expireOldBookings(db, barberId) {
  try {
    const now = new Date();
    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min buffer

    const result = await db.collection("bookings").updateMany(
      {
        barberId: new ObjectId(barberId),
        queueStatus: "RED",
        expiresAt: { $lt: bufferTime },
        isExpired: false,
        arrivedAt: { $exists: false }, // 🔥 DO NOT EXPIRE ARRIVED USERS
      },
      {
        $set: {
          isExpired: true,
          expiredAt: now,
        },
      },
    );

    console.log(
      `✅ Expired ${result.modifiedCount} old bookings for barber ${barberId}`,
    );
    return result.modifiedCount;
  } catch (error) {
    console.error("Expire old bookings error:", error);
    return 0;
  }
}
