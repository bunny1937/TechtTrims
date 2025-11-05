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
      if (!duration)
        return res
          .status(400)
          .json({ message: "Duration is required for START action" });

      const now = new Date();
      const serviceEndTime = new Date(now.getTime() + duration * 60 * 1000);

      // Get the booking to verify it's in priority queue (ORANGE)
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // CRITICAL: Only ORANGE (arrived) bookings can be served
      if (booking.queueStatus !== "ORANGE") {
        return res.status(400).json({
          message:
            "Only arrived users (ORANGE status) can be served. Current status: " +
            booking.queueStatus,
        });
      }

      // Update booking to GREEN - NOW BEING SERVED
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "GREEN", // User is now being served
            status: "inservice",
            serviceStartedAt: now,
            selectedDuration: duration,
            expectedCompletionTime: serviceEndTime,
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
            currentCustomerName: booking.customerName,
            currentServiceStartTime: now,
            currentServiceEndTime: serviceEndTime,
            timeLeftInMinutes: duration,
            lastUpdated: now,
          },
        }
      );

      console.log("Service STARTED (GREEN)", {
        barber: barberId,
        customer: booking.customerName,
        bookingCode: booking.bookingCode,
        duration: duration + " mins",
        willEndAt: serviceEndTime.toLocaleTimeString(),
      });

      res.status(200).json({
        success: true,
        message: "Service started successfully",
        booking: {
          bookingCode: booking.bookingCode,
          customerName: booking.customerName,
          service: booking.service,
        },
      });
    } else if (action === "END") {
      const now = new Date();

      // Get booking to calculate actual duration
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.queueStatus !== "GREEN") {
        return res.status(400).json({
          message:
            "Only GREEN (in-service) bookings can be ended. Current status: " +
            booking.queueStatus,
        });
      }

      const actualDuration = booking?.serviceStartedAt
        ? Math.round((now - new Date(booking.serviceStartedAt)) / (1000 * 60))
        : null;

      // Update booking to COMPLETED
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "COMPLETED",
            status: "completed",
            serviceEndedAt: now,
            actualDuration: actualDuration,
            lastUpdated: now,
          },
        }
      );

      // Get NEXT customer in PRIORITY QUEUE (ORANGE - arrived users only)
      const nextCustomer = await db.collection("bookings").findOne(
        {
          barberId: new ObjectId(barberId),
          queueStatus: "ORANGE", // Only arrived users (GOLDEN/ORANGE)
          isExpired: false,
        },
        { sort: { arrivedAt: 1 } } // Sort by arrival time (first arrived, first served)
      );

      // Update barber status - either to next customer or AVAILABLE
      await db.collection("barbers").updateOne(
        { _id: new ObjectId(barberId) },
        {
          $set: {
            currentStatus: "AVAILABLE", // Always AVAILABLE after service ends (they'll pick next)
            currentBookingId: null,
            currentCustomerName: null,
            currentServiceStartTime: null,
            currentServiceEndTime: null,
            timeLeftInMinutes: 0,
            lastUpdated: now,
          },
        }
      );

      // Update all ORANGE queue positions (re-order after one completes)
      const orangeBookings = await db
        .collection("bookings")
        .find({
          barberId: new ObjectId(barberId),
          queueStatus: "ORANGE",
          isExpired: false,
        })
        .sort({ arrivedAt: 1 })
        .toArray();

      if (orangeBookings.length > 0) {
        const bulkOps = orangeBookings.map((b, index) => ({
          updateOne: {
            filter: { _id: b._id },
            update: { $set: { queuePosition: index + 1, lastUpdated: now } },
          },
        }));
        await db.collection("bookings").bulkWrite(bulkOps);
      }

      console.log("Service ENDED", {
        customer: booking.customerName,
        bookingCode: booking.bookingCode,
        actualDuration: actualDuration + " mins",
        completedAt: now.toLocaleTimeString(),
        nextInQueue: nextCustomer ? nextCustomer.customerName : "None",
        totalWaitingCount: orangeBookings.length,
      });

      res.status(200).json({
        success: true,
        message: "Service completed successfully",
        actualDuration: actualDuration,
        nextCustomer: nextCustomer
          ? {
              bookingCode: nextCustomer.bookingCode,
              customerName: nextCustomer.customerName,
              queuePosition: 1, // Next person is always position 1
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
