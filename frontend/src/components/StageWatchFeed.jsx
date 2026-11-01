import React, { useState, useEffect, useRef } from "react";
import {
  PlayIcon, TicketIcon, HeartIcon, ChatIcon, ShareIcon,
  VolumeIcon, VolumeMuteIcon, ClockIcon, MapPinIcon, CloseIcon
} from "./Icons";
import api from "../api";

export default function StageWatchFeed({ onOpenBooking, onToast }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [likedMap, setLikedMap] = useState({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [userCommentsMap, setUserCommentsMap] = useState({});

  const videoRef = useRef(null);

  useEffect(() => {
    api
      .getMedia({ type: "video" })
      .then((data) => {
        setVideos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Could not load stage videos");
        setLoading(false);
      });
  }, []);

  const activeVideo = videos[activeVideoIndex] || videos[0];
  const videoUrl = activeVideo?.filename ? `/uploads/${activeVideo.filename}` : "";
  const currentComments = (activeVideo && userCommentsMap[activeVideo.id]) || [];

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    onToast?.(next ? "Audio muted" : "Audio on");
  };

  const handleToggleLike = (id) => {
    const isLiked = likedMap[id];
    setLikedMap((prev) => ({ ...prev, [id]: !isLiked }));
    onToast?.(!isLiked ? "Saved to your list" : "Removed from your list");
  };

  const handleShare = async () => {
    if (!activeVideo) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeVideo.title,
          text: `Watch "${activeVideo.title}" on VOA`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    navigator.clipboard?.writeText(window.location.href);
    onToast?.("Link copied to clipboard");
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeVideo) return;
    const updated = [
      { user: "Audience Member", text: newComment.trim(), time: "Just now" },
      ...currentComments,
    ];
    setUserCommentsMap((prev) => ({ ...prev, [activeVideo.id]: updated }));
    setNewComment("");
    onToast?.("Comment posted");
  };

  if (loading) {
    return (
      <section className="stage-watch-clean-section">
        <div className="container">
          <div className="clean-video-skeleton" />
        </div>
      </section>
    );
  }

  if (error || !activeVideo) {
    return null;
  }

  return (
    <section className="stage-watch-clean-section" id="stage-watch-area">
      <div className="container">
        {/* Section Header */}
        <div className="stage-watch-header">
          <div className="stage-watch-eyebrow">STAGE STREAM</div>
          <h2 className="stage-watch-headline font-serif">Featured Performance</h2>
        </div>

        {/* Video Player Card */}
        <div className="clean-video-card">
          <div className="clean-video-viewport" onClick={togglePlay}>
            <video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl}
              className="clean-stage-video"
              playsInline
              muted={isMuted}
              loop
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Play/Pause Center Indicator */}
            {!isPlaying && (
              <div className="clean-play-overlay">
                <div className="clean-play-orb">
                  <PlayIcon size={32} fill="#ffffff" />
                </div>
              </div>
            )}

            {/* Top controls: Live badge & Mute toggle */}
            <div className="clean-video-top-bar" onClick={(e) => e.stopPropagation()}>
              <span className="clean-category-badge">{activeVideo.category || "Stage Clip"}</span>
              <button
                className="clean-mute-btn"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeMuteIcon size={16} /> : <VolumeIcon size={16} />}
              </button>
            </div>
          </div>

          {/* Details & Actions Below Video (Uncluttered) */}
          <div className="clean-video-details">
            <div className="clean-details-main">
              <h3 className="clean-video-title font-serif">{activeVideo.title}</h3>
              {activeVideo.description && (
                <p className="clean-video-synopsis">{activeVideo.description}</p>
              )}
              <div className="clean-video-meta">
                {activeVideo.venue && (
                  <span className="clean-meta-item">
                    <MapPinIcon size={13} />
                    <span>{activeVideo.venue}</span>
                  </span>
                )}
                {activeVideo.eventDate && (
                  <span className="clean-meta-item">
                    <ClockIcon size={13} />
                    <span>{activeVideo.eventDate}</span>
                  </span>
                )}
                {activeVideo.price && (
                  <span className="clean-price-tag">{activeVideo.price}</span>
                )}
              </div>
            </div>

            {/* Primary Ticket Button & Interactions */}
            <div className="clean-actions-row">
              {onOpenBooking && (
                <button
                  className="clean-book-btn"
                  onClick={() => onOpenBooking(activeVideo.showTitle || activeVideo.title, activeVideo.eventDate || "")}
                >
                  <TicketIcon size={16} />
                  <span>Book Tickets</span>
                </button>
              )}

              <div className="clean-social-actions">
                <button
                  className={`clean-action-icon-btn ${likedMap[activeVideo.id] ? "liked" : ""}`}
                  onClick={() => handleToggleLike(activeVideo.id)}
                  title="Like"
                  aria-label="Like"
                >
                  <HeartIcon size={18} filled={likedMap[activeVideo.id]} />
                </button>

                <button
                  className="clean-action-icon-btn"
                  onClick={() => setCommentsOpen(!commentsOpen)}
                  title="Audience Comments"
                  aria-label="Comments"
                >
                  <ChatIcon size={18} />
                  {currentComments.length > 0 && (
                    <span className="clean-comments-count">{currentComments.length}</span>
                  )}
                </button>

                <button
                  className="clean-action-icon-btn"
                  onClick={handleShare}
                  title="Share"
                  aria-label="Share"
                >
                  <ShareIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Up Next Stage Clips Selector (Clean 1-Tap Switch) */}
          {videos.length > 1 && (
            <div className="clean-playlist-rail">
              <span className="clean-playlist-label">OTHER STAGE CLIPS</span>
              <div className="clean-playlist-chips">
                {videos.map((vid, idx) => (
                  <button
                    key={vid.id}
                    className={`clean-playlist-chip ${idx === activeVideoIndex ? "active" : ""}`}
                    onClick={() => {
                      setActiveVideoIndex(idx);
                      setIsPlaying(true);
                      setTimeout(() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                        }
                      }, 100);
                    }}
                  >
                    <span className="chip-play-icon">
                      <PlayIcon size={10} fill="currentColor" />
                    </span>
                    <span className="chip-title">{vid.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slide-out Comments Drawer */}
          {commentsOpen && (
            <div className="clean-comments-section">
              <div className="clean-comments-header">
                <span className="comments-title">Audience Notes ({currentComments.length})</span>
                <button
                  className="comments-close-btn"
                  onClick={() => setCommentsOpen(false)}
                  aria-label="Close comments"
                >
                  <CloseIcon size={14} />
                </button>
              </div>

              <div className="clean-comments-list">
                {currentComments.length === 0 ? (
                  <p className="no-comments-msg">Be the first to share your impression of this production.</p>
                ) : (
                  currentComments.map((c, i) => (
                    <div key={i} className="clean-comment-item">
                      <span className="comment-user">{c.user}</span>
                      <span className="comment-time">{c.time}</span>
                      <p className="comment-text">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="clean-comment-form">
                <input
                  type="text"
                  placeholder="Leave a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="clean-comment-input"
                />
                <button type="submit" className="clean-comment-send" disabled={!newComment.trim()}>
                  Post
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
