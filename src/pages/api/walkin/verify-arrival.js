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
      return res
        .status(404)
        .json({
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

    await db.collection("bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          queueStatus: "ORANGE",
          status: "arrived",
          arrivedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const queuePosition = await db.collection("bookings").countDocuments({
      salonId: new ObjectId(salonId),
      queueStatus: "ORANGE",
    });

    res.status(200).json({
      success: true,
      message: "Customer checked in successfully",
      booking: {
        customerName: booking.customerName,
        queuePosition,
      },
    });
  } catch (error) {
    console.error("Verify arrival error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
}
