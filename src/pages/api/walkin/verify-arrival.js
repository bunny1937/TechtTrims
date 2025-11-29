import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { bookingCode, salonId } = req.body;

    if (!bookingCode || !salonId) {
      return res.status(400).json({
        success: false,
        message: "Booking code and salon ID required",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find booking
    const booking = await db.collection("bookings").findOne({
      bookingCode: bookingCode.toUpperCase(),
      salonId: new ObjectId(salonId),
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.queueStatus !== "RED") {
      return res.status(400).json({
        success: false,
        message: `Already checked in (${booking.queueStatus})`,
      });
    }

    const now = new Date();

    // ✅ CHECK IF CHAIR IS EMPTY (no GREEN booking for this barber)
    const greenBooking = await db.collection("bookings").findOne({
      barberId: booking.barberId,
      queueStatus: "GREEN",
      isExpired: { $ne: true },
    });

    // ✅ CHAIR EMPTY → Serve immediately
    if (!greenBooking) {
      await db.collection("bookings").updateOne(
        { _id: booking._id },
        {
          $set: {
            queueStatus: "GREEN",
            status: "started",
            arrivedAt: now,
            serviceStartedAt: now,
            queuePosition: null,
            lastUpdated: now,
          },
        }
      );

      const updatedBooking = await db
        .collection("bookings")
        .findOne({ _id: booking._id });

      return res.status(200).json({
        success: true,
        message: "Chair empty - customer seated immediately!",
        booking: {
          customerName: updatedBooking.customerName,
          queueStatus: "GREEN",
          queuePosition: null,
        },
      });
    }

    // ✅ CHAIR OCCUPIED → Join ORANGE priority queue sorted by bookedAt
    const orangeBookings = await db
      .collection("bookings")
      .find({
        barberId: booking.barberId,
        queueStatus: "ORANGE",
        isExpired: { $ne: true },
      })
      .sort({ bookedAt: 1 }) // Sort by booking time
      .toArray();

    // Calculate correct position for this booking
    let priorityPosition = orangeBookings.length + 1; // Default to end
    for (let i = 0; i < orangeBookings.length; i++) {
      if (new Date(booking.bookedAt) < new Date(orangeBookings[i].bookedAt)) {
        priorityPosition = i + 1;
        break;
      }
    }

    // Update this booking to ORANGE with correct position
    await db.collection("bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          queueStatus: "ORANGE",
          status: "arrived",
          arrivedAt: now,
          queuePosition: priorityPosition,
          lastUpdated: now,
        },
      }
    );

    // Recalculate positions for all ORANGE bookings (sorted by bookedAt)
    const allOrangeBookings = await db
      .collection("bookings")
      .find({
        barberId: booking.barberId,
        queueStatus: "ORANGE",
        isExpired: { $ne: true },
      })
      .sort({ bookedAt: 1 })
      .toArray();

    const bulkOps = allOrangeBookings.map((b, idx) => ({
      updateOne: {
        filter: { _id: b._id },
        update: { $set: { queuePosition: idx + 1 } },
      },
    }));

    if (bulkOps.length > 0) {
      await db.collection("bookings").bulkWrite(bulkOps);
    }

    const myPos =
      orangeBookings.findIndex(
        (b) => b._id.toString() === booking._id.toString()
      ) + 1;

    console.log(
      `✅ ${booking.customerName} → Position ${myPos}/${orangeBookings.length}`
    );

    return res.status(200).json({
      success: true,
      message: "Checked in successfully",
      booking: {
        customerName: booking.customerName,
        queuePosition: myPos,
        totalInQueue: orangeBookings.length,
      },
    });
  } catch (error) {
    console.error("Verify arrival error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
