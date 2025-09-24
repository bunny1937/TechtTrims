// pages/api/salons/profile.js
import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const salon = await db.collection("salons").findOne({});
    res.status(200).json(salon);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load salon profile" });
  }
}
