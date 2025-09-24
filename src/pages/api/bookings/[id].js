// pages/api/bookings/[id].js
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: "Missing id" });
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });
  try {
    const { db } = await connectToDatabase();
    const b = await db
      .collection("bookings")
      .findOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id });
    if (!b) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ booking: b });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}
