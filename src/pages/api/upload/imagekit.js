// src/pages/api/upload/imagekit.js
import ImageKit from "imagekit";

// Optional safety check
if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY) {
  console.error("❌ Missing ImageKit environment variables!");
  console.log({
    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY
      ? "✅ Loaded"
      : "❌ Missing",
    ENDPOINT: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  });
}

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
});

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const authParams = imagekit.getAuthenticationParameters();
      return res.status(200).json(authParams);
    } catch (error) {
      console.error("❌ ImageKit Auth Error:", error);
      return res.status(500).json({
        error:
          error.message ||
          "Server Error while generating ImageKit authentication params",
      });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
