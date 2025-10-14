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

    // Generate unique booking code
    // Get salon details for initials
    const salon = await db.collection("salons").findOne({
      _id: new ObjectId(salonId),
    });

    // Generate short booking code based on salon name
    const generateShortBookingCode = (salonName) => {
      // Get initials from salon name (e.g., "Singhania Trims" -> "ST")
      const words = salonName.trim().split(" ");
      let initials = "";

      if (words.length >= 2) {
        // Take first letter of first two words
        initials = words[0][0] + words[1][0];
      } else if (words.length === 1) {
        // Take first two letters if single word
        initials = words[0].substring(0, 2);
      }

      initials = initials.toUpperCase();

      // Generate 4-digit random number
      const randomNumber = Math.floor(1000 + Math.random() * 9000);

      // Generate random letter (A-Z)
      const randomLetter = String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      );

      return `${initials}-${randomNumber}${randomLetter}`;
    };

    const bookingCode = generateShortBookingCode(
      salon?.salonName || "TechTrims"
    );

    // Create booking with 45-minute expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 60 * 1000);

    const bookingDoc = {
      salonId: new ObjectId(salonId),
      barberId: new ObjectId(barberId),
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

    const result = await db.collection("bookings").insertOne(bookingDoc);

    // Update barber queue count
    await db
      .collection("barbers")
      .updateOne({ _id: new ObjectId(barberId) }, { $inc: { queueLength: 1 } });

    res.status(201).json({
      success: true,
      booking: {
        bookingId: result.insertedId.toString(),
        bookingCode,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create walk-in booking error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
