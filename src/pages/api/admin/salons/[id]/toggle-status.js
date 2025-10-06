import clientPromise from "../../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../../lib/adminAuth";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const admin = verifyAdminToken(req);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.query;
    const { isActive } = req.body;

    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db
      .collection("salons")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive, updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Salon not found" });
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
