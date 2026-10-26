import React from "react";

export default function Footer({
  onNavigate,
  onOpenBooking,
  onOpenSchoolBookings,
}) {
  return (
    <footer className="editorial-footer">
      <div className="editorial-footer-container">
        <div className="editorial-footer-top">
          <div className="editorial-footer-brand">
            <div className="editorial-brand">
              <img
                src="/image.png"
                alt="Voice of Art Productions"
                className="editorial-logo-img"
              />
              <div className="editorial-brand-text">
                <span className="editorial-brand-title font-serif">VOICE OF ART</span>
                <span className="editorial-brand-sub">PRODUCTIONS</span>
              </div>
            </div>
            <p className="editorial-footer-mission">
              Empowering youth across Kenya through transformative theatrical storytelling, live stage tours, and educational performance workshops.
            </p>
          </div>

          <div className="editorial-footer-nav">
            <div className="footer-col">
              <h5>Platform</h5>
              <button onClick={() => onNavigate("home")}>Home</button>
              <button onClick={() => onNavigate("watch")}>Watch Stream</button>
              <button onClick={() => onNavigate("shows")}>Live Productions</button>
              <button onClick={onOpenSchoolBookings}>School Tours</button>
            </div>

            <div className="footer-col">
              <h5>Ticketing</h5>
              <button onClick={() => onOpenBooking()} className="footer-gold-link">
                Book Tickets Now →
              </button>
              <button onClick={onOpenSchoolBookings}>Host School Performance</button>
            </div>

            <div className="footer-col">
              <h5>Connect</h5>
              <span>Nairobi National Theatre, Kenya</span>
              <span>hello@voiceofart.co.ke</span>
              <span>+254 700 000 000</span>
            </div>
          </div>
        </div>

        <div className="editorial-footer-bottom">
          <p>© {new Date().getFullYear()} Voice of Art Productions. All rights reserved.</p>
          <p className="footer-quote">Real Stories. Live on Stage.</p>
        </div>
      </div>
    </footer>
  );
}
