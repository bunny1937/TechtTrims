import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/Admin/AdminImages.module.css";
import UploadImageButton from "../../components/Upload/UploadImageButton";
import { showSuccess, showError, showWarning } from "../../lib/toast";
import AdminLayout from "../../components/Admin/AdminLayout";

export default function AdminImagesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("testimonials");
  const [images, setImages] = useState({
    testimonials: [],
    footer: [],
    icons: [],
    general: [],
  });
  const [pendingUploads, setPendingUploads] = useState([]); // ✅ NEW: Converted files waiting to upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const res = await fetch("/api/admin/images");
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || images);
      }
    } catch (error) {
      console.error("Error loading images:", error);
    }
  };

  // ✅ STEP 1: Convert to WebP
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    showWarning(`Converting ${files.length} image(s) to WebP...`);

    const converted = [];

    for (const file of files) {
      try {
        const webpFile = await convertToWebP(file);
        const preview = URL.createObjectURL(webpFile);

        converted.push({
          id: Date.now() + Math.random(),
          file: webpFile,
          preview,
          name: webpFile.name,
          size: (webpFile.size / 1024).toFixed(2) + " KB",
        });
      } catch (error) {
        console.error("Conversion error:", error);
        showError(`Failed to convert ${file.name}`);
      }
    }

    setPendingUploads([...pendingUploads, ...converted]);
    showSuccess(`${converted.length} image(s) converted to WebP!`);

    // Reset input
    e.target.value = "";
  };

  // ✅ Convert image to WebP client-side
  const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Resize if too large
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Conversion failed"));
                return;
              }

              const webpFile = new File(
                [blob],
                file.name.replace(/\.(jpg|jpeg|png)$/i, ".webp"),
                { type: "image/webp" },
              );

              resolve(webpFile);
            },
            "image/webp",
            0.85, // Quality
          );
        };

        img.onerror = () => reject(new Error("Image load failed"));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  };

  // ✅ STEP 2: Upload to ImageKit
  const uploadToImageKit = async (file, category) => {
    try {
      // Get auth params
      const authRes = await fetch("/api/upload/imagekit");
      if (!authRes.ok) throw new Error("Auth failed");

      const authParams = await authRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("publicKey", process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY);
      formData.append("signature", authParams.signature);
      formData.append("expire", authParams.expire);
      formData.append("token", authParams.token);
      formData.append("folder", `admin/${category}`);
      formData.append("fileName", file.name);

      const uploadRes = await fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.message || "Upload failed");
      }

      const data = await uploadRes.json();
      return data.url;
    } catch (error) {
      console.error("ImageKit upload error:", error);
      throw error;
    }
  };

  // ✅ STEP 3: Upload all pending images
  const handleUploadAll = async () => {
    if (pendingUploads.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of pendingUploads) {
      try {
        const url = await uploadToImageKit(item.file, activeTab);
        uploadedUrls.push(url);
        successCount++;
      } catch (error) {
        console.error(`Upload failed for ${item.name}:`, error);
        failCount++;
      }
    }

    // Save to database
    if (uploadedUrls.length > 0) {
      try {
        const res = await fetch("/api/admin/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: uploadedUrls, category: activeTab }),
        });

        if (res.ok) {
          showSuccess(`${successCount} image(s) uploaded successfully!`);
          setPendingUploads([]);
          loadImages();
        }
      } catch (error) {
        showError("Database save failed");
      }
    }

    if (failCount > 0) {
      showError(`${failCount} upload(s) failed`);
    }

    setUploading(false);
  };

  // Remove pending upload
  const removePending = (id) => {
    setPendingUploads(pendingUploads.filter((item) => item.id !== id));
  };

  // Delete uploaded image
  const deleteImage = async (imageId, category) => {
    if (!confirm("Delete this image?")) return;

    try {
      const res = await fetch(`/api/admin/images/${imageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });

      if (res.ok) {
        showSuccess("Image deleted");
        loadImages();
      } else {
        showError("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showError("Delete failed");
    }
  };

  if (!mounted) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AdminLayout />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>🖼️ Image Management</h1>
          <p className={styles.subtitle}>
            Upload and manage all platform images
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "testimonials" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("testimonials")}
          >
            👥 Testimonials ({images.testimonials?.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "footer" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("footer")}
          >
            📄 Footer ({images.footer?.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "icons" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("icons")}
          >
            ✨ Icons & Logos ({images.icons?.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "general" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("general")}
          >
            🎨 General ({images.general?.length || 0})
          </button>
        </div>

        {/* Upload Section */}
        <div className={styles.uploadSection}>
          <h3 className={styles.sectionTitle}>
            Upload to {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h3>

          <div className={styles.uploadBox}>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              multiple
              onChange={handleFileSelect}
              id="fileInput"
              style={{ display: "none" }}
            />
            <label htmlFor="fileInput" className={styles.uploadLabel}>
              <span className={styles.uploadIcon}>📁</span>
              <span>Choose Images (JPG, PNG)</span>
            </label>
            <p className={styles.uploadHint}>
              Images will be automatically converted to WebP format
            </p>
          </div>
        </div>

        {/* Pending Uploads (Converted, ready to upload) */}
        {pendingUploads.length > 0 && (
          <div className={styles.pendingSection}>
            <div className={styles.pendingHeader}>
              <h3>✅ Converted to WebP ({pendingUploads.length})</h3>
              <button
                onClick={handleUploadAll}
                disabled={uploading}
                className={styles.uploadAllBtn}
              >
                {uploading
                  ? "⏳ Uploading..."
                  : `🚀 Upload All to ${activeTab}`}
              </button>
            </div>

            <div className={styles.pendingGrid}>
              {pendingUploads.map((item) => (
                <div key={item.id} className={styles.pendingCard}>
                  <div className={styles.pendingPreview}>
                    <img src={item.preview} alt={item.name} />
                    <span className={styles.webpBadge}>WebP</span>
                  </div>
                  <div className={styles.pendingInfo}>
                    <p className={styles.pendingName}>{item.name}</p>
                    <p className={styles.pendingSize}>{item.size}</p>
                  </div>
                  <button
                    onClick={() => removePending(item.id)}
                    className={styles.removePendingBtn}
                    title="Remove"
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Images Grid */}
        <div className={styles.uploadedSection}>
          <h3>📦 Uploaded Images</h3>
          <div className={styles.imagesGrid}>
            {images[activeTab]?.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <p>No images uploaded yet</p>
                <small>Upload your first image above</small>
              </div>
            )}

            {images[activeTab]?.map((image) => (
              <div key={image.id} className={styles.imageCard}>
                <div className={styles.imagePreview}>
                  <img
                    src={image.url}
                    alt={image.name || "Image"}
                    loading="lazy"
                  />
                  {image.url.includes("f-webp") ||
                    (image.url.endsWith(".webp") && (
                      <span className={styles.webpBadge}>WebP</span>
                    ))}
                </div>

                <div className={styles.imageInfo}>
                  <h4 className={styles.imageName}>
                    {image.name || "Untitled"}
                  </h4>
                  <p className={styles.imageUrl}>
                    {image.url.substring(0, 40)}...
                  </p>
                </div>

                <div className={styles.imageActions}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(image.url);
                      showSuccess("URL copied!");
                    }}
                    className={styles.actionBtn}
                    title="Copy URL"
                  >
                    📋
                  </button>

                  <button
                    onClick={() => deleteImage(image.id, activeTab)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
