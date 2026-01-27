import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  console.log("🔥 VERIFY ARRIVAL BODY:", req.body);

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

    if (!/^ST-[A-Z0-9]{4,8}$/.test(bookingCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking QR",
      });
    }
    if (!bookingCode || !salonId) {
      return res.status(400).json({
        success: false,
        message: "Booking code and salon ID required",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find booking FIRST
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

    // NOW it is safe to access booking
    if (booking.arrivedAt) {
      return res.status(400).json({
        success: false,
        message: "Booking already checked in",
      });
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    if (booking.queueStatus === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Service already completed",
      });
    }

    if (booking.queueStatus !== "RED") {
      return res.status(400).json({
        success: false,
        message: `Already checked in (${booking.queueStatus})`,
      });
    }

    const now = new Date();

    // Get all ORANGE bookings (sorted by bookedAt)
    const orangeBookings = await db
      .collection("bookings")
      .find({
        barberId: booking.barberId,
        queueStatus: "ORANGE",
        isExpired: { $ne: true },
      })
      .sort({ bookedAt: 1 })
      .toArray();

    // Calculate correct position for this booking
    let priorityPosition = orangeBookings.length + 1; // Default to end
    for (let i = 0; i < orangeBookings.length; i++) {
      if (new Date(booking.bookedAt) < new Date(orangeBookings[i].bookedAt)) {
        priorityPosition = i + 1;
        break;
      }
    }

    // ✅ ALWAYS MARK AS ORANGE (ARRIVED) - NEVER GREEN
    await db.collection("bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          queueStatus: "ORANGE",
          status: "arrived",
          arrivedAt: now,
          queuePosition: priorityPosition,
          lastUpdated: now,

          // 🔥 FIX: ARRIVAL OVERRIDES EXPIRY
          isExpired: false,
          expiredAt: null,
        },
      },
    );

    // Recalculate positions for ALL ORANGE bookings
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

    // Fetch the final updated booking
    const finalBooking = await db
      .collection("bookings")
      .findOne({ _id: booking._id });

    console.log(
      `${booking.customerName}: Position ${finalBooking.queuePosition}/${allOrangeBookings.length}`,
    );

    return res.status(200).json({
      success: true,
      message: "Checked in successfully",
      booking: {
        _id: finalBooking._id.toString(),
        customerName: finalBooking.customerName,
        queuePosition: finalBooking.queuePosition,
        queueStatus: finalBooking.queueStatus,
        totalInQueue: allOrangeBookings.length,
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
