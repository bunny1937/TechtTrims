// pages/api/salons/bookings/[id].js
import { connectToDatabase } from "../../../../lib/mongodb";
import Booking from "../../../../models/Booking";

export default async function handler(req, res) {
  await connectToDatabase();
  const { method } = req;
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "id required" });

  try {
    if (method === "GET") {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(booking);
    }

    if (method === "PUT") {
      const update = req.body;
      const booking = await Booking.findByIdAndUpdate(id, update, {
        new: true,
      });
      if (!booking) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(booking);
    }

    if (method === "DELETE") {
      await Booking.findByIdAndDelete(id);
      return res.status(204).end();
    }

    return res
      .setHeader("Allow", ["GET", "PUT", "DELETE"])
      .status(405)
      .end(`Method ${method} Not Allowed`);
  } catch (err) {
    console.error("api/bookings/[id] error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
