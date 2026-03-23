import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { dummyId, serviceTime } = req.body;
  if (!dummyId) return res.status(400).json({ message: "dummyId required" });
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const now = new Date();
    const mins = parseInt(serviceTime) || 30;
    const expectedFinishTime = new Date(now.getTime() + (mins + 5) * 60 * 1000);
    const existing = await db
      .collection("dummyusers")
      .findOne({ _id: new ObjectId(dummyId) });

    // addTime mode: keep original serviceStartedAt, just extend serviceTime
    const isAddTime = req.body.addTime === true && existing?.serviceStartedAt;
    const startedAt = isAddTime ? existing.serviceStartedAt : now;
    const newExpectedFinish = new Date(
      new Date(startedAt).getTime() + mins * 60 * 1000,
    );

    const result = await db.collection("dummyusers").findOneAndUpdate(
      { _id: new ObjectId(dummyId) },
      {
        $set: {
          status: "in-service",
          serviceStartedAt: startedAt, // preserve original start if addTime
          serviceTime: mins,
          expectedFinishTime: newExpectedFinish,
        },
      },
      { returnDocument: "after" },
    );
    const updated = result?.value ?? result;
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ success: true, dummy: updated });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
