// pages/api/salons/bookings/index.js
import { connectToDatabase } from "../../../../lib/mongodb";
import Booking from "../../../../models/Booking";

/**
 * GET -> list bookings (query by salonId, date range, status)
 * POST -> create new booking
 */
export default async function handler(req, res) {
  await connectToDatabase();

  const { method } = req;
  const salonId = req.query.salonId || req.body.salonId; // pass salonId as query or body

  if (!salonId) return res.status(400).json({ error: "salonId is required" });

  try {
    if (method === "GET") {
      const { from, to, status } = req.query;
      const filter = { salonId };

      if (status) filter.status = status;
      if (from || to) filter.appointmentAt = {};
      if (from) filter.appointmentAt.$gte = new Date(from);
      if (to) filter.appointmentAt.$lte = new Date(to);

      const items = await Booking.find(filter)
        .sort({ appointmentAt: 1 })
        .limit(100);
      return res.status(200).json(items);
    }

    if (method === "POST") {
      const payload = req.body;
      // basic validation
      if (
        !payload.customerName ||
        !payload.customerPhone ||
        !payload.serviceId ||
        !payload.appointmentAt
      ) {
        return res.status(400).json({ error: "missing required fields" });
      }
      const booking = new Booking({
        ...payload,
        salonId,
      });
      await booking.save();
      return res.status(201).json(booking);
    }

    return res
      .setHeader("Allow", ["GET", "POST"])
      .status(405)
      .end(`Method ${method} Not Allowed`);
  } catch (err) {
    console.error("api/bookings error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
