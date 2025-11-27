import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { bookingCode, barberId } = req.body;

    console.log("Assign barber request:", { bookingCode, barberId });

    if (!bookingCode || !barberId) {
      return res
        .status(400)
        .json({ message: "Missing bookingCode or barberId" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find booking by code
    const booking = await db.collection("bookings").findOne({
      bookingCode: bookingCode.toUpperCase(),
    });

    console.log("Found booking:", booking ? "Yes" : "No");

    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found with code: " + bookingCode });
    }

    if (booking.barberId) {
      return res.status(400).json({
        message: "Booking already assigned to a barber",
      });
    }

    // Get barber details
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    console.log("Found barber:", barber ? barber.name : "No");

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    // Update booking
    const updateResult = await db.collection("bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          barberId: new ObjectId(barberId),
          barber: barber.name,
          assignmentStatus: "assigned",
          assignedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log("Booking updated:", updateResult.modifiedCount);

    // Update barber queue
    await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberId) },
      {
        $inc: { queueLength: 1 },
      }
    );

    res.status(200).json({
      success: true,
      message: `Booking ${bookingCode} assigned to ${barber.name}`,
      booking: {
        bookingCode,
        barberName: barber.name,
        customerName: booking.customerName,
      },
    });
  } catch (error) {
    console.error("Assign barber error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
