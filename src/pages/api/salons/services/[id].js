// pages/api/salons/services/[id].js
import { connectToDatabase } from "../../../../lib/mongodb";
import Service from "../../../../models/Service";

export default async function handler(req, res) {
  await connectToDatabase();
  const { method } = req;
  const { id } = req.query;

  try {
    if (method === "GET") {
      const s = await Service.findById(id);
      if (!s) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(s);
    }
    if (method === "PUT") {
      const update = req.body;
      const s = await Service.findByIdAndUpdate(id, update, { new: true });
      return res.status(200).json(s);
    }
    if (method === "DELETE") {
      await Service.findByIdAndDelete(id);
      return res.status(204).end();
    }
    return res.setHeader("Allow", ["GET", "PUT", "DELETE"]).status(405).end();
  } catch (err) {
    console.error("api/services/[id] error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
