import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { dummyId } = req.body;
    if (!dummyId) return res.status(400).json({ message: "dummyId required" });

    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db
      .collection("dummyusers")
      .findOneAndUpdate(
        { _id: new ObjectId(dummyId) },
        { $set: { status: "completed", completedAt: new Date() } },
        { returnDocument: "after" },
      );

    const updated = result?.value ?? result;
    if (!updated)
      return res.status(404).json({ message: "Dummy user not found" });

    return res.status(200).json({ success: true, dummy: updated });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
