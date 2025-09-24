// pages/api/users/register.js
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  try {
    const body = req.body || {};
    const { name, mobile, email, gender, location } = body;
    if (!mobile || !name) return res.status(400).json({ message: "Missing name or mobile" });

    const { db } = await connectToDatabase();
    let existing = await db.collection("users").findOne({ mobile });
    if (existing) {
      return res.status(200).json({ message: "User exists", userId: existing._id });
    }

    const userDoc = {
      name,
      mobile,
      email: email || null,
      gender: gender || "other",
      location: location || null,
      bookingHistory: [],
      createdAt: new Date()
    };

    const r = await db.collection("users").insertOne(userDoc);
    return res.status(201).json({ userId: r.insertedId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}
