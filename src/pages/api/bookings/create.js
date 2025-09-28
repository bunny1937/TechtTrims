import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const {
      salonId,
      service,
      barber,
      date,
      time,
      user,
      price,
      customerName,
      customerPhone,
    } = req.body;

    if (!salonId || !service || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for existing booking
    const existingBooking = await db.collection("bookings").findOne({
      salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
      date,
      time,
      status: { $ne: "cancelled" },
    });

    if (existingBooking) {
      return res.status(409).json({ error: "Time slot already booked" });
    }

    const bookingData = {
      salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
      service,
      barber: barber || null,
      date,
      time,
      customerName: customerName || "Guest",
      customerPhone: customerPhone || "",
      price: price || 0,
      paymentStatus: "pending",
      status: "confirmed",
      userId: user?._id || user?.id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      feedback: {
        submitted: false,
        ratings: {},
        comment: "",
      },
    };

    const result = await db.collection("bookings").insertOne(bookingData);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertedId,
      _id: result.insertedId,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
