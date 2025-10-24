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

    console.log("Received:", { bookingCode, salonId });

    if (!bookingCode) {
      return res
        .status(400)
        .json({ success: false, message: "Booking code required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const booking = await db.collection("bookings").findOne({
      bookingCode: bookingCode.toUpperCase(),
      salonId: new ObjectId(salonId),
    });

    console.log("Found booking:", booking);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found. Check the code.",
      });
    }

    if (booking.queueStatus !== "RED") {
      return res.status(400).json({
        success: false,
        message: `Already checked in (Status: ${booking.queueStatus})`,
      });
    }

    // Calculate correct position based on who checked in BEFORE this booking
    const position = await db.collection("bookings").countDocuments({
      salonId: new ObjectId(salonId),
      barberId: booking.barberId,
      queueStatus: "ORANGE",
      isExpired: { $ne: true },
    });

    const correctQueuePosition = position + 1;

    // Update booking to ORANGE with correct position
    await db.collection("bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          queueStatus: "ORANGE",
          queuePosition: correctQueuePosition,
          status: "arrived",
          arrivedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log("✅ Checked in:", {
      code: booking.bookingCode,
      customer: booking.customerName,
      barber: booking.barber,
      position: correctQueuePosition,
      arrivedAt: new Date().toLocaleTimeString(),
    });

    res.status(200).json({
      success: true,
      message: "Customer checked in successfully",
      booking: {
        customerName: booking.customerName,
        queuePosition: correctQueuePosition,
        barber: booking.barber,
      },
    });
  } catch (error) {
    console.error("Verify arrival error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
}
