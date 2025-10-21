// src/pages/api/salons/barbers/[id].js - CREATE THIS FILE
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid barber ID" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const barbersCollection = db.collection("barbers");

    if (req.method === "GET") {
      const barber = await barbersCollection.findOne({ _id: new ObjectId(id) });

      if (!barber) {
        return res.status(404).json({ error: "Barber not found" });
      }

      return res.status(200).json(barber);
    }

    if (req.method === "PUT") {
      const updateData = { ...req.body };
      delete updateData._id; // Don't update _id

      // Add updated timestamp
      updateData.updatedAt = new Date();

      const result = await barbersCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" }
      );

      if (!result.value) {
        return res.status(404).json({ error: "Barber not found" });
      }

      return res.status(200).json(result.value);
    }

    if (req.method === "DELETE") {
      const result = await barbersCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Barber not found" });
      }

      return res.status(204).end();
    }

    return res.setHeader("Allow", ["GET", "PUT", "DELETE"]).status(405).end();
  } catch (err) {
    console.error("Barber [id] API error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
}
