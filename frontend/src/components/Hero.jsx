import React from "react";

export default function Hero({ onOpenBooking }) {
  return (
    <section id="home" className="hero-section">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-eyebrow">THEATRE • FILM • LEARNING</div>
          <h1 className="hero-title font-serif">
            Voice of <span className="hero-accent">Art</span>
          </h1>

          <div className="hero-actions">
            <button
              className="btn btn-hero"
              onClick={() => onOpenBooking()}
            >
              <span>Book a Show</span>
              <span className="hero-arrow">→</span>
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src="/hero-stage.jpg"
            alt="Live Theatre Actor on Stage in Spotlight"
            className="hero-stage-img"
          />
          <div className="hero-stage-mask-left"></div>
          <div className="hero-stage-mask-bottom"></div>
        </div>
      </div>
    </section>
  );
}
