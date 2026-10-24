import React, { useState } from "react";
import { PlayIcon, TicketIcon, ClockIcon, MapPinIcon } from "./Icons";
import { useShows, getShowImage } from "../hooks/useShows";

// Tab definitions — each tab maps to a category keyword matched against
// the show's `category` field coming from the API.
const TABS = [
  { id: "all",        label: "All Productions" },
  { id: "live",       label: "Live Productions" },
  { id: "highlights", label: "Stage Highlights" },
  { id: "drama",      label: "Drama & Thrillers" },
  { id: "poetry",     label: "Poetry & Spoken Word" },
  { id: "schools",    label: "School Tours" },
];

function matchesTab(show, tabId) {
  if (tabId === "all") return true;
  const cat = (show.category || "").toLowerCase();
  const venue = (show.venue || "").toLowerCase();
  if (tabId === "live")       return cat.includes("live") || cat.includes("production");
  if (tabId === "highlights") return cat.includes("highlight") || cat.includes("documentary");
  if (tabId === "drama")      return cat.includes("drama") || cat.includes("thriller") || cat.includes("suspense");
  if (tabId === "poetry")     return cat.includes("poetry") || cat.includes("spoken") || cat.includes("rhythm");
  if (tabId === "schools")    return cat.includes("school") || cat.includes("tour") || venue.includes("school");
  return true;
}

// Skeleton card shown while loading
function SkeletonCard() {
  return (
    <div className="editorial-card editorial-card--skeleton">
      <div className="editorial-card-thumb editorial-skeleton-block" />
      <div className="editorial-card-body">
        <div className="editorial-skeleton-line" style={{ width: "60%", marginBottom: "10px" }} />
        <div className="editorial-skeleton-line" style={{ width: "90%", marginBottom: "6px" }} />
        <div className="editorial-skeleton-line" style={{ width: "75%" }} />
      </div>
    </div>
  );
}

export default function EditorialShowsRail({ onOpenBooking, onPlayVideo, searchQuery = "" }) {
  const [activeTab, setActiveTab] = useState("all");
  const { shows, loading, error } = useShows();

  // Apply tab filter then search filter
  const filtered = shows
    .filter((show) => matchesTab(show, activeTab))
    .filter((show) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (show.title || "").toLowerCase().includes(q) ||
        (show.category || "").toLowerCase().includes(q) ||
        (show.venue || "").toLowerCase().includes(q) ||
        (show.description || "").toLowerCase().includes(q)
      );
    });

  return (
    <section className="editorial-rail-section">
      <div className="editorial-container">
        {/* Category Tabs */}
        <div className="editorial-tabs-row">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`editorial-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="shows-status-msg shows-status-msg--error">
            <span>⚠️ {error}</span>
            <button
              className="shows-retry-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="editorial-cards-grid">
            {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="shows-status-msg">
            <span>
              {searchQuery
                ? `No productions match "${searchQuery}".`
                : "No productions in this category yet."}
            </span>
          </div>
        )}

        {/* Show cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="editorial-cards-grid">
            {filtered.map((show, idx) => {
              const image = getShowImage(show.title, idx);
              const hasDate = show.eventDate && show.eventDate !== "null";
              const dateLabel = hasDate
                ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" })
                    .format(new Date(`${show.eventDate}T12:00:00`))
                : "Coming Soon";

              return (
                <div key={show.id} className="editorial-card">
                  <div
                    className="editorial-card-thumb"
                    style={{ backgroundImage: `url(${image})` }}
                    onClick={() =>
                      onPlayVideo({
                        title: show.title,
                        category: show.category,
                        venue: show.venue,
                        duration: "—",
                        thumb: image,
                        showTitle: show.title,
                        eventDate: show.eventDate || "",
                      })
                    }
                  >
                    <div className="editorial-card-tag">{show.category}</div>

                    <div className="editorial-card-hover-overlay">
                      <div className="play-circle-ivory">
                        <PlayIcon size={20} fill="#080808" />
                      </div>
                      <span className="watch-clip-label">Watch Stage Clip</span>
                    </div>
                  </div>

                  <div className="editorial-card-body">
                    <div className="card-meta-line">
                      <span>
                        <ClockIcon size={13} /> {dateLabel}
                      </span>
                      {show.venue && (
                        <>
                          <span>•</span>
                          <span>
                            <MapPinIcon size={13} /> {show.venue}
                          </span>
                        </>
                      )}
                    </div>

                    <h4 className="editorial-card-title font-serif">{show.title}</h4>
                    <p className="editorial-card-desc">{show.description}</p>

                    <div className="editorial-card-footer">
                      <span className="card-price-tag">
                        {show.price || "Contact for pricing"}
                      </span>

                      <button
                        className="editorial-card-book-btn"
                        onClick={() => onOpenBooking(show.title, show.eventDate || "")}
                      >
                        <TicketIcon size={14} />
                        <span>Book Seats</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
