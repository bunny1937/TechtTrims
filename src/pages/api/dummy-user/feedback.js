import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).end();

  const { bookingCode, feedback } = req.body;
  if (!bookingCode || !feedback)
    return res
      .status(400)
      .json({ message: "bookingCode and feedback required" });

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db.collection("dummyusers").updateOne(
      { bookingCode: bookingCode.toString().toUpperCase() },
      {
        $set: {
          feedback: {
            ...feedback,
            submitted: true,
            submittedAt: new Date(),
          },
        },
      },
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Booking not found" });

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
