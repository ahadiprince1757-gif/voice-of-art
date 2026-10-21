import React, { useState } from "react";
import { PlayIcon, ClockIcon, FilmIcon, SparklesIcon } from "./Icons";
import VideoPlayerModal from "./VideoPlayerModal";

const videoList = [
  {
    id: "mask-full",
    title: "Behind the Mask — Full Show",
    duration: "1h 12m",
    category: "Full Stage Performance",
    description: "The complete sold-out Kenyatta University auditorium staging.",
    isFeatured: true,
  },
  {
    id: "highlights",
    title: "Opening Night Highlights",
    duration: "8 min",
    category: "Highlights & Audience Reactions",
    description: "Memorable moments and ovations from our Nairobi premiere.",
  },
  {
    id: "interview",
    title: "Voices Behind the Curtain",
    duration: "12 min",
    category: "Director & Cast Interview",
    description: "An intimate conversation with our playwrights and young actors.",
  },
  {
    id: "campus",
    title: "Campus Stage Sessions",
    duration: "5 episodes",
    category: "Docu-series",
    description: "Behind-the-scenes rehearsals, set building, and creative journey.",
  },
];

export default function WatchSection() {
  const [activeVideo, setActiveVideo] = useState(null);

  return (
    <section id="watch" className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <FilmIcon size={16} />
              <span>03 / Digital Stage & Archive</span>
            </div>
            <h2 className="section-title font-serif">The curtain never has to close.</h2>
          </div>
          <p className="section-desc">
            Missed a stage run? Explore recorded productions, backstage interviews, and exclusive
            highlights produced by Voice of Art.
          </p>
        </div>

        <div className="watch-grid">
          {/* Featured Production Card */}
          <div
            className="featured-video-card"
            onClick={() => setActiveVideo(videoList[0])}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setActiveVideo(videoList[0])}
          >
            <div className="play-center-btn" title="Play Video">
              <PlayIcon size={28} />
            </div>

            <div style={{ position: "relative", zIndex: 2 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.76rem",
                  color: "var(--gold)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  letterSpacing: "0.08em",
                }}
              >
                <SparklesIcon size={14} />
                <span>Featured Performance</span>
              </div>
              <h3 className="font-serif" style={{ fontSize: "1.9rem", color: "#fff", marginBottom: "6px" }}>
                Behind the Mask — Full Show
              </h3>
              <p style={{ color: "#cbd5e1", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <ClockIcon size={14} /> 1h 12m • 4K Digital Theater Archive
              </p>
            </div>
          </div>

          {/* Video Playlist */}
          <div className="video-playlist">
            {videoList.map((video) => (
              <div
                key={video.id}
                className="video-list-item"
                onClick={() => setActiveVideo(video)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setActiveVideo(video)}
              >
                <div className="video-thumb">
                  <PlayIcon size={18} />
                </div>
                <div className="video-info">
                  <h4>{video.title}</h4>
                  <p>
                    {video.category} • {video.duration}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeVideo && (
        <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </section>
  );
}
