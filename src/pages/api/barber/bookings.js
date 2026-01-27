// src/pages/api/barber/bookings.js
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, date } = req.query;

    if (!barberId) {
      return res.status(400).json({ message: "Barber ID is required" });
    }

    console.log("[Barber Bookings] Request:", { barberId, date });

    const client = await clientPromise;
    const db = client.db("techtrims");

    // ✅ FIRST: Get barber details to get name
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    console.log("[Barber Bookings] Barber name:", barber.name);

    // ✅ SEARCH BY BOTH barberId (ObjectId) AND barber (name string)
    let query = {
      $or: [
        { barberId: new ObjectId(barberId) },
        { barber: barber.name }, // Legacy bookings use name
      ],
    };

    // ✅ Date filter
    if (date && date !== "all") {
      // For specific date, match both pre-bookings and walk-ins on that date
      query = {
        $and: [
          {
            $or: [
              { barberId: new ObjectId(barberId) },
              { barber: barber.name },
            ],
          },
          {
            $or: [
              { date: date }, // Pre-bookings have date field
              {
                // Walk-ins use createdAt
                bookingType: "WALKIN",
                createdAt: {
                  $gte: new Date(date + "T00:00:00"),
                  $lte: new Date(date + "T23:59:59"),
                },
              },
            ],
          },
        ],
      };
    }

    console.log("[Barber Bookings] Query:", JSON.stringify(query, null, 2));

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({
        queueStatus: 1, // ORANGE first, then GREEN, then RED
        createdAt: 1, // Within same status, earliest first
      })
      .toArray();

    console.log("[Barber Bookings] Found bookings:", bookings.length);

    // ✅ Format bookings
    const formattedBookings = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
      salonId: booking.salonId?.toString(),
      userId: booking.userId?.toString(),
      barberId: booking.barberId?.toString() || null,
      barberName: booking.barber || barber.name,
    }));

    return res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("[Barber Bookings] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
