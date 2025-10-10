import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, date, from } = req.query;

    if (!salonId) {
      return res.status(400).json({ message: "Salon ID is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const query = { salonId: new ObjectId(salonId) };

    // ✅ Include walk-ins (they don't have date field)
    if (date && date !== "all" && !req.query.includeWalkins) {
      query.date = date;
    } else if (date && date !== "all" && req.query.includeWalkins) {
      // For specific date, show both prebook for that date AND walk-ins
      query.$or = [
        { date: date },
        {
          bookingType: "WALKIN",
          createdAt: {
            $gte: new Date(date + "T00:00:00"),
            $lte: new Date(date + "T23:59:59"),
          },
        },
      ];
    }

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ createdAt: -1 })
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
