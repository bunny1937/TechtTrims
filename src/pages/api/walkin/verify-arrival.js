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

    // Mark as ORANGE
    await db.collection("bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          queueStatus: "ORANGE",
          status: "arrived",
          arrivedAt: now,
          lastUpdated: now,
        },
      }
    );

    // Get all ORANGE bookings for same barber
    const orangeBookings = await db
      .collection("bookings")
      .find({
        barberId: booking.barberId,
        queueStatus: "ORANGE",
        isExpired: { $ne: true },
      })
      .sort({ createdAt: 1 })
      .toArray();

    // Update positions
    const bulkOps = orangeBookings.map((b, idx) => ({
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
