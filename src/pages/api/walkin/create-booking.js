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

    // Validation
    if (!salonId || !barberId || !service || !customerName) {
      console.error("Missing fields:", {
        salonId,
        barberId,
        service,
        customerName,
      });
      return res.status(400).json({ message: "Missing required fields" });
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

    // Lines with barber assignment
    let barberObjectId = null;
    let barberName = "Unassigned";
    let assignmentStatus = "pending";

    if (barberId && barberId !== "ANY") {
      try {
        barberObjectId = new ObjectId(barberId); // Convert to ObjectId
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

    // CRITICAL: Ensure barberId in document is ObjectId

    // NEW LOGIC: Queue position ONLY assigned when user ARRIVES (queueStatus = ORANGE)
    // At booking time, queuePosition = null (not yet arrived)
    let queuePosition = null; // Position assigned later on arrival

    console.log("Booking created with RED status - no queue position yet", {
      barber: barberName,
      bookingCode,
    });

    console.log("✅ Queue position calculated:", {
      barber: barberName,
      existingOrangeCustomers:
        queuePosition === "Pending" ? 0 : queuePosition - 1,
      newPosition: queuePosition,
      bookingCode,
    });

    // ✅ CHANGED: Add queuePosition to document
    const bookingDoc = {
      salonId: new ObjectId(salonId),
      barberId: barberObjectId,
      barber: barberName,
      assignmentStatus: assignmentStatus,
      queuePosition: queuePosition, // ✅ Store in DB
      customerName,
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      userId: userId || null,
      service,
      price: Number(price),
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
    console.log("✅ Booking created:", {
      bookingCode,
      barber: barberName,
      barberId: barberObjectId?.toString(),
      salonId,
    });
    const result = await db.collection("bookings").insertOne(bookingDoc);

    // ✅ UPDATE BARBER STATS WHEN BOOKING IS CREATED
    if (bookingDoc.barber) {
      try {
        // Find barber by name and salonId
        const barber = await db.collection("barbers").findOne({
          name: bookingDoc.barber,
          salonId: bookingDoc.salonId,
        });

        if (barber) {
          // Increment total bookings
          await db.collection("barbers").updateOne(
            { _id: barber._id },
            {
              $inc: { totalBookings: 1 },
              $set: { updatedAt: new Date() },
            }
          );
          console.log(
            `✅ Updated barber ${barber.name} - totalBookings incremented`
          );
        } else {
          console.log(`⚠️ Barber not found: ${bookingDoc.barber}`);
        }
      } catch (barberError) {
        console.error(
          "❌ Error updating barber stats on booking creation:",
          barberError
        );
      }
    }

    // Update barber queue count
    if (barberId && barberId !== "ANY") {
      await db
        .collection("barbers")
        .updateOne(
          { _id: new ObjectId(barberId) },
          { $inc: { queueLength: 1 } }
        );
    }

    res.status(201).json({
      success: true,
      booking: {
        bookingId: result.insertedId.toString(),
        bookingCode,
        expiresAt: expiresAt.toISOString(),
        queuePosition,
        barber: barberName,
      },
    });
  } catch (error) {
    console.error("Create walk-in booking error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
