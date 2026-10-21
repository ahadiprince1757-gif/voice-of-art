import React, { useState } from "react";
import { ChevronLeft, ChevronRight, PlayIcon } from "./Icons";

export const heroSlides = [
  {
    id: "last-letter",
    eyebrow: "THEATRE • FILM • LEARNING",
    title: "Real Stories.",
    accentWord: "Live",
    titleEnd: "on Stage.",
    description:
      "Experience captivating theatrical productions, bring live drama to your school hall, and relive unforgettable stage stories anytime, anywhere.",
    buttonText: "Book Tickets Now",
    showTitle: "The Last Letter",
    eventDate: "2026-10-18",
    image: "/hero-stage.jpg",
  },
  {
    id: "behind-mask",
    eyebrow: "DRAMA • MYSTERY • PSYCHOLOGY",
    title: "Behind the",
    accentWord: "Mask",
    titleEnd: "Unveiled.",
    description:
      "When the curtain rises, every family member has something to hide. A razor-sharp Kenyan stage thriller.",
    buttonText: "Reserve KU Stage Tickets",
    showTitle: "Behind the Mask",
    eventDate: "2026-11-02",
    image: "/theatre-mask.jpg",
  },
  {
    id: "stagecraft",
    eyebrow: "ORIGINAL KENYAN WRITING",
    title: "Voices from the",
    accentWord: "Heart",
    titleEnd: "of Nairobi.",
    description:
      "Original stage writing, vibrant directing, and raw youth storytelling touring schools and national auditoriums.",
    buttonText: "Explore Season Passes",
    showTitle: "New Voices",
    eventDate: "2026-11-20",
    image: "/theatre-curtains.jpg",
  },
  {
    id: "curtain-call",
    eyebrow: "STAGE ENSEMBLE TOUR",
    title: "Every Voice",
    accentWord: "Matters",
    titleEnd: "on Stage.",
    description:
      "Connecting young artists, performers, and secondary school learners through transformative theatrical workshops.",
    buttonText: "Book School Tour",
    showTitle: "School Tour: Set Book Drama",
    eventDate: "2026-11-14",
    image: "/theatre-cast.jpg",
  },
];

export const upcomingVideos = [
  {
    id: "mask-confrontation",
    title: "Behind the Mask – The Confrontation Scene",
    category: "Drama",
    venue: "Kenyatta University Theatre",
    duration: "3:42",
    thumb: "/theatre-mask.jpg",
    showTitle: "Behind the Mask",
    eventDate: "2026-11-02",
  },
  {
    id: "spoken-word",
    title: "Spoken Word Spotlight: Young Nairobi Poets",
    category: "Poetry",
    venue: "Kenya Cultural Tour",
    duration: "4:48",
    thumb: "/hero-stage.jpg",
    showTitle: "New Voices",
    eventDate: "2026-11-20",
  },
  {
    id: "stagecraft-doc",
    title: "The Art of Stagecraft",
    category: "Documentary",
    venue: "VOAP Studios",
    duration: "7:26",
    thumb: "/theatre-curtains.jpg",
    showTitle: "The Last Letter",
    eventDate: "2026-10-18",
  },
];

export default function EditorialHeroSection({
  onOpenBooking,
  onPlayVideo,
  onNavigate,
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const slide = heroSlides[currentSlideIndex];

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <section className="editorial-hero-section">
      <div className="editorial-hero-grid">
        {/* Left Column: Big Spotlight Stage Showcase */}
        <div
          className="editorial-hero-card"
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          {/* Subtle natural dark gradient fade so text is legible and mood is theatrical */}
          <div className="editorial-hero-vignette"></div>

          <div className="editorial-hero-content">
            <div className="editorial-eyebrow">{slide.eyebrow}</div>

            <h1 className="editorial-hero-title font-serif">
              {slide.title}{" "}
              <span className="editorial-gold-accent">{slide.accentWord}</span>{" "}
              {slide.titleEnd}
            </h1>

            <p className="editorial-hero-desc">{slide.description}</p>

            <div className="editorial-hero-action-row">
              <button
                className="editorial-btn-ivory"
                onClick={() => onOpenBooking(slide.showTitle, slide.eventDate)}
              >
                <span>{slide.buttonText}</span>
                <span className="btn-arrow">→</span>
              </button>

              <button
                className="editorial-btn-watch-trailer"
                onClick={() =>
                  onPlayVideo({
                    title: `${slide.showTitle} – Official Stage Trailer`,
                    category: slide.eyebrow,
                    duration: "2:15",
                    thumb: slide.image,
                    showTitle: slide.showTitle,
                    eventDate: slide.eventDate,
                  })
                }
              >
                <PlayIcon size={16} fill="currentColor" />
                <span>Watch Trailer</span>
              </button>
            </div>
          </div>

          {/* Bottom Slider Indicators and Arrows */}
          <div className="editorial-hero-footer">
            <div className="editorial-dots">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  className={`editorial-dot ${idx === currentSlideIndex ? "active" : ""}`}
                  onClick={() => setCurrentSlideIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="editorial-slider-arrows">
              <button
                className="editorial-arrow-btn"
                onClick={prevSlide}
                aria-label="Previous slide"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="editorial-arrow-btn"
                onClick={nextSlide}
                aria-label="Next slide"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Continue Watching + Upcoming & Featured */}
        <div className="editorial-rail">
          {/* Continue Watching Card */}
          <div className="editorial-rail-block">
            <div className="editorial-rail-header">
              <h3 className="editorial-rail-title">
                <span className="play-triangle">▷</span> Continue Watching
              </h3>
              <button
                className="editorial-view-all"
                onClick={() => onNavigate("watch")}
              >
                View All →
              </button>
            </div>

            <div
              className="editorial-watch-card"
              onClick={() =>
                onPlayVideo({
                  title: "The Last Letter – Official Stage Trailer",
                  category: "Drama",
                  venue: "National Theatre",
                  duration: "2:15:42",
                  thumb: "/hero-stage.jpg",
                  showTitle: "The Last Letter",
                  eventDate: "2026-10-18",
                })
              }
            >
              <div
                className="editorial-watch-thumb"
                style={{ backgroundImage: `url('/hero-stage.jpg')` }}
              >
                <div className="editorial-live-badge">
                  <span className="editorial-live-dot">●</span>
                  <span>LIVE</span>
                </div>

                <span className="editorial-duration-badge">2:15:42</span>

                <div className="editorial-thumb-play-overlay">
                  <PlayIcon size={24} fill="#fff" />
                </div>
              </div>

              <div className="editorial-watch-meta">
                <h4 className="editorial-watch-title">
                  The Last Letter – Official Stage Trailer
                </h4>
                <p className="editorial-watch-sub">Drama • National Theatre</p>

                {/* Simulated watch progress bar */}
                <div className="editorial-watch-progress-track">
                  <div
                    className="editorial-watch-progress-bar"
                    style={{ width: "65%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming & Featured List */}
          <div className="editorial-rail-block">
            <div className="editorial-rail-header">
              <h3 className="editorial-rail-title">
                <span className="calendar-symbol">📅</span> Upcoming & Featured
              </h3>
              <button
                className="editorial-view-all"
                onClick={() => onNavigate("shows")}
              >
                View All →
              </button>
            </div>

            <div className="editorial-upcoming-list">
              {upcomingVideos.map((item) => (
                <div
                  key={item.id}
                  className="editorial-upcoming-item"
                  onClick={() => onPlayVideo(item)}
                >
                  <div
                    className="editorial-item-thumb"
                    style={{ backgroundImage: `url(${item.thumb})` }}
                  >
                    <span className="editorial-item-time">{item.duration}</span>
                  </div>

                  <div className="editorial-item-info">
                    <h5 className="editorial-item-title">{item.title}</h5>
                    <p className="editorial-item-venue">
                      {item.category} • {item.venue}
                    </p>
                  </div>

                  <span className="editorial-item-arrow">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
