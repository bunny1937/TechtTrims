import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageId, category } = req.body;

    if (!imageId || !ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get the image
    const image = await db.collection("admin_images").findOne({
      _id: new ObjectId(imageId),
    });

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Check if already WebP
    if (image.url.endsWith(".webp")) {
      return res.status(200).json({
        success: true,
        message: "Already in WebP format",
      });
    }

    // Convert ImageKit URL to WebP using transformation
    let webpUrl = image.url;

    if (image.url.includes("imagekit.io")) {
      // ImageKit automatic WebP conversion
      // Add tr:f-webp transformation parameter
      if (image.url.includes("/tr:")) {
        // Already has transformations, append webp format
        webpUrl = image.url.replace("/tr:", "/tr:f-webp,");
      } else {
        // No transformations, add before filename
        const urlParts = image.url.split("/");
        const filename = urlParts.pop();
        webpUrl = urlParts.join("/") + "/tr:f-webp/" + filename;
      }
    } else if (image.url.includes("cloudinary.com")) {
      // Cloudinary WebP conversion
      webpUrl = image.url.replace("/upload/", "/upload/f_webp/");
    } else {
      // For other URLs or local files, just change extension
      webpUrl = image.url.replace(/\.(jpg|jpeg|png)$/i, ".webp");
    }

    // Update the image URL
    const result = await db.collection("admin_images").updateOne(
      { _id: new ObjectId(imageId) },
      {
        $set: {
          url: webpUrl,
          isWebP: true,
          originalUrl: image.url, // Keep original URL
          convertedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: "Failed to update image" });
    }

    return res.status(200).json({
      success: true,
      newUrl: webpUrl,
    });
  } catch (error) {
    console.error("Convert WebP error:", error);
    return res.status(500).json({ error: "Conversion failed" });
  }
}
