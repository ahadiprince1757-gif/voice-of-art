import React, { useState, useEffect } from "react";
import { PlayIcon, CloseIcon, TicketIcon, VolumeIcon, VolumeMuteIcon, ClockIcon } from "./Icons";

export default function EditorialVideoModal({ video, onClose, onOpenBooking }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.3));
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div
      className="editorial-modal-backdrop"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="editorial-theatre-player"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top Bar with title, download protection notice, and close */}
        <div className="editorial-player-top">
          <div className="player-title-block">
            <span className="player-badge">VOICE OF ART EXCLUSIVE STREAM</span>
            <h3 className="player-title font-serif">{video.title}</h3>
          </div>

          <div className="player-top-actions">
            {video.showTitle && (
              <button
                className="player-book-btn"
                onClick={() => {
                  onClose();
                  onOpenBooking(video.showTitle, video.eventDate);
                }}
              >
                <TicketIcon size={15} />
                <span>Book Live Tickets</span>
              </button>
            )}

            <button
              className="player-close-btn"
              onClick={onClose}
              aria-label="Close video player"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Video Canvas Box (with download protection) */}
        <div
          className="editorial-player-canvas"
          style={{ backgroundImage: `url(${video.thumb || "/hero-stage.jpg"})` }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Transparent protection layer to prevent right click / save video */}
          <div
            className="video-protection-overlay"
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => setIsPlaying(!isPlaying)}
          ></div>

          {/* Center Play/Pause button */}
          {!isPlaying && (
            <div
              className="player-center-play-orb"
              onClick={() => setIsPlaying(true)}
            >
              <PlayIcon size={36} fill="#080808" />
            </div>
          )}

          {/* Watermark to protect theatrical IP */}
          <div className="player-watermark">
            <span>VOICE OF ART PRODUCTIONS • PROTECTED STAGE STREAM</span>
          </div>
        </div>

        {/* Bottom Playback Bar */}
        <div className="editorial-player-controls">
          <div
            className="editorial-scrubber"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              setProgress(Math.max(0, Math.min(100, pct)));
            }}
          >
            <div
              className="editorial-scrubber-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="scrubber-knob"></div>
            </div>
          </div>

          <div className="editorial-controls-row">
            <div className="controls-left">
              <button
                className="control-btn"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>

              <button
                className="control-btn"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
              </button>

              <span className="player-time">
                <ClockIcon size={14} />
                <span>{video.duration || "2:15"}</span>
              </span>
            </div>

            <div className="controls-right">
              <span className="stream-quality-tag">1080p Stage HD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
