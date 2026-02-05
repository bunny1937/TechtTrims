import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageId } = req.query;

    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db.collection("admin_images").deleteOne({
      _id: new ObjectId(imageId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return res.status(500).json({ error: "Delete failed" });
  }
}
