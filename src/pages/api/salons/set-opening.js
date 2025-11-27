import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, openingTime } = req.body;

    if (!salonId || !openingTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get current day
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const today = days[new Date().getDay()];

    // Update today's opening time
    await db.collection("salons").updateOne(
      { _id: new ObjectId(salonId) },
      {
        $set: {
          [`operatingHours.${today}.open`]: openingTime,
          openingTime, // Temporary field
        },
      }
    );

    // Schedule auto-open
    const [hours, minutes] = openingTime.split(":");
    const openingDate = new Date();
    openingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const timeUntilOpen = openingDate - new Date();
    if (timeUntilOpen > 0) {
      setTimeout(async () => {
        try {
          await db.collection("salons").updateOne(
            { _id: new ObjectId(salonId) },
            {
              $set: {
                isActive: true,
                isPaused: false,
                openedAt: new Date(),
              },
            }
          );
          console.log(
            `🔓 Salon auto-opened at ${new Date().toLocaleTimeString()}`
          );
        } catch (error) {
          console.error("Auto-open error:", error);
        }
      }, timeUntilOpen);
    }

    res.status(200).json({
      success: true,
      message: `Opening time set to ${openingTime}`,
      openingTime,
      willOpenAt: openingDate.toISOString(),
    });
  } catch (error) {
    console.error("Set opening time error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
