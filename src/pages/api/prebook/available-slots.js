import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { salonId, barberId, date } = req.query;

    if (!salonId || !date) {
      return res.status(400).json({ error: "Missing salonId or date" });
    }

    // Prevent fetching slots for today
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      return res.status(400).json({
        error:
          "Cannot fetch slots for today. Pre-booking is only for tomorrow onwards.",
        code: "SAME_DAY_NOT_ALLOWED",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Fetch salon
    const salon = await db.collection("salons").findOne({
      _id: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
    });

    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    // Get day of week
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "lowercase",
    });

    const operatingHours = salon.operatingHours?.[dayOfWeek];

    if (!operatingHours || !operatingHours.open || !operatingHours.close) {
      return res.status(400).json({
        error: `Salon is closed on ${dayOfWeek}s`,
        code: "SALON_CLOSED",
      });
    }

    // Parse operating hours
    let { open, close } = operatingHours;

    // Handle "2400" edge case
    if (close === "2400") close = "2359";
    if (open === "0000") open = "0001";

    const [openHour, openMin] = open.split(":").map(Number);
    const [closeHour, closeMin] = close.split(":").map(Number);

    // Generate 30-min interval slots
    const slots = [];
    let currentHour = openHour;
    let currentMin = openMin;

    while (
      currentHour < closeHour ||
      (currentHour === closeHour && currentMin < closeMin)
    ) {
      const timeSlot = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
      slots.push(timeSlot);

      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }

    // Check already booked slots
    const query = {
      salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
      date,
      bookingType: "PREBOOK",
      status: { $ne: "cancelled" },
    };

    if (barberId && barberId !== "ANY") {
      query.barberId = new ObjectId(barberId);
    }

    const bookedSlots = await db.collection("bookings").find(query).toArray();
    const bookedTimes = bookedSlots.map((b) => b.time);

    const availableSlots = slots.map((time) => ({
      time,
      available: !bookedTimes.includes(time),
    }));

    res.status(200).json({
      success: true,
      slots: availableSlots,
      date,
      salon: salon.salonName,
    });
  } catch (error) {
    console.error("[Available Slots Error]:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
