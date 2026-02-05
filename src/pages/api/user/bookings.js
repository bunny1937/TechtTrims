import clientPromise from "../../../lib/mongodb";
import { verifyToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";
import { withAuth } from "../../../lib/middleware/withAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ Read token from HttpOnly cookie
    const { userId } = req.user;

    const client = await clientPromise;
    const db = client.db("techtrims");

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Debug: Check all bookings first
    const allBookings = await db.collection("bookings").find({}).toArray();

    // Try multiple search strategies
    const searchQueries = [
      { userId: new ObjectId(userId) },
      { customerPhone: user.phone },
      { customerName: user.name },
    ];

    // Get bookings by phone number or userId
    const bookings = await db
      .collection("bookings")
      .find({
        $or: searchQueries,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Get salon names for bookings
    // If no bookings found, try fallback searches
    let finalBookings = bookings;

    if (bookings.length === 0) {
      // Try searching by partial phone match
      const phoneSearch = await db
        .collection("bookings")
        .find({ customerPhone: { $regex: user.phone.slice(-10) } })
        .toArray();

      // Try searching by partial name match
      const nameSearch = await db
        .collection("bookings")
        .find({ customerName: { $regex: user.name, $options: "i" } })
        .toArray();

      finalBookings = [...phoneSearch, ...nameSearch];

      // Remove duplicates
      finalBookings = finalBookings.filter(
        (booking, index, self) =>
          index ===
          self.findIndex((b) => b._id.toString() === booking._id.toString()),
      );
    }

    // Get salon names for bookings
    // Get salon names AND barber names for bookings
    const bookingsWithSalons = await Promise.all(
      finalBookings.map(async (booking) => {
        let salonName = "Unknown Salon";
        let barberName = null;

        // Get salon name
        if (booking.salonId) {
          try {
            const salonObjectId =
              typeof booking.salonId === "string"
                ? new ObjectId(booking.salonId)
                : booking.salonId;

            const salon = await db
              .collection("salons")
              .findOne(
                { _id: salonObjectId },
                { projection: { salonName: 1, "salonDetails.name": 1 } },
              );
            salonName =
              salon?.salonName || salon?.salonDetails?.name || "Unknown Salon";
          } catch (error) {
            console.error(
              "Error fetching salon for booking:",
              booking._id,
              error,
            );
          }
        }

        // ✅ Get barber name if barberId exists
        if (booking.barberId) {
          try {
            const barberObjectId =
              typeof booking.barberId === "string"
                ? new ObjectId(booking.barberId)
                : booking.barberId;

            const barber = await db
              .collection("barbers")
              .findOne({ _id: barberObjectId }, { projection: { name: 1 } });
            barberName = barber?.name || null;
          } catch (error) {
            console.error(
              "Error fetching barber for booking:",
              booking._id,
              error,
            );
          }
        }

        // Use existing barber field if barberName not found
        if (!barberName && booking.barber) {
          barberName = booking.barber;
        }

        return {
          ...booking,
          _id: booking._id.toString(),
          salonName,
          barberName,
        };
      }),
    );

    res.status(200).json(bookingsWithSalons);
  } catch (error) {
    console.error("User bookings API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default withAuth(handler);
