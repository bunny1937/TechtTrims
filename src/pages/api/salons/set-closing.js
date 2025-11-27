import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId, closingTime } = req.body;

    if (!salonId || !closingTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

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

    // ✅ FORCE OPEN SALON when setting new closing time
    await db.collection("salons").updateOne(
      { _id: new ObjectId(salonId) },
      {
        $set: {
          [`operatingHours.${today}.close`]: closingTime,
          closingTime,
          isActive: true, // ✅ Force open!
        },
      }
    );

    const [hours, minutes] = closingTime.split(":");
    const closingDate = new Date();
    closingDate.setHours(parseInt(hours), parseInt(minutes), 20, 0);

    console.log(`✅ Closing time set to ${closingTime} - Salon is now OPEN`);

    res.status(200).json({
      success: true,
      message: `Salon will close at ${closingTime}:20`,
      closingTime,
      willCloseAt: closingDate.toISOString(),
    });
  } catch (error) {
    console.error("Set closing time error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
