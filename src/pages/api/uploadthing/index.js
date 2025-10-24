//pages/api/uploadthing/index.js
import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

export const fileRouter = {
  profilePic: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } }),
  galleryImages: f({ image: { maxFileSize: "5MB", maxFileCount: 10 } }),
  serviceImages: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } }),
};

const handler = createUploadthing({
  router: fileRouter,
});

// Named function export to satisfy ESLint and Next.js requirements
export default async function uploadThingHandler(req, res) {
  if (req.method === "POST") {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("UploadThing handler error", error);
      res.status(500).json({ error: "Upload failed" });
    }
  } else if (req.method === "GET") {
    // Respond with OK on GET (optional, to prevent 405 errors)
    res.status(200).json({ message: "UploadThing API endpoint" });
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
