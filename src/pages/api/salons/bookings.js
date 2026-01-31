import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, date, includeWalkins } = req.query;

    if (!salonId) {
      return res.status(400).json({ message: "Salon ID is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const query = {
      salonId: new ObjectId(salonId),
    };

    // UPDATED: Handle date filtering for both walkin and prebook
    if (date && date !== "all") {
      if (includeWalkins === "true") {
        // Show both: walkins created on date AND prebooks scheduled for date
        query.$or = [
          {
            // Walkins created on this date
            bookingType: "WALKIN",
            createdAt: {
              $gte: new Date(`${date}T00:00:00`),
              $lte: new Date(`${date}T23:59:59`),
            },
          },
          {
            // Prebooks scheduled for this date
            bookingType: "PREBOOK",
            date: date,
          },
        ];
      } else {
        // Only prebooks for this date
        query.date = date;
        query.bookingType = "PREBOOK";
      }
    } else if (date === "all") {
      // No date filter - show everything
    } else {
      // Default: only walkins
      query.bookingType = "WALKIN";
    }

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({
        queueStatus: 1, // ORANGE first, then GREEN, then RED
        createdAt: 1, // Within same status, earliest booking first
      })
      .toArray();

    // Format bookings with additional info
    const formattedBookings = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
      salonId: booking.salonId.toString(),
      userId: booking.userId?.toString(),
    }));

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching salon bookings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
