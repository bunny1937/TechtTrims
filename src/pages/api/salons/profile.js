// Lines 1-35 - COMPLETE REPLACEMENT
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId } = req.query;

    if (!salonId) {
      return res.status(400).json({ error: "Salon ID required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Convert to ObjectId if valid
    let query;
    if (ObjectId.isValid(salonId)) {
      query = { _id: new ObjectId(salonId) };
    } else {
      return res.status(400).json({ error: "Invalid salon ID format" });
    }

    const salon = await db.collection("salons").findOne(query);

    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    res.status(200).json(salon);
  } catch (e) {
    console.error("Profile API Error:", e);
    res.status(500).json({ error: "Failed to load salon profile" });
  }
}
