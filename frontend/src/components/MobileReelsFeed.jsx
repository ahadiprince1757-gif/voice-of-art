import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HeartIcon, ChatIcon, ShareIcon, TicketIcon,
  CloseIcon, SparklesIcon, MapPinIcon, ClockIcon, PlayIcon,
  VolumeIcon, VolumeMuteIcon
} from "./Icons";
import api from "../api";

// ─── Individual Reel Card ─────────────────────────────────────────────────────
function ReelCard({ video, isActive, onOpenBooking, onToast, onComment }) {
  const videoRef = useRef(null);
  const [playing, setPlaying]     = useState(false);
  const [muted, setMuted]         = useState(true);
  const [liked, setLiked]         = useState(false);
  const [likeAnim, setLikeAnim]   = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [progress, setProgress]   = useState(0);
  const lastTap = useRef(0);

  const videoUrl = video?.filename ? `/uploads/${video.filename}` : null;

  // Play / pause in sync with visibility
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;
    if (isActive) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive, videoUrl]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else          { el.play().catch(() => {}); setPlaying(true); }
  };

  // Double-tap detection
  const handleTap = (e) => {
    const now = Date.now();
    const delta = now - lastTap.current;
    lastTap.current = now;
    if (delta < 300) {
      // double tap — like
      if (!liked) { setLiked(true); onToast?.("Liked!"); }
      setShowHeart(true);
      setLikeAnim(true);
      setTimeout(() => { setShowHeart(false); setLikeAnim(false); }, 900);
    } else {
      // single tap — play/pause (with small delay to avoid conflict)
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 280) togglePlay();
      }, 280);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    const newVal = !liked;
    setLiked(newVal);
    if (newVal) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 600);
      onToast?.("Added to liked!");
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, text: `Watch "${video.title}" on Voice of Art`, url: window.location.href });
        return;
      } catch {}
    }
    navigator.clipboard?.writeText(window.location.href);
    onToast?.("Link copied!");
  };

  if (!video) return null;

  return (
    <div className="reel-card" onClick={handleTap}>
      {/* Video */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="reel-video"
          playsInline
          muted={muted}
          loop
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
        />
      ) : (
        <div className="reel-video reel-placeholder"><TicketIcon size={40} /></div>
      )}

      {/* Double-tap heart flash */}
      {showHeart && (
        <div className={`reel-heart-flash${likeAnim ? " pop" : ""}`}><HeartIcon size={72} filled={true} /></div>
      )}

      {/* Paused overlay */}
      {!playing && isActive && (
        <div className="reel-paused-orb" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          <PlayIcon size={40} fill="#fff" />
        </div>
      )}

      {/* Progress bar */}
      <div className="reel-progress-track">
        <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Bottom meta */}
      <div className="reel-bottom-meta">
        <div className="reel-badge-row">
          {video.category && <span className="reel-category-badge">{video.category}</span>}
          {video.showTitle && video.eventDate && (
            <span className="reel-live-badge">
              <SparklesIcon size={11} /> LIVE ON STAGE
            </span>
          )}
        </div>
        <h3 className="reel-title">{video.title}</h3>
        {video.description && (
          <p className="reel-description">{video.description}</p>
        )}
        <div className="reel-venue-row">
          {video.venue && (
            <span className="reel-venue"><MapPinIcon size={13} /> {video.venue}</span>
          )}
          {video.eventDate && (
            <span className="reel-date"><ClockIcon size={13} /> {video.eventDate}</span>
          )}
          {video.price && <span className="reel-price">{video.price}</span>}
        </div>
        {video.showTitle && video.eventDate && (
          <button
            className="reel-book-cta"
            onClick={(e) => { e.stopPropagation(); onOpenBooking?.(video.showTitle, video.eventDate); }}
          >
            <TicketIcon size={16} />
            <span>Book Tickets — Instant M-Pesa</span>
          </button>
        )}
      </div>

      {/* Right action rail */}
      <div className="reel-action-rail" onClick={(e) => e.stopPropagation()}>
        <button
          className="reel-action-btn"
          onClick={() => { setMuted((m) => !m); onToast?.(muted ? "Sound on" : "Muted"); }}
          aria-label="Sound toggle"
        >
          <span className="reel-action-icon">{muted ? <VolumeMuteIcon size={20} /> : <VolumeIcon size={20} />}</span>
          <span className="reel-action-label">{muted ? "Unmute" : "Sound"}</span>
        </button>

        <button
          className={`reel-action-btn${liked ? " reel-liked" : ""}`}
          onClick={handleLike}
          aria-label="Like"
        >
          <span className={`reel-action-icon${likeAnim ? " reel-like-pop" : ""}`}>
            <HeartIcon size={28} filled={liked} />
          </span>
          <span className="reel-action-label">{liked ? "Liked" : "Like"}</span>
        </button>

        <button
          className="reel-action-btn"
          onClick={() => onComment?.()}
          aria-label="Comment"
        >
          <span className="reel-action-icon"><ChatIcon size={26} /></span>
          <span className="reel-action-label">Comment</span>
        </button>

        <button className="reel-action-btn" onClick={handleShare} aria-label="Share">
          <span className="reel-action-icon"><ShareIcon size={25} /></span>
          <span className="reel-action-label">Share</span>
        </button>

        {video.showTitle && video.eventDate && (
          <button
            className="reel-action-btn reel-ticket-btn"
            onClick={(e) => { e.stopPropagation(); onOpenBooking?.(video.showTitle, video.eventDate); }}
            aria-label="Book Tickets"
          >
            <span className="reel-action-icon"><TicketIcon size={24} /></span>
            <span className="reel-action-label">Tickets</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main MobileReelsFeed Overlay ────────────────────────────────────────────
export default function MobileReelsFeed({ onClose, onOpenBooking, onToast }) {
  const [videos, setVideos]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment]     = useState("");
  const [commentsMap, setCommentsMap]   = useState({});

  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const isDragging  = useRef(false);

  useEffect(() => {
    api.getMedia({ type: "video" })
      .then((data) => { setVideos(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp")   goPrev();
      if (e.key === "Escape")    onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, videos.length - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };
  const onTouchMove = (e) => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    if (dy > dx + 8) isDragging.current = true;
  };
  const onTouchEnd = (e) => {
    if (!isDragging.current) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 60) return;
    if (dy > 0) goNext();
    else        goPrev();
    isDragging.current = false;
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !videos[currentIndex]) return;
    const vid = videos[currentIndex];
    const updated = [
      { user: "You", text: newComment.trim(), time: "Just now" },
      ...(commentsMap[vid.id] || []),
    ];
    setCommentsMap((prev) => ({ ...prev, [vid.id]: updated }));
    setNewComment("");
    onToast?.("Comment posted!");
  };

  const currentVideo    = videos[currentIndex];
  const currentComments = (currentVideo && commentsMap[currentVideo.id]) || [];

  return (
    <div className="reels-overlay" role="dialog" aria-modal="true" aria-label="Stage Reels">
      {/* Top bar */}
      <div className="reels-topbar">
        <div className="reels-topbar-left">
          <span className="reels-live-dot" />
          <span className="reels-topbar-title">STAGE REELS</span>
        </div>
        {videos.length > 0 && (
          <span className="reels-topbar-counter">{currentIndex + 1} / {videos.length}</span>
        )}
        <button className="reels-close-btn" onClick={onClose} aria-label="Close reels">
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Reel stack */}
      <div
        className="reels-stack"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading && (
          <div className="reels-loading">
            <div className="reels-spinner" />
            <p>Loading stage reels…</p>
          </div>
        )}
        {!loading && videos.length === 0 && (
          <div className="reels-empty">
            <div className="reels-empty-icon"><TicketIcon size={36} /></div>
            <h3>No reels yet</h3>
            <p>Upload a performance video in the admin panel.</p>
          </div>
        )}
        {!loading && videos.map((video, index) => {
          const offset  = index - currentIndex;
          const visible = Math.abs(offset) <= 1;
          return (
            <div
              key={video.id}
              className="reel-slide"
              style={{
                transform:    `translateY(${offset * 100}%)`,
                opacity:      Math.abs(offset) > 1 ? 0 : 1,
                zIndex:       offset === 0 ? 2 : 1,
                pointerEvents: offset === 0 ? "auto" : "none",
                transition:   "transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease",
              }}
            >
              <ReelCard
                video={video}
                isActive={index === currentIndex && visible}
                onOpenBooking={onOpenBooking}
                onToast={onToast}
                onComment={() => setCommentsOpen(true)}
              />
            </div>
          );
        })}
      </div>

      {/* Swipe hint (shown only when > 1 video) */}
      {!loading && videos.length > 1 && currentIndex === 0 && (
        <div className="reels-swipe-hint">
          <span>↑ Swipe up for next</span>
        </div>
      )}

      {/* Side dot indicators */}
      {videos.length > 1 && videos.length <= 15 && (
        <div className="reels-dots">
          {videos.map((_, i) => (
            <button
              key={i}
              className={`reels-dot${i === currentIndex ? " active" : ""}`}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Reel ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Nav arrows (desktop / accessibility) */}
      <button
        className="reels-nav reels-nav-up"
        onClick={goPrev}
        disabled={currentIndex === 0}
        aria-label="Previous reel"
      >
        ↑
      </button>
      <button
        className="reels-nav reels-nav-down"
        onClick={goNext}
        disabled={currentIndex >= videos.length - 1}
        aria-label="Next reel"
      >
        ↓
      </button>

      {/* Comments bottom sheet */}
      {commentsOpen && (
        <div className="reels-comments-backdrop" onClick={() => setCommentsOpen(false)}>
          <div className="reels-comments-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="reels-comments-handle" />
            <div className="reels-comments-head">
              <h4>Audience Reactions ({currentComments.length})</h4>
              <button onClick={() => setCommentsOpen(false)} aria-label="Close">
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="reels-comments-list">
              {currentComments.length === 0 && (
                <p className="reels-comments-empty">Be the first to react to this performance!</p>
              )}
              {currentComments.map((c, i) => (
                <div key={i} className="reels-comment-bubble">
                  <div className="reels-comment-avatar">{c.user.charAt(0)}</div>
                  <div className="reels-comment-body">
                    <div className="reels-comment-user-row">
                      <span className="reels-comment-user">{c.user}</span>
                      <span className="reels-comment-time">{c.time}</span>
                    </div>
                    <p className="reels-comment-text">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="reels-comment-form">
              <input
                type="text"
                placeholder="Share your reaction…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={200}
                autoFocus
              />
              <button type="submit" className="reels-comment-send">Post</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
