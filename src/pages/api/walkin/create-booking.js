import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { generateBookingCode } from "@/lib/bookingCodeGenerator";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      salonId,
      barberId,
      services, // ✅ NEW: array
      service,
      price,
      customerName,
      customerPhone,
      customerEmail,
      userId,
    } = req.body;

    // ✅ Handle both formats
    const servicesList =
      services ||
      (service
        ? [
            {
              name: service,
              price: req.body.price,
              duration: FIXED_DURATION,
            },
          ]
        : []);
    /* ---------------- VALIDATION ---------------- */

    if (!salonId || !barberId || !service) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    /* ---------------- SALON ---------------- */

    const salon = await db.collection("salons").findOne({
      _id: new ObjectId(salonId),
    });

    /* ---------------- BARBER ---------------- */

    let barberObjectId = null;
    let barberName = "Unassigned";

    if (barberId && barberId !== "ANY") {
      barberObjectId = new ObjectId(barberId);
      const barberDoc = await db
        .collection("barbers")
        .findOne({ _id: barberObjectId });

      barberName = barberDoc?.name || "Unknown";
    }

    /* ---------------- TIME & QUEUE ---------------- */

    const now = new Date();
    const FIXED_DURATION = 30;
    const bookingCode = await generateBookingCode(salonId); // ✅ Dynamic
    const expiresAt = new Date(now.getTime() + FIXED_DURATION * 60 * 1000);

    const bookingDoc = {
      // Relations
      salonId: new ObjectId(salonId),
      barberId: barberObjectId,
      barber: barberName,

      // Customer
      customerName: customerName.trim(),
      customerPhone: customerPhone,
      customerEmail: customerEmail || "",
      userId: userId ? new ObjectId(userId) : null,

      // Service
      services: servicesList, // ✅ Array
      service: services ? services.map((s) => s.name).join(", ") : service,
      price: Number(price) || 0,

      // 🔥 ADD BOOKING CODE
      bookingCode,

      estimatedDuration: FIXED_DURATION,

      // WALK-IN QUEUE CORE
      bookingType: "WALKIN",
      queueStatus: "RED",
      queuePosition: null,
      isExpired: false,

      // Timing
      bookedAt: now,
      expiresAt,
      expectedCompletionTime: null,
      arrivedAt: null,
      serviceStartedAt: null,
      serviceEndedAt: null,

      // Status
      status: "confirmed",

      // Meta
      createdAt: now,
      updatedAt: now,
    };

    /* ---------------- INSERT ---------------- */

    const result = await db.collection("bookings").insertOne(bookingDoc);

    /* ---------------- BARBER STATS (SAFE) ---------------- */

    if (barberObjectId) {
      await db.collection("barbers").updateOne(
        { _id: barberObjectId },
        {
          $inc: {
            totalBookings: 1,
          },
        },
      );
    }

    /* ---------------- RESPONSE (BACKWARD COMPATIBLE) ---------------- */

    return res.status(201).json({
      success: true,
      booking: {
        bookingId: result.insertedId.toString(),
        bookingCode,
        barber: barberName,
        expiresAt: expiresAt.toISOString(),
        queueStatus: "RED",
      },
    });
  } catch (error) {
    console.error("❌ Walk-in booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
