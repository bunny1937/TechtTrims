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
      // ✅ Generate fresh auth params with expiration
      const authParams = imagekit.getAuthenticationParameters();

      console.log("ImageKit auth params generated:", {
        token: authParams.token.substring(0, 10) + "...",
        expire: authParams.expire,
        signature: authParams.signature.substring(0, 10) + "...",
      });

      return res.status(200).json(authParams);
    } catch (error) {
      console.error("ImageKit Auth Error:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate auth params",
        details: error.toString(),
      });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
