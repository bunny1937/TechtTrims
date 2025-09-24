// pages/api/salons/index.js
import { connectToDatabase } from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const salons = await db.collection("salons").find({}).toArray();
    console.log("Salons fetched from DB:", salons); // debug
    res.status(200).json({ success: true, salons });
  } catch (error) {
    console.error("Error fetching salons:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
