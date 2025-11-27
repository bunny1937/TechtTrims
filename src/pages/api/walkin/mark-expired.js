import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const now = new Date();

    const result = await db.collection("bookings").updateMany(
      {
        queueStatus: "RED",
        expiresAt: { $lt: now },
        isExpired: false,
      },
      {
        $set: {
          isExpired: true,
          queueStatus: "EXPIRED",
        },
      }
    );

    return res.status(200).json({ expired: result.modifiedCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
