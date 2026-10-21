import React, { useState, useEffect, useRef } from "react";
import {
  PlayIcon,
  TicketIcon,
  HeartIcon,
  ChatIcon,
  ShareIcon,
  VolumeIcon,
  VolumeMuteIcon,
  SparklesIcon,
  ClockIcon,
  MapPinIcon,
  FlameIcon,
  FilmIcon,
  CloseIcon,
  CheckIcon,
} from "./Icons";

export const stageVideos = [
  {
    id: "last-letter",
    showTitle: "The Last Letter",
    clipTitle: "The Last Letter — Official Stage Trailer",
    category: "Live Production",
    duration: "2:15",
    views: "48.2K",
    likes: 3840,
    venue: "Nairobi National Theatre",
    eventDate: "2026-10-18",
    price: "From KSh 500",
    seatsLeft: 18,
    synopsis:
      "A moving Kenyan stage masterpiece about choices, friendship, and the heavy price of silence in modern Nairobi.",
    posterColor: "linear-gradient(135deg, #091a36 0%, #173868 100%)",
    stageBackdrop: "/hero-stage.jpg",
    comments: [
      { user: "Amina W.", text: "The opening monologue gave me absolute goosebumps! 🔥", time: "2h ago" },
      { user: "Kevin O.", text: "Saw this last season at KU. Definitely booking tickets again this Saturday!", time: "5h ago" },
      { user: "Faith M.", text: "Is there a group discount for high school drama clubs?", time: "1d ago" },
    ],
  },
  {
    id: "behind-mask",
    showTitle: "Behind the Mask",
    clipTitle: "Behind the Mask — The Confrontation Scene",
    category: "Drama & Suspense",
    duration: "3:42",
    views: "36.8K",
    likes: 2490,
    venue: "Kenyatta University Theatre",
    eventDate: "2026-11-02",
    price: "From KSh 400",
    seatsLeft: 34,
    synopsis:
      "When the curtain rises, every family member has something to hide. A razor-sharp psychological drama.",
    posterColor: "linear-gradient(135deg, #181d24 0%, #2e1d38 100%)",
    stageBackdrop: "/hero-stage.jpg",
    comments: [
      { user: "Brian K.", text: "The plot twist in Act 2 was insane! You have to see it live.", time: "1h ago" },
      { user: "Joy N.", text: "Voice of Art productions are on a completely different level this year.", time: "3h ago" },
    ],
  },
  {
    id: "voices-kenya",
    showTitle: "New Voices",
    clipTitle: "Spoken Word Spotlight: Young Nairobi Poets",
    category: "Poetry & Rhythm",
    duration: "1:48",
    views: "62.1K",
    likes: 5120,
    venue: "Kenya Cultural Tour",
    eventDate: "2026-11-20",
    price: "From KSh 350",
    seatsLeft: 42,
    synopsis:
      "Raw verse, theatrical lighting, and vibrant youth poetry that tells the unapologetic truth of Kenyan street life.",
    posterColor: "linear-gradient(135deg, #1e1309 0%, #45240c 100%)",
    stageBackdrop: "/hero-stage.jpg",
    comments: [
      { user: "Dennis M.", text: "Need the full script for this poem! Incredibly powerful words.", time: "4h ago" },
      { user: "Grace K.", text: "Bringing my students to the school performance for sure.", time: "1d ago" },
    ],
  },
  {
    id: "school-tour",
    showTitle: "School Tour: Set Book Drama",
    clipTitle: "Fathers of Nations — Live Stage Rehearsal Clip",
    category: "School Tour",
    duration: "4:05",
    views: "89.4K",
    likes: 7430,
    venue: "School Auditoriums Nationwide",
    eventDate: "2026-11-14",
    price: "School Package",
    seatsLeft: 12,
    synopsis:
      "Bringing national curriculum literature to life on stage for secondary school learners with live Q&A sessions.",
    posterColor: "linear-gradient(135deg, #09261a 0%, #154d36 100%)",
    stageBackdrop: "/hero-stage.jpg",
    comments: [
      { user: "Teacher Mwangi", text: "Booked Voice of Art for our school last term. The students loved every minute.", time: "2d ago" },
    ],
  },
];

export default function StageWatchFeed({ onOpenBooking, onToast }) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(25);
  const [likedMap, setLikedMap] = useState({});
  const [likesCountMap, setLikesCountMap] = useState(
    stageVideos.reduce((acc, v) => ({ ...acc, [v.id]: v.likes }), {})
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [userCommentsMap, setUserCommentsMap] = useState({});
  const [feedMode, setFeedMode] = useState("cinema"); // 'cinema' (YouTube) or 'reels' (TikTok)

  const activeVideo = stageVideos[activeVideoIndex];

  // Simulated playback progress
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.4));
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleToggleLike = (id) => {
    const isLiked = likedMap[id];
    setLikedMap((prev) => ({ ...prev, [id]: !isLiked }));
    setLikesCountMap((prev) => ({
      ...prev,
      [id]: isLiked ? prev[id] - 1 : prev[id] + 1,
    }));
    if (!isLiked) {
      onToast("❤️ Added to your liked stage clips!");
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    onToast("🔗 Stage video link copied to clipboard!");
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const currentList = userCommentsMap[activeVideo.id] || activeVideo.comments;
    const updated = [
      { user: "You", text: newComment.trim(), time: "Just now" },
      ...currentList,
    ];
    setUserCommentsMap((prev) => ({ ...prev, [activeVideo.id]: updated }));
    setNewComment("");
    onToast("💬 Comment posted to the stage audience feed!");
  };

  const currentComments = userCommentsMap[activeVideo.id] || activeVideo.comments;

  const filteredVideos =
    activeCategory === "all"
      ? stageVideos
      : stageVideos.filter(
          (v) =>
            v.category.toLowerCase().includes(activeCategory.toLowerCase()) ||
            (activeCategory === "tour" && v.venue.toLowerCase().includes("school"))
        );

  return (
    <div className="stage-watch-experience">
      {/* Category Pills Bar (like YouTube & TikTok) */}
      <div className="stage-categories-bar">
        <div className="container stage-categories-container">
          <div className="category-pills">
            <button
              className={`cat-pill ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              <FlameIcon size={14} />
              <span>Trending Plays</span>
            </button>
            <button
              className={`cat-pill ${activeCategory === "live" ? "active" : ""}`}
              onClick={() => setActiveCategory("live")}
            >
              <SparklesIcon size={14} />
              <span>Live Stage Highlights</span>
            </button>
            <button
              className={`cat-pill ${activeCategory === "drama" ? "active" : ""}`}
              onClick={() => setActiveCategory("drama")}
            >
              <span>Drama & Thrillers</span>
            </button>
            <button
              className={`cat-pill ${activeCategory === "poetry" ? "active" : ""}`}
              onClick={() => setActiveCategory("poetry")}
            >
              <span>Poetry & Spoken Word</span>
            </button>
            <button
              className={`cat-pill ${activeCategory === "tour" ? "active" : ""}`}
              onClick={() => setActiveCategory("tour")}
            >
              <span>School Tours</span>
            </button>
          </div>

          <div className="feed-mode-toggle">
            <button
              className={`mode-btn ${feedMode === "cinema" ? "active" : ""}`}
              onClick={() => setFeedMode("cinema")}
              title="YouTube / Cinema Stage Layout"
            >
              <FilmIcon size={15} />
              <span>Cinema</span>
            </button>
            <button
              className={`mode-btn ${feedMode === "reels" ? "active" : ""}`}
              onClick={() => setFeedMode("reels")}
              title="TikTok / Vertical Reels Layout"
            >
              <span>📱 Reels</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container stage-main-container">
        {/* Core Layout: Player + Live Booking Spot + Video Rail */}
        <div className={`stage-feed-layout ${feedMode === "reels" ? "reels-layout" : ""}`}>
          {/* Main Video Theatre Player */}
          <div className="theatre-stage-card">
            {/* The Stage Screen */}
            <div className="stage-screen-box">
              {/* Stage Visual Layer */}
              <div
                className="stage-visual-bg"
                style={{
                  backgroundImage: `url(${activeVideo.stageBackdrop})`,
                }}
              >
                <div className="stage-haze-overlay"></div>
                <div className="stage-spotlight-beam"></div>
              </div>

              {/* Status Tag Overlay */}
              <div className="stage-top-overlay">
                <div className="live-stream-badge">
                  <span className="live-red-dot"></span>
                  <span>STAGE STREAM</span>
                </div>
                <div className="views-counter">
                  <span>👁️ {activeVideo.views} views</span>
                </div>
              </div>

              {/* Center Play/Pause Trigger */}
              <div
                className="stage-center-click"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {!isPlaying && (
                  <div className="center-play-orb">
                    <PlayIcon size={34} fill="#fff" />
                  </div>
                )}
              </div>

              {/* TikTok Style Vertical Action Sidebar */}
              <div className="tiktok-action-rail">
                <button
                  className={`tiktok-action-btn ${likedMap[activeVideo.id] ? "liked" : ""}`}
                  onClick={() => handleToggleLike(activeVideo.id)}
                  title="Like stage performance"
                >
                  <HeartIcon size={24} filled={likedMap[activeVideo.id]} />
                  <span>{likesCountMap[activeVideo.id]}</span>
                </button>

                <button
                  className="tiktok-action-btn"
                  onClick={() => setCommentsOpen(!commentsOpen)}
                  title="Audience comments & reactions"
                >
                  <ChatIcon size={22} />
                  <span>{currentComments.length}</span>
                </button>

                <button
                  className="tiktok-action-btn"
                  onClick={handleShare}
                  title="Share stage video"
                >
                  <ShareIcon size={22} />
                  <span>Share</span>
                </button>

                <button
                  className="tiktok-action-btn booking-pulse-btn"
                  onClick={() => onOpenBooking(activeVideo.showTitle, activeVideo.eventDate)}
                  title="Direct ticket booking spot"
                >
                  <TicketIcon size={22} />
                  <span>Tickets</span>
                </button>
              </div>

              {/* ======================================================== */}
              {/* HIGH-CONVERSION BOOKING SPOT OVERLAY (THE FIRST OUTCOME) */}
              {/* ======================================================== */}
              <div className="stage-booking-spot">
                <div className="booking-spot-inner">
                  <div className="booking-spot-details">
                    <div className="spot-urgency-badge">
                      <SparklesIcon size={13} />
                      <span>CATCH THIS LIVE ON STAGE</span>
                      <span className="urgency-seats">⚡ {activeVideo.seatsLeft} seats left!</span>
                    </div>

                    <h2 className="spot-show-title font-serif">
                      {activeVideo.showTitle}
                    </h2>

                    <div className="spot-meta-row">
                      <span className="spot-meta">
                        <MapPinIcon size={14} />
                        {activeVideo.venue}
                      </span>
                      <span className="spot-dot">•</span>
                      <span className="spot-meta">
                        <ClockIcon size={14} />
                        {activeVideo.eventDate}
                      </span>
                      <span className="spot-dot">•</span>
                      <span className="spot-price">{activeVideo.price}</span>
                    </div>
                  </div>

                  {/* HIGH-IMPACT PRIMARY CALL TO ACTION BUTTON */}
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

              {/* Bottom Scrubber & Sound Control */}
              <div className="stage-controls-overlay">
                <div
                  className="stage-scrubber-track"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    setProgress(Math.round((clickX / rect.width) * 100));
                  }}
                >
                  <div className="stage-scrubber-fill" style={{ width: `${progress}%` }}>
                    <div className="scrubber-head"></div>
                  </div>
                </div>

                <div className="stage-bottom-bar">
                  <div className="stage-play-info">
                    <button
                      className="control-icon-btn"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? "❚❚" : "▶"}
                    </button>

                    <button
                      className="control-icon-btn"
                      onClick={() => {
                        setIsMuted(!isMuted);
                        onToast(isMuted ? "🔊 Audio active" : "🔇 Audio muted");
                      }}
                    >
                      {isMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
                    </button>

                    <span className="control-time">
                      {activeVideo.duration} • Stage Audio HD
                    </span>
                  </div>

                  <div className="stage-clip-headline">
                    <span>{activeVideo.clipTitle}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Synopsis / Show Context Bar */}
            <div className="theatre-stage-info">
              <div>
                <h3 className="stage-info-title font-serif">{activeVideo.clipTitle}</h3>
                <p className="stage-info-synopsis">{activeVideo.synopsis}</p>
              </div>

              <button
                className="btn-quick-reserve"
                onClick={() => onOpenBooking(activeVideo.showTitle, activeVideo.eventDate)}
              >
                <TicketIcon size={16} />
                <span>Reserve Seats for {activeVideo.eventDate}</span>
              </button>
            </div>
          </div>

          {/* Up Next / Theatre Playlist Feed (YouTube / TikTok Style) */}
          <aside className="stage-sidebar-feed">
            <div className="feed-header">
              <h3 className="feed-title">
                <FilmIcon size={17} />
                <span>Up Next on Stage</span>
              </h3>
              <span className="feed-count">{filteredVideos.length} productions</span>
            </div>

            <div className="feed-cards-list">
              {filteredVideos.map((video, idx) => {
                const isActive = video.id === activeVideo.id;
                return (
                  <div
                    key={video.id}
                    className={`feed-show-item ${isActive ? "active-item" : ""}`}
                    onClick={() => {
                      setActiveVideoIndex(stageVideos.findIndex((v) => v.id === video.id));
                      setIsPlaying(true);
                      window.scrollTo({ top: 120, behavior: "smooth" });
                    }}
                  >
                    <div
                      className="feed-thumbnail-box"
                      style={{ background: video.posterColor }}
                    >
                      <PlayIcon size={20} fill="#fff" />
                      <span className="feed-thumb-duration">{video.duration}</span>
                      {isActive && <span className="now-playing-pill">NOW PLAYING</span>}
                    </div>

                    <div className="feed-item-content">
                      <span className="feed-item-category">{video.category}</span>
                      <h4 className="feed-item-title">{video.clipTitle}</h4>
                      <p className="feed-item-venue">
                        <MapPinIcon size={13} /> {video.venue}
                      </p>

                      <div className="feed-item-cta-row">
                        <span className="feed-price">{video.price}</span>
                        <button
                          className="feed-book-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBooking(video.showTitle, video.eventDate);
                          }}
                        >
                          Book →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      {/* Slide-in Audience Reactions Drawer (TikTok style comments) */}
      {commentsOpen && (
        <div className="comments-drawer-backdrop" onClick={() => setCommentsOpen(false)}>
          <div className="comments-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="comments-drawer-head">
              <h4>💬 Audience Reactions ({currentComments.length})</h4>
              <button
                className="close-drawer-btn"
                onClick={() => setCommentsOpen(false)}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="comments-scroll-list">
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
                placeholder="Share your reaction or ask about the show..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={200}
              />
              <button type="submit" className="comment-send-btn">
                Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
