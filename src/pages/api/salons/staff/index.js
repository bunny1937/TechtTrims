// pages/api/salons/staff/index.js
import { connectToDatabase } from "../../../../lib/mongodb";
import Staff from "../../../../models/Staff";

export default async function handler(req, res) {
  await connectToDatabase();
  const { method } = req;
  const salonId = req.query.salonId || req.body.salonId;

  if (!salonId) return res.status(400).json({ error: "salonId required" });

  try {
    if (method === "GET") {
      const items = await Staff.find({ salonId }).sort({ name: 1 });
      return res.status(200).json(items);
    }
    if (method === "POST") {
      const payload = { ...req.body, salonId };
      const st = new Staff(payload);
      await st.save();
      return res.status(201).json(st);
    }

    return res.setHeader("Allow", ["GET", "POST"]).status(405).end();
  } catch (err) {
    console.error("api/staff error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
