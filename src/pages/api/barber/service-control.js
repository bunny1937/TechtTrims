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
      if (!duration) {
        return res
          .status(400)
          .json({ message: "Duration is required for START action" });
      }

      const now = new Date();
      const serviceEndTime = new Date(now.getTime() + duration * 60 * 1000);

      // Get the booking
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // CRITICAL: Only ORANGE (arrived) bookings can be served
      if (booking.queueStatus !== "ORANGE") {
        return res.status(400).json({
          message: `Only arrived users (ORANGE status) can be served. Current status: ${booking.queueStatus}`,
        });
      }

      // **STRICT QUEUE ENFORCEMENT - Only Position 1 allowed**
      if (booking.queuePosition !== 1) {
        const position1Booking = await db.collection("bookings").findOne({
          barberId: new ObjectId(barberId),
          queueStatus: "ORANGE",
          isExpired: false,
          queuePosition: 1,
        });

        return res.status(403).json({
          success: false,
          message: `❌ Queue violation! ${booking.customerName} is position ${booking.queuePosition}. Only position 1 can be served.`,
          currentPosition: booking.queuePosition,
          firstInQueue: position1Booking
            ? {
                customerName: position1Booking.customerName,
                bookingCode: position1Booking.bookingCode,
                position: 1,
              }
            : null,
        });
      }

      // **Check if barber is already occupied**
      const barber = await db.collection("barbers").findOne({
        _id: new ObjectId(barberId),
      });

      if (!barber) {
        return res.status(404).json({ message: "Barber not found" });
      }

      if (barber.currentStatus === "OCCUPIED" && barber.currentBookingId) {
        return res.status(400).json({
          success: false,
          message: `❌ Barber ${barber.name} is already serving ${barber.currentCustomerName}!`,
          currentBooking: {
            customerName: barber.currentCustomerName,
            timeLeft: Math.ceil(
              (new Date(barber.currentServiceEndTime) - now) / 1000 / 60
            ),
          },
        });
      }

      // ✅ All checks passed - Start service
      // Update booking to GREEN - NOW BEING SERVED
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            queueStatus: "GREEN",
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

      console.log("✅ Service STARTED (GREEN)", {
        barber: barber.name,
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

      // Get booking
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.queueStatus !== "GREEN") {
        return res.status(400).json({
          message: `Only GREEN (in-service) bookings can be ended. Current status: ${booking.queueStatus}`,
        });
      }

      const actualDuration = booking?.serviceStartedAt
        ? Math.round((now - new Date(booking.serviceStartedAt)) / 1000 / 60)
        : null;

      // 1. Mark booking as COMPLETED
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

      // 2. Free the barber IMMEDIATELY
      await db.collection("barbers").updateOne(
        { _id: new ObjectId(barberId) },
        {
          $set: {
            currentStatus: "AVAILABLE",
            currentBookingId: null,
            currentCustomerName: null,
            currentServiceStartTime: null,
            currentServiceEndTime: null,
            timeLeftInMinutes: null,
            lastUpdated: now,
          },
          $inc: {
            totalBookings: 1,
          },
        }
      );

      console.log(`✅ Service ENDED - Barber ${barberId} is now AVAILABLE`);

      // 3. **CRITICAL: Re-calculate ALL ORANGE positions by createdAt**
      const orangeBookings = await db
        .collection("bookings")
        .find({
          barberId: new ObjectId(barberId),
          queueStatus: "ORANGE",
          isExpired: false,
        })
        .sort({ createdAt: 1 }) // EARLIEST BOOKING FIRST
        .toArray();

      console.log(
        `📊 Found ${orangeBookings.length} waiting customers (ORANGE)`
      );

      if (orangeBookings.length > 0) {
        const bulkOps = orangeBookings.map((b, index) => ({
          updateOne: {
            filter: { _id: b._id },
            update: {
              $set: {
                queuePosition: index + 1, // First = Pos 1
                lastUpdated: now,
              },
            },
          },
        }));

        await db.collection("bookings").bulkWrite(bulkOps);

        console.log(`✅ Updated ${orangeBookings.length} queue positions`);
        orangeBookings.forEach((b, i) => {
          console.log(`  ${i + 1}. ${b.customerName} → Position ${i + 1}`);
        });
      }

      const nextCustomer = orangeBookings[0] || null;

      console.log("✅ Service ENDED", {
        completed: booking.customerName,
        duration: actualDuration + " mins",
        nextInLine: nextCustomer
          ? `${nextCustomer.customerName} (Pos 1)`
          : "None",
        totalWaiting: orangeBookings.length,
      });

      res.status(200).json({
        success: true,
        message: "Service completed successfully",
        actualDuration: actualDuration,
        nextCustomer: nextCustomer
          ? {
              bookingCode: nextCustomer.bookingCode,
              customerName: nextCustomer.customerName,
              queuePosition: 1,
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
