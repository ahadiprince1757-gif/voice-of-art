import React, { useState, useEffect } from "react";
import { PlayIcon, XIcon, ClockIcon } from "./Icons";

export default function VideoPlayerModal({ video, onClose }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(15);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Simulate progress when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="theatre-screen-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="theatre-video-container">
          <div className="theatre-curtain-effect"></div>

          {/* Simulated Stage Visuals */}
          <div style={{ textAlign: "center", color: "#fff", zIndex: 2, padding: "20px" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: isPlaying ? "rgba(24, 90, 219, 0.4)" : "rgba(255, 255, 255, 0.1)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                cursor: "pointer",
              }}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <PlayIcon size={36} fill="#fff" />
            </div>

            <h3 className="font-serif" style={{ fontSize: "1.7rem", color: "#fff", marginBottom: "8px" }}>
              {video.title}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              {video.category} • Voice of Art Productions Digital Screening
            </p>

            <div style={{ marginTop: "14px", display: "inline-flex", gap: "10px", alignItems: "center", background: "rgba(0,0,0,0.5)", padding: "6px 14px", borderRadius: "99px", fontSize: "0.8rem", color: "#38bdf8" }}>
              <span>{isPlaying ? "▶ Streaming in HD 1080p" : "⏸ Paused"}</span>
            </div>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="theatre-controls-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.15)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
              }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>

            <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <ClockIcon size={14} />
              <span>{video.duration}</span>
            </span>

            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{ color: "#cbd5e1", fontSize: "0.85rem", padding: "4px 8px" }}
            >
              {isMuted ? "🔇 Muted" : "🔊 Sound On"}
            </button>
          </div>

          <div style={{ flex: 1, margin: "0 24px" }}>
            <div
              style={{
                height: "6px",
                background: "rgba(255, 255, 255, 0.15)",
                borderRadius: "3px",
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                setProgress(Math.round(pos * 100));
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #185adb, #60a5fa)",
                  borderRadius: "3px",
                  transition: "width 0.2s linear",
                }}
              />
            </div>
          </div>

          <button
            className="modal-close-btn"
            onClick={onClose}
            title="Close theater player"
            style={{ background: "rgba(255, 255, 255, 0.1)", color: "#fff" }}
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
