import React, { useState } from "react";
import { ShieldLockIcon, TicketIcon, PlayIcon } from "./Icons";

export default function Navbar({
  activeSection,
  onNavigate,
  onOpenBooking,
  onOpenSchoolBookings,
  onOpenAdmin,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (section) => {
    setMobileOpen(false);
    if (section === "schools") {
      onOpenSchoolBookings();
    } else {
      onNavigate(section);
    }
  };

  return (
    <header className="site-header">
      <div className="container header-container">
        <a
          href="#watch"
          className="brand-link"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick("watch");
          }}
        >
          <img
            src="/image.png"
            alt="Voice of Art Productions Logo"
            className="brand-logo-img"
          />
          <div className="brand-text">
            <span className="brand-title">VOICE OF ART</span>
            <span className="brand-subtitle">STAGE STREAM</span>
          </div>
        </a>

        <nav className="nav-links">
          <button
            className={`nav-link ${activeSection === "watch" ? "active" : ""}`}
            onClick={() => handleNavClick("watch")}
          >
            <span className="nav-live-dot"></span>
            Watch Stream
          </button>
          <button
            className={`nav-link ${activeSection === "shows" ? "active" : ""}`}
            onClick={() => handleNavClick("shows")}
          >
            All Productions
          </button>
          <button
            className={`nav-link ${activeSection === "schools" ? "active" : ""}`}
            onClick={() => handleNavClick("schools")}
          >
            School Bookings
          </button>
        </nav>

        <div className="nav-actions">
          {/* HIGH IMPACT DIRECT BOOKING CTA IN NAVBAR */}
          <button
            className="btn-nav-book"
            onClick={() => onOpenBooking()}
            title="Book tickets for the upcoming live stage show"
          >
            <TicketIcon size={16} />
            <span>Book Tickets</span>
          </button>

          <button
            className="admin-badge-btn"
            title="Admin Dashboard"
            onClick={onOpenAdmin}
            aria-label="Admin Dashboard"
          >
            <ShieldLockIcon size={16} />
          </button>

          <button
            className="menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu-drawer">
          <button
            className={`mobile-link ${activeSection === "watch" ? "active" : ""}`}
            onClick={() => handleNavClick("watch")}
          >
            <span>▶ Watch Stream (Live Clips)</span>
          </button>
          <button
            className={`mobile-link ${activeSection === "shows" ? "active" : ""}`}
            onClick={() => handleNavClick("shows")}
          >
            All Productions & Tickets
          </button>
          <button
            className={`mobile-link ${activeSection === "schools" ? "active" : ""}`}
            onClick={() => handleNavClick("schools")}
          >
            School Tours & Calendar
          </button>
          <button
            className="mobile-link mobile-cta-link"
            onClick={() => {
              setMobileOpen(false);
              onOpenBooking();
            }}
          >
            🎟️ Book Tickets (Instant M-Pesa)
          </button>
          <button
            className="mobile-link admin-mobile"
            onClick={() => {
              setMobileOpen(false);
              onOpenAdmin();
            }}
          >
            Admin Dashboard 🔒
          </button>
        </div>
      )}
    </header>
  );
}
