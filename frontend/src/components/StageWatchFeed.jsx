import React, { useState, useEffect } from "react";
import {
  PlayIcon, TicketIcon, HeartIcon, ChatIcon, ShareIcon,
  VolumeIcon, VolumeMuteIcon, SparklesIcon, ClockIcon,
  MapPinIcon, FlameIcon, FilmIcon, CloseIcon,
} from "./Icons";
import api from "../api";

function matchesCategory(item, catId) {
  if (catId === "all") return true;
  const cat = (item.category || "").toLowerCase();
  const venue = (item.venue || "").toLowerCase();
  if (catId === "live")   return cat.includes("live") || cat.includes("production");
  if (catId === "drama")  return cat.includes("drama") || cat.includes("thriller") || cat.includes("suspense");
  if (catId === "poetry") return cat.includes("poetry") || cat.includes("spoken") || cat.includes("rhythm");
  if (catId === "tour")   return cat.includes("school") || cat.includes("tour") || venue.includes("school");
  return true;
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyFeed({ onOpenAdmin }) {
  return (
    <div className="stage-feed-empty">
      <div className="stage-empty-icon">🎭</div>
      <h2 className="stage-empty-title font-serif">Your stage is empty.</h2>
      <p className="stage-empty-sub">
        Upload your first performance video from the Admin panel and it will appear here instantly.
      </p>
      {onOpenAdmin && (
        <button className="stage-empty-cta" onClick={onOpenAdmin}>
          <FilmIcon size={18} />
          <span>Upload a Video Now →</span>
        </button>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="stage-feed-layout">
      <div className="theatre-stage-card">
        <div className="stage-screen-box editorial-skeleton-block" style={{ minHeight: 420 }} />
      </div>
      <aside className="stage-sidebar-feed">
        {[1, 2, 3].map((n) => (
          <div key={n} className="feed-show-item" style={{ opacity: 0.5 }}>
            <div className="feed-thumbnail-box editorial-skeleton-block" />
            <div className="feed-item-content">
              <div className="editorial-skeleton-line" style={{ width: "80%", marginBottom: 8 }} />
              <div className="editorial-skeleton-line" style={{ width: "55%" }} />
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function StageWatchFeed({ onOpenBooking, onToast, onOpenAdmin }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [userCommentsMap, setUserCommentsMap] = useState({});
  const [likedMap, setLikedMap] = useState({});
  const [feedMode, setFeedMode] = useState("cinema");

  // Fetch videos from API
  useEffect(() => {
    api
      .getMedia({ type: "video" })
      .then((data) => {
        setVideos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="container" style={{ padding: "60px 0" }}><FeedSkeleton /></div>;
  if (error)   return (
    <div className="container shows-status-msg shows-status-msg--error" style={{ padding: "60px 0" }}>
      ⚠️ {error}
    </div>
  );
  if (videos.length === 0) return (
    <div className="container" style={{ padding: "60px 0" }}>
      <EmptyFeed onOpenAdmin={onOpenAdmin} />
    </div>
  );

  const activeVideo = videos[activeVideoIndex] || videos[0];
  const videoUrl = `/uploads/${activeVideo.filename}`;

  const filtered = videos.filter((v) => matchesCategory(v, activeCategory));

  const currentComments = userCommentsMap[activeVideo.id] || [];

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const updated = [{ user: "You", text: newComment.trim(), time: "Just now" }, ...currentComments];
    setUserCommentsMap((prev) => ({ ...prev, [activeVideo.id]: updated }));
    setNewComment("");
    onToast("💬 Comment posted!");
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    onToast("🔗 Link copied to clipboard!");
  };

  const handleToggleLike = (id) => {
    const isLiked = likedMap[id];
    setLikedMap((prev) => ({ ...prev, [id]: !isLiked }));
    if (!isLiked) onToast("❤️ Added to liked clips!");
  };

  return (
    <div className="stage-watch-experience">
      {/* Category pills */}
      <div className="stage-categories-bar">
        <div className="container stage-categories-container">
          <div className="category-pills">
            {[
              { id: "all",    label: "Trending Plays",       Icon: FlameIcon },
              { id: "live",   label: "Live Stage Highlights", Icon: SparklesIcon },
              { id: "drama",  label: "Drama & Thrillers" },
              { id: "poetry", label: "Poetry & Spoken Word" },
              { id: "tour",   label: "School Tours" },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`cat-pill ${activeCategory === id ? "active" : ""}`}
                onClick={() => setActiveCategory(id)}
              >
                {Icon && <Icon size={14} />}
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="feed-mode-toggle">
            <button
              className={`mode-btn ${feedMode === "cinema" ? "active" : ""}`}
              onClick={() => setFeedMode("cinema")}
              title="Cinema Layout"
            >
              <FilmIcon size={15} /><span>Cinema</span>
            </button>
            <button
              className={`mode-btn ${feedMode === "reels" ? "active" : ""}`}
              onClick={() => setFeedMode("reels")}
              title="Reels Layout"
            >
              <span>📱 Reels</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container stage-main-container">
        <div className={`stage-feed-layout ${feedMode === "reels" ? "reels-layout" : ""}`}>

          {/* ── Main player ────────────────────────────────────────── */}
          <div className="theatre-stage-card">
            <div className="stage-screen-box">
              {/* Real video element */}
              <video
                key={videoUrl}
                src={videoUrl}
                className="stage-real-video"
                controls={false}
                playsInline
                muted={isMuted}
                autoPlay={isPlaying}
                loop
                onClick={() => setIsPlaying((p) => !p)}
                ref={(el) => {
                  if (!el) return;
                  if (isPlaying) el.play().catch(() => {});
                  else el.pause();
                }}
              />

              {/* Overlay elements */}
              <div className="stage-haze-overlay" />

              {/* Status badges */}
              <div className="stage-top-overlay">
                <div className="live-stream-badge">
                  <span className="live-red-dot" />
                  <span>STAGE STREAM</span>
                </div>
              </div>

              {/* Center play/pause */}
              <div className="stage-center-click" onClick={() => setIsPlaying((p) => !p)}>
                {!isPlaying && (
                  <div className="center-play-orb">
                    <PlayIcon size={34} fill="#fff" />
                  </div>
                )}
              </div>

              {/* Action sidebar */}
              <div className="tiktok-action-rail">
                <button
                  className={`tiktok-action-btn ${likedMap[activeVideo.id] ? "liked" : ""}`}
                  onClick={() => handleToggleLike(activeVideo.id)}
                  title="Like"
                >
                  <HeartIcon size={24} filled={likedMap[activeVideo.id]} />
                  <span>{likedMap[activeVideo.id] ? "♥" : "♡"}</span>
                </button>

                <button
                  className="tiktok-action-btn"
                  onClick={() => setCommentsOpen(!commentsOpen)}
                  title="Comments"
                >
                  <ChatIcon size={22} />
                  <span>{currentComments.length}</span>
                </button>

                <button className="tiktok-action-btn" onClick={handleShare} title="Share">
                  <ShareIcon size={22} />
                  <span>Share</span>
                </button>

                {onOpenBooking && activeVideo.eventDate && (
                  <button
                    className="tiktok-action-btn booking-pulse-btn"
                    onClick={() => onOpenBooking(activeVideo.showTitle || activeVideo.title, activeVideo.eventDate)}
                    title="Book tickets"
                  >
                    <TicketIcon size={22} />
                    <span>Tickets</span>
                  </button>
                )}
              </div>

              {/* Booking spot */}
              {activeVideo.showTitle && activeVideo.eventDate && (
                <div className="stage-booking-spot">
                  <div className="booking-spot-inner">
                    <div className="booking-spot-details">
                      <div className="spot-urgency-badge">
                        <SparklesIcon size={13} />
                        <span>CATCH THIS LIVE ON STAGE</span>
                      </div>
                      <h2 className="spot-show-title font-serif">{activeVideo.showTitle}</h2>
                      <div className="spot-meta-row">
                        {activeVideo.venue && (
                          <span className="spot-meta"><MapPinIcon size={14} /> {activeVideo.venue}</span>
                        )}
                        <span className="spot-dot">•</span>
                        <span className="spot-meta"><ClockIcon size={14} /> {activeVideo.eventDate}</span>
                        {activeVideo.price && (
                          <><span className="spot-dot">•</span><span className="spot-price">{activeVideo.price}</span></>
                        )}
                      </div>
                    </div>
                    <div className="booking-spot-cta">
                      <button
                        className="btn-super-cta"
                        onClick={() => onOpenBooking(activeVideo.showTitle, activeVideo.eventDate)}
                      >
                        <TicketIcon size={20} />
                        <div className="cta-text-group">
                          <span className="cta-action-head">BOOK TICKETS NOW</span>
                          <span className="cta-action-sub">Instant M-Pesa Reservation →</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls bar */}
              <div className="stage-controls-overlay">
                <div className="stage-bottom-bar">
                  <div className="stage-play-info">
                    <button className="control-icon-btn" onClick={() => setIsPlaying((p) => !p)}>
                      {isPlaying ? "❚❚" : "▶"}
                    </button>
                    <button
                      className="control-icon-btn"
                      onClick={() => {
                        setIsMuted((m) => !m);
                        onToast(isMuted ? "🔊 Audio on" : "🔇 Muted");
                      }}
                    >
                      {isMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
                    </button>
                    <span className="control-time">
                      {activeVideo.duration || "—"} · Stage Audio
                    </span>
                  </div>
                  <div className="stage-clip-headline">
                    <span>{activeVideo.title}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info bar below player */}
            <div className="theatre-stage-info">
              <div>
                <h3 className="stage-info-title font-serif">{activeVideo.title}</h3>
                {activeVideo.description && (
                  <p className="stage-info-synopsis">{activeVideo.description}</p>
                )}
              </div>
              {activeVideo.showTitle && activeVideo.eventDate && (
                <button
                  className="btn-quick-reserve"
                  onClick={() => onOpenBooking(activeVideo.showTitle, activeVideo.eventDate)}
                >
                  <TicketIcon size={16} />
                  <span>Reserve Seats for {activeVideo.eventDate}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Sidebar playlist ───────────────────────────────────── */}
          <aside className="stage-sidebar-feed">
            <div className="feed-header">
              <h3 className="feed-title">
                <FilmIcon size={17} /><span>Up Next on Stage</span>
              </h3>
              <span className="feed-count">{filtered.length} videos</span>
            </div>

            <div className="feed-cards-list">
              {filtered.length === 0 && (
                <p style={{ color: "var(--text-dim)", padding: "20px", fontSize: "0.88rem" }}>
                  No videos in this category yet.
                </p>
              )}
              {filtered.map((video) => {
                const isActive = video.id === activeVideo.id;
                return (
                  <div
                    key={video.id}
                    className={`feed-show-item ${isActive ? "active-item" : ""}`}
                    onClick={() => {
                      setActiveVideoIndex(videos.findIndex((v) => v.id === video.id));
                      setIsPlaying(true);
                      window.scrollTo({ top: 120, behavior: "smooth" });
                    }}
                  >
                    <div className="feed-thumbnail-box" style={{ background: "var(--ink-card)", position: "relative", overflow: "hidden" }}>
                      <video
                        src={`/uploads/${video.filename}`}
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        muted
                        playsInline
                      />
                      <PlayIcon size={20} fill="#fff" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                      {isActive && <span className="now-playing-pill">NOW PLAYING</span>}
                    </div>

                    <div className="feed-item-content">
                      <span className="feed-item-category">{video.category}</span>
                      <h4 className="feed-item-title">{video.title}</h4>
                      {video.venue && (
                        <p className="feed-item-venue"><MapPinIcon size={13} /> {video.venue}</p>
                      )}
                      <div className="feed-item-cta-row">
                        <span className="feed-price">{video.price || ""}</span>
                        {video.showTitle && video.eventDate && (
                          <button
                            className="feed-book-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBooking(video.showTitle, video.eventDate);
                            }}
                          >
                            Book →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      {/* Comments drawer */}
      {commentsOpen && (
        <div className="comments-drawer-backdrop" onClick={() => setCommentsOpen(false)}>
          <div className="comments-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="comments-drawer-head">
              <h4>💬 Audience Reactions ({currentComments.length})</h4>
              <button className="close-drawer-btn" onClick={() => setCommentsOpen(false)}>
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="comments-scroll-list">
              {currentComments.length === 0 && (
                <p style={{ padding: "24px", color: "var(--text-dim)", textAlign: "center" }}>
                  Be the first to react to this performance!
                </p>
              )}
              {currentComments.map((c, i) => (
                <div key={i} className="comment-bubble">
                  <div className="comment-avatar">{c.user.charAt(0)}</div>
                  <div className="comment-body">
                    <div className="comment-user-row">
                      <span className="comment-user-name">{c.user}</span>
                      <span className="comment-time">{c.time}</span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="comment-input-form">
              <input
                type="text"
                placeholder="Share your reaction…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={200}
              />
              <button type="submit" className="comment-send-btn">Post</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
