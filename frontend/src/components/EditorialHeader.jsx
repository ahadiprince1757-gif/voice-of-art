import React, { useState } from "react";
import { TicketIcon, SearchIcon, UserIcon } from "./Icons";

export default function EditorialHeader({
  activeNav,
  onNavClick,
  onOpenBooking,
  searchQuery,
  onSearchChange,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "watch", label: "Watch" },
    { id: "live", label: "Live Stage" },
    { id: "drama", label: "Drama & Thrillers" },
    { id: "poetry", label: "Poetry & Spoken Word" },
    { id: "schools", label: "School Tours" },
  ];

  const handleSelectNav = (id) => {
    onNavClick(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="editorial-header">
      <div className="editorial-header-inner">
        {/* Brand Logo & Title */}
        <a
          href="#home"
          className="editorial-brand"
          onClick={(e) => {
            e.preventDefault();
            handleSelectNav("home");
          }}
        >
          <img
            src="/image.png"
            alt="Voice of Art Productions"
            className="editorial-logo-img"
          />
          <div className="editorial-brand-text">
            <span className="editorial-brand-title font-serif">VOICE OF ART</span>
            <span className="editorial-brand-sub">PRODUCTIONS</span>
          </div>
        </a>

        {/* Center Nav Links */}
        <nav className="editorial-nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`editorial-nav-link ${activeNav === item.id ? "active" : ""}`}
              onClick={() => handleSelectNav(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="editorial-actions">
          {searchOpen ? (
            <div className="editorial-search-bar">
              <SearchIcon size={16} />
              <input
                type="text"
                placeholder="Search productions, poems..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
              />
              <button
                className="editorial-search-close"
                onClick={() => setSearchOpen(false)}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="editorial-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search productions"
              title="Search"
            >
              <SearchIcon size={18} />
            </button>
          )}

          {/* Clean Ivory Pill CTA Button */}
          <button
            className="editorial-book-pill"
            onClick={onOpenBooking}
            title="Book tickets for live shows"
          >
            <TicketIcon size={16} />
            <span>Book Tickets</span>
          </button>

          <button
            className="editorial-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="editorial-mobile-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`editorial-mobile-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => handleSelectNav(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            className="editorial-mobile-book"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenBooking();
            }}
          >
            🎟️ Book Tickets
          </button>
        </div>
      )}
    </header>
  );
}
