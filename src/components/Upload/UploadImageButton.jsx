import React, { useState } from "react";
import Image from "next/image";
import axios from "axios";

export default function UploadImageButton({
  onUploaded,
  label = "Upload Image",
  multiple = false,
  maxFiles = 1,
  showPreview = true,
  salonName = "", // 👈 Add salon name from Step 1
}) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");

  // sanitize folder name (remove unsafe characters)
  const sanitizeFolderName = (name) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-") || "default-salon";

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);

    if (!files.length) return;

    // Validate file types
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(
          `Invalid file type: ${file.type}. Only JPEG, PNG, and WebP allowed.`
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File too large: ${(file.size / 1024 / 1024).toFixed(
            1
          )}MB. Max 5MB allowed.`
        );
        return;
      }

      // Validate file extension matches MIME type
      const ext = file.name.split(".").pop().toLowerCase();
      const validExts = ["jpg", "jpeg", "png", "webp"];
      if (!validExts.includes(ext)) {
        setError("Invalid file extension");
        return;
      }
    }
    if (!files.length) return;

    if (multiple && files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError("");
    setUploading(true);

    try {
      const results = [];
      const folderName = sanitizeFolderName(salonName);

      for (const file of files) {
        // Get fresh authentication parameters for every upload
        const { data: auth } = await axios.get("/api/upload/imagekit");
        const { signature, expire, token } = auth;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", `${Date.now()}-${file.name}`);
        formData.append(
          "publicKey",
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
        );
        formData.append("signature", signature);
        formData.append("expire", expire);
        formData.append("token", token);

        // 👇 Create unique salon folder dynamically
        formData.append("folder", `/salons/${folderName}`);

        const uploadResponse = await axios.post(
          "https://upload.imagekit.io/api/v1/files/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        results.push({ url: uploadResponse.data.url });
      }

      setImages(results);
      if (multiple) onUploaded(results.map((r) => r.url));
      else onUploaded(results[0]?.url);
    } catch (err) {
      console.error("Upload Error:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
          "Upload failed. Please try again or check credentials."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ margin: "1rem 0" }}>
      <label
        style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #c38f0a 0%, #f5e6b8 100%)",
          color: "#000",
          fontWeight: 600,
          padding: "12px 24px",
          borderRadius: 8,
          cursor: uploading ? "not-allowed" : "pointer",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Uploading..." : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={uploading}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </label>

      {showPreview && images.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
        >
          {images.map((img, index) => (
            <Image
              key={index}
              src={img.url}
              alt="Uploaded"
              width={100}
              height={100}
              style={{ borderRadius: 8, objectFit: "cover" }}
            />
          ))}
        </div>
      )}
      {error && <p style={{ color: "red", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
