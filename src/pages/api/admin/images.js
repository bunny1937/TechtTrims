import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Load all images
    try {
      const client = await clientPromise;
      const db = client.db("techtrims");

      const images = await db.collection("admin_images").find({}).toArray();

      // Group by category
      const grouped = {
        testimonials: [],
        footer: [],
        icons: [],
        general: [],
      };

      images.forEach((img) => {
        if (grouped[img.category]) {
          grouped[img.category].push({
            id: img._id.toString(),
            name: img.name,
            url: img.url,
            category: img.category,
          });
        }
      });

      return res.status(200).json({ images: grouped });
    } catch (error) {
      console.error("Load images error:", error);
      return res.status(500).json({ error: "Failed to load images" });
    }
  }

  if (req.method === "POST") {
    // Upload new images
    try {
      const { urls, category } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "URLs required" });
      }

      if (!["testimonials", "footer", "icons", "general"].includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const client = await clientPromise;
      const db = client.db("techtrims");

      const imageDocs = urls.map((url) => ({
        url,
        category,
        name: `${category}-${Date.now()}`,
        uploadedAt: new Date(),
        isWebP: url.endsWith(".webp"),
      }));

      const result = await db.collection("admin_images").insertMany(imageDocs);

      return res.status(201).json({
        success: true,
        count: result.insertedCount,
      });
    } catch (error) {
      console.error("Upload images error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
