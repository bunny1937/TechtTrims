import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { salonId, code } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // If code is passed → return single dummy for confirmation page
    if (code) {
      const dummy = await db
        .collection("dummyusers")
        .findOne({ bookingCode: code.toUpperCase() });
      if (!dummy) return res.status(404).json({ message: "Not found" });
      return res.status(200).json({ dummy });
    }

    // Else return all active dummies for salonId
    if (!salonId)
      return res.status(400).json({ message: "salonId or code required" });

    let salonObjId;
    try {
      salonObjId = new ObjectId(salonId);
    } catch {
      salonObjId = salonId;
    }

    const dummies = await db
      .collection("dummyusers")
      .find({
        salonId: salonObjId,
        status: { $nin: ["completed", "cancelled"] },
      })
      .sort({ arrivedAt: 1 })
      .toArray();

    return res.status(200).json({ dummies });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
