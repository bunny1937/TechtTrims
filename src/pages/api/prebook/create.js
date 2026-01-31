import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { generateBookingCode } from "@/lib/bookingCodeGenerator";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      salonId,
      service,
      barber,
      barberId,
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
      customerAge,
      customerGender,
      customerLocation,
      price,
      userId,
    } = req.body;

    // ✅ FIXED: customerPhone can be empty string, but still validate others
    if (!salonId || !service || !date || !time) {
      return res.status(400).json({
        error: "Missing required fields: salonId, service, date, time",
      });
    }

    // ✅ OPTIONAL: Validate customerPhone format if provided
    if (
      customerPhone &&
      customerPhone.length > 0 &&
      customerPhone.length < 10
    ) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // CRITICAL: Prevent same-day booking
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      return res.status(400).json({
        error:
          "Pre-booking is only available for tomorrow onwards. For same-day booking, please use walk-in.",
        code: "SAME_DAY_BOOKING_NOT_ALLOWED",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Check for slot conflict
    const existingBooking = await db.collection("bookings").findOne({
      salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
      date,
      time,
      bookingType: "PREBOOK",
      status: { $ne: "cancelled" },
    });

    if (existingBooking) {
      return res.status(409).json({
        error: "This time slot is already booked. Please select another time.",
        code: "SLOT_ALREADY_BOOKED",
      });
    }

    // Fetch salon details
    const salon = await db.collection("salons").findOne({
      _id: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
    });

    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    // Generate booking code
    const bookingCode = await generateBookingCode(salonId);

    // Calculate scheduled time
    const scheduledFor = new Date(`${date}T${time}:00`);
    const oneHourBefore = new Date(scheduledFor.getTime() - 60 * 60 * 1000);
    const twoHoursBefore = new Date(
      scheduledFor.getTime() - 2 * 60 * 60 * 1000,
    );

    const bookingData = {
      bookingCode,
      salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
      salonName: salon.salonName || "Unknown Salon",
      service,
      barber: barber || "Unassigned",
      barberId:
        barberId && ObjectId.isValid(barberId) ? new ObjectId(barberId) : null,
      date,
      time,
      bookingType: "PREBOOK",
      customerName: customerName || "Guest",
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      customerAge: customerAge || null,
      customerGender: customerGender || null,
      customerLocation: customerLocation || null,
      price: price || 0,
      paymentStatus: "pending",
      status: "confirmed",
      queueStatus: "PREBOOK_PENDING", // Will change to RED at 1hr before
      userId: userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null,

      // Prebook-specific fields
      scheduledFor,
      reminderSentAt: null,
      reminderScheduledFor: twoHoursBefore,
      priorityQueueActivatedAt: null,
      arrivedAt: null,
      serviceStartedAt: null,
      serviceEndedAt: null,
      estimatedDuration: null,
      actualServiceMinutes: null,
      isExpired: false,

      createdAt: new Date(),
      updatedAt: new Date(),

      feedback: {
        submitted: false,
        ratings: {},
        comment: "",
      },
    };

    const result = await db.collection("bookings").insertOne(bookingData);
    const bookingId = result.insertedId;

    // Link to user if exists
    if (userId && ObjectId.isValid(userId)) {
      await db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(userId) },
          { $push: { bookingHistory: bookingId } },
        );
    }

    // Update salon bookings array
    await db.collection("salons").updateOne(
      { _id: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId },
      {
        $push: {
          bookings: {
            id: bookingId,
            date,
            time,
            service,
            barber,
            type: "PREBOOK",
          },
        },
        $inc: { "stats.totalBookings": 1 },
      },
    );

    res.status(201).json({
      success: true,
      message: "Pre-booking confirmed successfully!",
      bookingId: bookingId.toString(),
      bookingCode,
      scheduledFor,
      booking: {
        ...bookingData,
        _id: bookingId,
      },
    });
  } catch (error) {
    console.error("[Prebook Create Error]:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
}
