import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, PlayIcon, TicketIcon, SparklesIcon } from "./Icons";
import api from "../api";

// ── Brand-only slide shown when no media is uploaded yet ────────────────────
function BrandSlide({ onOpenBooking }) {
  return (
    <div className="editorial-hero-brand-slide">
      <div className="editorial-hero-left">
        <p className="editorial-eyebrow-label">THEATRE • FILM • LEARNING</p>
        <h1 className="editorial-hero-headline font-serif">
          Real Stories.<br />
          <span className="editorial-hero-accent">Live</span> on Stage.
        </h1>
        <p className="editorial-hero-description">
          Experience captivating theatrical productions, bring live drama to your school hall,
          and relive unforgettable stage stories anytime, anywhere.
        </p>
        <div className="editorial-hero-cta-row">
          <button
            className="btn btn-primary editorial-hero-cta-primary"
            onClick={() => onOpenBooking("", "")}
          >
            <TicketIcon size={18} />
            <span>Book Tickets Now</span>
          </button>
          <button className="btn btn-secondary editorial-hero-cta-ghost">
            <SparklesIcon size={16} />
            <span>Explore Productions</span>
          </button>
        </div>
      </div>

      <div className="editorial-hero-right editorial-hero-right--empty">
        <div className="hero-empty-stage">
          <div className="hero-empty-curtain">🎭</div>
          <p>Your stage videos will appear here</p>
          <small>Upload from the Admin → Media panel</small>
        </div>
      </div>
    </div>
  );
}

// ── Slide built from an uploaded video ──────────────────────────────────────
function MediaSlide({ item, onOpenBooking, onPlayVideo }) {
  const videoUrl = `/uploads/${item.filename}`;
  const isVideo = item.mediaType === "video";

  const handlePlay = () => {
    if (onPlayVideo) {
      onPlayVideo({
        title: item.title,
        category: item.category,
        venue: item.venue,
        duration: item.duration,
        thumb: videoUrl,
        src: videoUrl,
        showTitle: item.showTitle || item.title,
        eventDate: item.eventDate,
      });
    }
  };

  return (
    <div className="editorial-hero-brand-slide">
      {/* Left: text */}
      <div className="editorial-hero-left">
        <p className="editorial-eyebrow-label">{item.category || "THEATRE • FILM • LEARNING"}</p>
        <h1 className="editorial-hero-headline font-serif">
          {item.title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="editorial-hero-accent">
            {item.title.split(" ").slice(-1)[0]}
          </span>
        </h1>
        {item.description && (
          <p className="editorial-hero-description">{item.description}</p>
        )}
        <div className="editorial-hero-cta-row">
          {item.showTitle && item.eventDate && (
            <button
              className="btn btn-primary editorial-hero-cta-primary"
              onClick={() => onOpenBooking(item.showTitle, item.eventDate)}
            >
              <TicketIcon size={18} />
              <span>Book Tickets</span>
            </button>
          )}
          {isVideo && (
            <button className="btn btn-secondary editorial-hero-cta-ghost" onClick={handlePlay}>
              <PlayIcon size={16} fill="currentColor" />
              <span>Watch Clip</span>
            </button>
          )}
        </div>
        {item.venue && (
          <p className="hero-venue-tag">📍 {item.venue}{item.eventDate ? ` · ${item.eventDate}` : ""}</p>
        )}
        {item.price && (
          <p className="hero-price-tag">{item.price}</p>
        )}
      </div>

      {/* Right: video / image preview */}
      <div className="editorial-hero-right">
        <div className="hero-media-frame" onClick={handlePlay}>
          {isVideo ? (
            <video
              src={videoUrl}
              className="hero-media-asset"
              preload="metadata"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <img src={videoUrl} alt={item.title} className="hero-media-asset" />
          )}
          {isVideo && (
            <div className="hero-play-overlay">
              <div className="hero-play-btn">
                <PlayIcon size={28} fill="#080808" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Upcoming sidebar item ────────────────────────────────────────────────────
function UpcomingItem({ item, onPlayVideo }) {
  const videoUrl = `/uploads/${item.filename}`;
  const isVideo = item.mediaType === "video";

  return (
    <div
      className="hero-upcoming-item"
      onClick={() =>
        onPlayVideo &&
        onPlayVideo({
          title: item.title,
          category: item.category,
          src: videoUrl,
          thumb: videoUrl,
          showTitle: item.showTitle || item.title,
          eventDate: item.eventDate,
        })
      }
    >
      <div className="hero-upcoming-thumb">
        {isVideo ? (
          <video src={videoUrl} preload="metadata" muted playsInline className="upcoming-thumb-media" />
        ) : (
          <img src={videoUrl} alt={item.title} className="upcoming-thumb-media" />
        )}
        {isVideo && (
          <div className="upcoming-play-icon">
            <PlayIcon size={14} fill="#fff" />
          </div>
        )}
      </div>
      <div className="hero-upcoming-info">
        <span className="upcoming-category">{item.category}</span>
        <p className="upcoming-title">{item.title}</p>
        {item.venue && <p className="upcoming-venue">📍 {item.venue}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EditorialHeroSection({ onOpenBooking, onPlayVideo }) {
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api
      .getMedia()
      .then((data) => {
        setAllMedia(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Featured items for the main slider (featured flag, or first 3 if none marked)
  const featured = allMedia.filter((m) => m.featured);
  const heroItems = featured.length > 0 ? featured : allMedia.slice(0, 3);

  // Upcoming: recent non-featured items, max 4
  const upcoming = allMedia
    .filter((m) => !heroItems.some((h) => h.id === m.id))
    .slice(0, 4);

  // Auto-advance slides
  useEffect(() => {
    if (heroItems.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % heroItems.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [heroItems.length]);

  const goTo = (idx) => {
    clearInterval(timerRef.current);
    setCurrentSlide(Math.max(0, Math.min(idx, heroItems.length - 1)));
  };

  if (loading) {
    return (
      <section className="editorial-hero-section">
        <div className="editorial-container editorial-skeleton-block" style={{ minHeight: 420, borderRadius: 8 }} />
      </section>
    );
  }

  const hasMedia = heroItems.length > 0;

  return (
    <section className="editorial-hero-section">
      <div className="editorial-container">
        <div className="editorial-hero-grid">

          {/* ── Main hero slider ─────────────────────────────────── */}
          <div className="editorial-hero-main">
            <div className="editorial-hero-slides-wrap">
              {!hasMedia ? (
                <BrandSlide onOpenBooking={onOpenBooking} />
              ) : (
                heroItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`editorial-hero-slide ${idx === currentSlide ? "active" : ""}`}
                    style={{ display: idx === currentSlide ? "flex" : "none" }}
                  >
                    <MediaSlide
                      item={item}
                      onOpenBooking={onOpenBooking}
                      onPlayVideo={onPlayVideo}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Slide controls */}
            {heroItems.length > 1 && (
              <div className="editorial-hero-controls">
                <button
                  className="hero-nav-btn"
                  onClick={() => goTo((currentSlide - 1 + heroItems.length) % heroItems.length)}
                  aria-label="Previous"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="hero-dots">
                  {heroItems.map((_, i) => (
                    <button
                      key={i}
                      className={`hero-dot ${i === currentSlide ? "active" : ""}`}
                      onClick={() => goTo(i)}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  className="hero-nav-btn"
                  onClick={() => goTo((currentSlide + 1) % heroItems.length)}
                  aria-label="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {/* ── Upcoming sidebar ──────────────────────────────────── */}
          {upcoming.length > 0 && (
            <aside className="editorial-hero-upcoming">
              <div className="upcoming-panel-head">
                <span className="eyebrow">CONTINUE WATCHING</span>
              </div>
              <div className="upcoming-list">
                {upcoming.map((item) => (
                  <UpcomingItem
                    key={item.id}
                    item={item}
                    onPlayVideo={onPlayVideo}
                  />
                ))}
              </div>
            </aside>
          )}

          {/* When no upcoming, show brand message */}
          {!hasMedia && (
            <aside className="editorial-hero-upcoming editorial-hero-upcoming--empty">
              <div className="upcoming-panel-head">
                <span className="eyebrow">CONTINUE WATCHING</span>
              </div>
              <div className="hero-sidebar-empty">
                <p>Upload videos and they'll appear here for your audience.</p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
