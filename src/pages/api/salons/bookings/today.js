import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const { salonId } = req.query;

    if (!salonId) {
      return res.status(400).json({ message: "Salon ID required" });
    }

    // ✅ define today BEFORE using it
    // get today in local timezone as YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    console.log("Fetching bookings for salon:", salonId, "date:", todayStr);

    const bookings = await db
      .collection("bookings")
      .find({
        salonId: salonId,
        date: todayStr,
        status: { $ne: "cancelled" },
      })
      .sort({ time: 1 })
      .toArray();

    res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching today's bookings:", error);
    // expose real error while debugging
    res.status(500).json({ message: error.message, stack: error.stack });
  }
}
