//pages/api/upload/direct.js
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    maxTotalFileSize: 100 * 1024 * 1024, // 100MB total
    maxFiles: 20,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Upload failed: " + err.message });
    }

    try {
      const file = files.file[0];
      const fileName = `${Date.now()}-${file.originalFilename}`;
      const newPath = path.join(uploadDir, fileName);

      fs.renameSync(file.filepath, newPath);

      const publicUrl = `/uploads/${fileName}`;

      return res.status(200).json({ url: publicUrl });
    } catch (error) {
      console.error("File processing error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
