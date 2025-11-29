// src/pages/api/walkin/create-booking.js
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      salonId,
      barberId,
      service,
      price,
      customerName,
      customerPhone,
      customerEmail,
      userId,
      estimatedDuration,
    } = req.body;

    // ✅ STRICT VALIDATION - customerName is required and must not be empty
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    // Validation
    if (!salonId || !barberId || !service) {
      console.error("Missing fields:", {
        salonId,
        barberId,
        service,
        customerName,
      });
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get salon details
    const salon = await db.collection("salons").findOne({
      _id: new ObjectId(salonId),
    });

    // Generate booking code
    const generateShortBookingCode = (salonName) => {
      const words = salonName.trim().split(" ");
      let initials = "";

      if (words.length >= 2) {
        initials = words[0][0] + words[1][0];
      } else if (words.length === 1) {
        initials = words[0].substring(0, 2);
      }

      initials = initials.toUpperCase();
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const randomLetter = String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      );

      return `${initials}-${randomNumber}${randomLetter}`;
    };

    const bookingCode = generateShortBookingCode(
      salon?.salonName || "TechTrims"
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 60 * 1000);

    // Barber assignment
    let barberObjectId = null;
    let barberName = "Unassigned";
    let assignmentStatus = "pending";

    if (barberId && barberId !== "ANY") {
      try {
        barberObjectId = new ObjectId(barberId);
        const barberDoc = await db
          .collection("barbers")
          .findOne({ _id: barberObjectId });
        barberName = barberDoc?.name || "Unknown";
        console.log("✅ Barber assigned:", barberName);
      } catch (error) {
        console.error("Invalid barber ID:", barberId, error);
        barberObjectId = null;
      }
    }

    // Queue position assigned on arrival
    let queuePosition = null;

    console.log("Booking created with RED status - no queue position yet", {
      barber: barberName,
      bookingCode,
      customerName: customerName.trim(), // ✅ Log trimmed name
    });

    // Create booking document
    const bookingDoc = {
      salonId: new ObjectId(salonId),
      barberId: barberObjectId,
      barber: barberName,
      assignmentStatus: assignmentStatus,
      queuePosition: null,
      bookedAt: now,
      customerName: customerName.trim(), // ✅ TRIM AND SAVE
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      userId: userId || null,
      service,
      price: Number(price) || 0,
      bookingCode,
      queueStatus: "RED",
      status: "confirmed",
      estimatedDuration: estimatedDuration || 30,
      expiresAt,
      isExpired: false,
      bookingType: "WALKIN",
      createdAt: now,
      updatedAt: now,
    };

    console.log("✅ Booking document created:", {
      bookingCode,
      customerName: bookingDoc.customerName,
      barber: barberName,
      barberId: barberObjectId?.toString(),
    });

    const result = await db.collection("bookings").insertOne(bookingDoc);

    // Update barber stats
    if (barberObjectId) {
      try {
        await db.collection("barbers").updateOne(
          { _id: barberObjectId },
          {
            $inc: {
              totalBookings: 1,
              queueLength: 1,
            },
          }
        );
        console.log(`✅ Updated barber ${barberName} stats`);
      } catch (barberError) {
        console.error("❌ Error updating barber stats:", barberError);
      }
    }

    res.status(201).json({
      success: true,
      booking: {
        bookingId: result.insertedId.toString(),
        bookingCode,
        customerName: bookingDoc.customerName, // ✅ Return saved name
        expiresAt: expiresAt.toISOString(),
        queuePosition,
        barber: barberName,
      },
    });
  } catch (error) {
    console.error("❌ Create walk-in booking error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
