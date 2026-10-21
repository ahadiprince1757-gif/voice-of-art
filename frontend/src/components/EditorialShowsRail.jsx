import React, { useState } from "react";
import { PlayIcon, TicketIcon, ClockIcon, MapPinIcon } from "./Icons";

export const categoryCards = [
  {
    id: "last-letter",
    title: "The Last Letter",
    category: "Trending Plays",
    tag: "LIVE PRODUCTION",
    venue: "Nairobi National Theatre",
    date: "Saturday, Oct 18",
    price: "From KSh 500",
    duration: "1h 45m",
    image: "/hero-stage.jpg",
    description: "A moving Kenyan stage masterpiece about choices and friendship.",
  },
  {
    id: "behind-mask",
    title: "Behind the Mask",
    category: "Drama & Thrillers",
    tag: "LIVE AT KU",
    venue: "Kenyatta University Theatre",
    date: "Sunday, Nov 02",
    price: "From KSh 400",
    duration: "1h 30m",
    image: "/theatre-mask.jpg",
    description: "Every character has something to hide when the curtain rises.",
  },
  {
    id: "grand-stage",
    title: "The Art of Stagecraft",
    category: "Live Stage Highlights",
    tag: "DOCUMENTARY",
    venue: "National Tour",
    date: "Season 2026",
    price: "Free Access",
    duration: "45m",
    image: "/theatre-curtains.jpg",
    description: "Behind the curtain: lighting design, stage direction, and set building.",
  },
  {
    id: "school-tour",
    title: "Curtain Call Ensemble",
    category: "School Tours",
    tag: "YOUTH THEATRE",
    venue: "Nationwide Schools",
    date: "Term 3 Tour",
    price: "School Package",
    duration: "1h 15m",
    image: "/theatre-cast.jpg",
    description: "Bringing set book drama and live performance workshops to schools.",
  },
];

export default function EditorialShowsRail({ onOpenBooking, onPlayVideo }) {
  const [activeTab, setActiveTab] = useState("trending");

  const tabs = [
    { id: "trending", label: "Trending Plays" },
    { id: "highlights", label: "Live Stage Highlights" },
    { id: "drama", label: "Drama & Thrillers" },
    { id: "poetry", label: "Poetry & Spoken Word" },
    { id: "schools", label: "School Tours" },
  ];

  return (
    <section className="editorial-rail-section">
      <div className="editorial-container">
        {/* Category Tabs */}
        <div className="editorial-tabs-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`editorial-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4 Theatrical Cards Row */}
        <div className="editorial-cards-grid">
          {categoryCards.map((card) => (
            <div key={card.id} className="editorial-card">
              <div
                className="editorial-card-thumb"
                style={{ backgroundImage: `url(${card.image})` }}
                onClick={() =>
                  onPlayVideo({
                    title: card.title,
                    category: card.tag,
                    venue: card.venue,
                    duration: card.duration,
                    thumb: card.image,
                    showTitle: card.title,
                    eventDate: card.date,
                  })
                }
              >
                <div className="editorial-card-tag">{card.tag}</div>

                <div className="editorial-card-hover-overlay">
                  <div className="play-circle-ivory">
                    <PlayIcon size={20} fill="#080808" />
                  </div>
                  <span className="watch-clip-label">Watch Stage Clip</span>
                </div>

                <span className="card-duration-badge">{card.duration}</span>
              </div>

              <div className="editorial-card-body">
                <div className="card-meta-line">
                  <span>
                    <ClockIcon size={13} /> {card.date}
                  </span>
                  <span>•</span>
                  <span>
                    <MapPinIcon size={13} /> {card.venue}
                  </span>
                </div>

                <h4 className="editorial-card-title font-serif">{card.title}</h4>
                <p className="editorial-card-desc">{card.description}</p>

                <div className="editorial-card-footer">
                  <span className="card-price-tag">{card.price}</span>

                  <button
                    className="editorial-card-book-btn"
                    onClick={() => onOpenBooking(card.title, card.date)}
                  >
                    <TicketIcon size={14} />
                    <span>Book Seats</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
