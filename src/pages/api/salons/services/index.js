// pages/api/salons/services/index.js
import { connectToDatabase } from "../../../../lib/mongodb";
import Service from "../../../../models/Service";

export default async function handler(req, res) {
  await connectToDatabase();
  const { method } = req;
  const salonId = req.query.salonId || req.body.salonId;
  if (!salonId) return res.status(400).json({ error: "salonId required" });

  try {
    if (method === "GET") {
      const items = await Service.find({ salonId }).sort({ title: 1 });
      return res.status(200).json(items);
    }
    if (method === "POST") {
      const payload = { ...req.body, salonId };
      const s = new Service(payload);
      await s.save();
      return res.status(201).json(s);
    }
    return res.setHeader("Allow", ["GET", "POST"]).status(405).end();
  } catch (err) {
    console.error("api/services error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
