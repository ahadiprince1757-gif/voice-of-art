import React, { useEffect, useState } from "react";
import api from "../api";
import { ClockIcon, MapPinIcon, TicketIcon } from "./Icons";

const fallbackShows = [
  {
    id: 1,
    title: "The Last Letter",
    category: "Live Production",
    description: "A moving stage story about choices, friendship, and the price of silence.",
    venue: "Nairobi",
    eventDate: "2026-10-18",
    price: "From KSh 500",
    posterClass: "",
    active: true,
  },
  {
    id: 2,
    title: "Behind the Mask",
    category: "Live Production",
    description: "When the curtain rises, every character has something to hide.",
    venue: "KU Theatre",
    eventDate: "2026-11-02",
    price: "From KSh 400",
    posterClass: "two",
    active: true,
  },
  {
    id: 3,
    title: "New Voices",
    category: "Coming Soon",
    description: "A new generation of performers telling stories from their own world.",
    venue: "Kenya Tour",
    eventDate: null,
    price: "Stay tuned",
    posterClass: "three",
    active: true,
  },
];

export default function ShowsSection({ onOpenBooking, onToast }) {
  const [shows, setShows] = useState(fallbackShows);

  useEffect(() => {
    let mounted = true;
    api
      .getShows()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          const normalized = data.slice(0, 3).map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category || "Live Production",
            description: s.description,
            venue: s.venue || "Nairobi",
            eventDate: s.eventDate || s.event_date || null,
            price: s.price || "Contact us",
            posterClass: s.posterClass || s.poster_class || "",
            active: s.active !== false,
          }));
          setShows(normalized);
        }
      })
      .catch((err) => {
        console.warn("Using fallback shows data:", err.message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleNotifyMe = (title) => {
    onToast(`We will notify you when tickets for "${title}" go live!`);
  };

  return (
    <section id="shows" className="minimal-shows-section">
      <div className="container">
        <div className="minimal-section-header">
          <span className="minimal-eyebrow">On Stage</span>
          <h2 className="minimal-title font-serif">Current Productions</h2>
          <p className="minimal-desc">
            Reserve your seats for our current season. Pick a performance to attend.
          </p>
        </div>

        <div className="minimal-shows-grid">
          {shows.map((show) => {
            const isTba = !show.eventDate;

            return (
              <article key={show.id} className="minimal-show-card">
                <div className={`minimal-poster ${show.posterClass}`}>
                  <span className="minimal-poster-tag">{show.category}</span>
                  <h3 className="minimal-poster-title font-serif">{show.title}</h3>
                </div>

                <div className="minimal-card-body">
                  <div className="minimal-meta-row">
                    <span className="minimal-meta">
                      <ClockIcon size={14} />
                      {show.eventDate || "Date TBA"}
                    </span>
                    <span className="minimal-meta">
                      <MapPinIcon size={14} />
                      {show.venue}
                    </span>
                  </div>

                  <p className="minimal-synopsis">{show.description}</p>

                  <div className="minimal-card-footer">
                    <span className="minimal-price">{show.price}</span>

                    {isTba ? (
                      <button
                        className="btn btn-notify"
                        onClick={() => handleNotifyMe(show.title)}
                      >
                        Notify Me
                      </button>
                    ) : (
                      <button
                        className="btn btn-book-card"
                        onClick={() => onOpenBooking(show.title, show.eventDate)}
                      >
                        <TicketIcon size={15} />
                        <span>Book Seats</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
