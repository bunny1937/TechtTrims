import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  const { bookingCode } = req.query;
  if (!bookingCode)
    return res.status(400).json({ message: "bookingCode required" });

  const client = await clientPromise;
  const db = client.db("techtrims");

  const dummy = await db
    .collection("dummyusers")
    .findOne({ bookingCode: bookingCode.trim().toUpperCase() });
  if (!dummy) return res.status(404).json({ message: "Not found" });

  return res.status(200).json({
    dummy: {
      ...dummy,
      _id: dummy._id.toString(),
      salonId: dummy.salonId?.toString(),
    },
  });
}
