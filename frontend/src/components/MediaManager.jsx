import React, { useState, useEffect, useRef } from "react";
import api from "../api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORIES = [
  "Live Production",
  "Drama & Suspense",
  "Poetry & Spoken Word",
  "School Tour",
  "Documentary",
  "Behind the Scenes",
  "Workshop",
];

// ─────────────────────────────────────────────────────────────────────────────
// MediaCard — single item in the library grid
// ─────────────────────────────────────────────────────────────────────────────
function MediaCard({ item, token, onDelete, onToggle }) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const url = `/uploads/${item.filename}`;

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteMedia(item.id, token);
      onDelete(item.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async () => {
    setToggling(true);
    try {
      const updated = await api.updateMedia(item.id, { featured: !item.featured }, token);
      onToggle(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="mm-card">
      {/* Thumbnail */}
      <div className="mm-card-thumb">
        {item.mediaType === "video" ? (
          <video
            src={url}
            preload="metadata"
            className="mm-thumb-media"
            playsInline
          />
        ) : (
          <img src={url} alt={item.title} className="mm-thumb-media" />
        )}
        <div className="mm-type-badge">{item.mediaType === "video" ? "🎬" : "🖼️"}</div>
        {item.featured && <div className="mm-featured-badge">★ Featured</div>}
      </div>

      {/* Info */}
      <div className="mm-card-body">
        <p className="mm-card-title">{item.title}</p>
        {item.category && <p className="mm-card-meta">{item.category}</p>}
        {item.venue && <p className="mm-card-meta">📍 {item.venue}</p>}
        {item.eventDate && <p className="mm-card-meta">📅 {item.eventDate}</p>}
      </div>

      {/* Actions */}
      <div className="mm-card-actions">
        <button
          className={`mm-action-btn ${item.featured ? "mm-action-featured" : ""}`}
          onClick={handleToggleFeatured}
          disabled={toggling}
          title={item.featured ? "Remove from hero" : "Feature in hero"}
        >
          {toggling ? "…" : item.featured ? "★ Unfeature" : "☆ Feature"}
        </button>
        <button
          className="mm-action-btn mm-action-delete"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete this file permanently"
        >
          {deleting ? "…" : "🗑 Delete"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MediaManager
// ─────────────────────────────────────────────────────────────────────────────
export default function MediaManager({ token, onToast }) {
  const [view, setView] = useState("library"); // 'library' | 'upload'
  const [media, setMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Upload state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Metadata form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showTitle, setShowTitle] = useState("");
  const [category, setCategory] = useState("Live Production");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [price, setPrice] = useState("");
  const [featured, setFeatured] = useState(false);

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // ── Load library ────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "library") return;
    setLoadingMedia(true);
    api
      .getAdminMedia(token)
      .then((data) => setMedia(Array.isArray(data) ? data : []))
      .catch((err) => onToast(err.message, "error"))
      .finally(() => setLoadingMedia(false));
  }, [view, token]);

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  // ── File selection ──────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) {
      onToast("Please select a video or image file.", "error");
      e.target.value = "";
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      onToast("File is too large. Maximum size is 500 MB.", "error");
      e.target.value = "";
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // Pre-fill title from filename
    setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    setView("upload");
  };

  const resetForm = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setTitle("");
    setDescription("");
    setShowTitle("");
    setCategory("Live Production");
    setVenue("");
    setEventDate("");
    setPrice("");
    setFeatured(false);
    setUploadProgress(0);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim() || file.name);
    formData.append("description", description.trim());
    formData.append("showTitle", showTitle.trim());
    formData.append("category", category);
    formData.append("venue", venue.trim());
    formData.append("eventDate", eventDate);
    formData.append("price", price.trim());
    formData.append("featured", String(featured));

    try {
      const record = await api.uploadMedia(formData, token, setUploadProgress);
      onToast(`✅ "${record.title}" uploaded successfully!`);
      resetForm();
      setView("library");
    } catch (err) {
      onToast(err.message || "Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  // ── Library callbacks ───────────────────────────────────────────────────
  const handleDelete = (id) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    onToast("🗑 File deleted.");
  };

  const handleToggle = (updated) => {
    setMedia((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="mm-root">

      {/* Tab bar */}
      <div className="mm-tabs">
        <button
          className={`mm-tab ${view === "library" ? "active" : ""}`}
          onClick={() => { resetForm(); setView("library"); }}
        >
          📚 My Media ({media.length})
        </button>
        <button
          className={`mm-tab ${view === "upload" ? "active" : ""}`}
          onClick={() => setView("upload")}
        >
          ＋ Upload
        </button>
      </div>

      {/* ── Upload view ──────────────────────────────────────────────── */}
      {view === "upload" && (
        <div className="mm-upload-view">
          {/* File picker buttons — prominent on mobile */}
          {!file && (
            <div className="mm-pick-section">
              <p className="mm-pick-label">Choose how to add your video or image:</p>

              {/* Gallery picker */}
              <label className="mm-pick-btn mm-pick-gallery">
                <span className="mm-pick-icon">📁</span>
                <span className="mm-pick-text">
                  <strong>Choose from Gallery</strong>
                  <small>Pick any video or photo from your device</small>
                </span>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileSelect}
                  hidden
                />
              </label>

              {/* Camera capture — opens camera directly on mobile */}
              <label className="mm-pick-btn mm-pick-camera">
                <span className="mm-pick-icon">📷</span>
                <span className="mm-pick-text">
                  <strong>Record Video Now</strong>
                  <small>Open your phone camera to record</small>
                </span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="video/*"
                  capture="camcorder"
                  onChange={handleFileSelect}
                  hidden
                />
              </label>

              <p className="mm-pick-hint">MP4, WebM, MOV, JPG, PNG · Max 500 MB</p>
            </div>
          )}

          {/* Preview + metadata form */}
          {file && (
            <form className="mm-form" onSubmit={handleUpload}>
              {/* File preview */}
              <div className="mm-preview-box">
                {file.type.startsWith("video/") ? (
                  <video
                    src={preview}
                    controls
                    playsInline
                    className="mm-preview-media"
                  />
                ) : (
                  <img src={preview} alt="Preview" className="mm-preview-media" />
                )}
                <p className="mm-preview-name">
                  {file.name} · {formatBytes(file.size)}
                </p>
                <button
                  type="button"
                  className="mm-change-file-btn"
                  onClick={() => { resetForm(); }}
                >
                  ✕ Choose a different file
                </button>
              </div>

              {/* Metadata */}
              <div className="mm-form-grid">
                <div className="mm-field mm-field-full">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Last Letter – Opening Scene"
                    required
                    maxLength={120}
                  />
                </div>

                <div className="mm-field">
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="mm-field">
                  <label>Show / Production</label>
                  <input
                    type="text"
                    value={showTitle}
                    onChange={(e) => setShowTitle(e.target.value)}
                    placeholder="e.g. The Last Letter"
                    maxLength={80}
                  />
                </div>

                <div className="mm-field">
                  <label>Venue</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Nairobi National Theatre"
                    maxLength={80}
                  />
                </div>

                <div className="mm-field">
                  <label>Event Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>

                <div className="mm-field">
                  <label>Price / Tickets</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. From KSh 500"
                    maxLength={40}
                  />
                </div>

                <div className="mm-field mm-field-full">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A short description of this video or performance…"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="mm-field mm-field-full">
                  <label className="mm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                    />
                    <span>⭐ Feature this in the hero section</span>
                  </label>
                </div>
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="mm-progress-wrap">
                  <div className="mm-progress-track">
                    <div
                      className="mm-progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mm-progress-label">
                    {uploadProgress < 100
                      ? `Uploading… ${uploadProgress}%`
                      : "Processing…"}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="mm-upload-btn"
                disabled={uploading || !title.trim()}
              >
                {uploading ? `Uploading ${uploadProgress}%…` : "⬆ Upload to Voice of Art"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Library view ─────────────────────────────────────────────── */}
      {view === "library" && (
        <div className="mm-library-view">
          {loadingMedia && (
            <p className="mm-library-status">Loading your media…</p>
          )}

          {!loadingMedia && media.length === 0 && (
            <div className="mm-empty">
              <div className="mm-empty-icon">🎬</div>
              <h3>No media uploaded yet</h3>
              <p>Upload your first video or image to get started.</p>
              <button
                className="mm-upload-btn"
                onClick={() => setView("upload")}
              >
                Upload your first video →
              </button>
            </div>
          )}

          {!loadingMedia && media.length > 0 && (
            <div className="mm-grid">
              {media.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  token={token}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
