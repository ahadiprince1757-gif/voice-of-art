import React, { useState } from "react";
import { TicketIcon, SearchIcon, CloseIcon } from "./Icons";

// The 6 categories for mobile dropdown without emojis
export const CATEGORY_ITEMS = [
  { id: "all",        label: "All Productions" },
  { id: "live",       label: "Live Productions" },
  { id: "highlights", label: "Stage Highlights" },
  { id: "drama",      label: "Drama & Thrillers" },
  { id: "poetry",     label: "Poetry & Spoken Word" },
  { id: "schools",    label: "School Tours" },
];

export default function EditorialHeader({
  activeNav,
  onNavClick,
  onOpenBooking,
  searchQuery,
  onSearchChange,
  activeCategory = "all",
  onSelectCategory,
  onOpenSchoolTours,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopNavItems = [
    { id: "home", label: "Home" },
    { id: "watch", label: "Watch" },
    { id: "live", label: "Live Stage" },
    { id: "drama", label: "Drama & Thrillers" },
    { id: "poetry", label: "Poetry & Spoken Word" },
    { id: "schools", label: "School Tours" },
  ];

  const handleSelectNav = (id) => {
    if (onNavClick) onNavClick(id);
    setMobileMenuOpen(false);
  };

  const handleCategoryClick = (catId) => {
    setMobileMenuOpen(false);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    if (catId === "schools") {
      if (onOpenSchoolTours) onOpenSchoolTours();
      else if (onNavClick) onNavClick("schools");
    } else {
      const el = document.getElementById("productions");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="editorial-header">
      <div className="editorial-header-inner">
        {/* Brand: Logo + VOA */}
        <a
          href="#home"
          className="editorial-brand"
          onClick={(e) => {
            e.preventDefault();
            handleSelectNav("home");
          }}
          title="VOA - Voice of Art"
        >
          <img
            src="/logo.png"
            alt="VOA"
            className="editorial-logo-img"
          />
          <span className="editorial-brand-title font-serif">VOA</span>
        </a>

        {/* Center Nav Links (Desktop) */}
        <nav className="editorial-nav-links">
          {desktopNavItems.map((item) => (
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
                placeholder="Search productions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
              />
              <button
                className="editorial-search-close"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <CloseIcon size={14} />
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

          {/* Desktop Book Pill */}
          <button
            className="editorial-book-pill desktop-only"
            onClick={onOpenBooking}
            title="Book tickets for live shows"
          >
            <TicketIcon size={16} />
            <span>Book Tickets</span>
          </button>

          {/* Three Lines Hamburger Button for Mobile Dropdown */}
          <button
            className={`editorial-mobile-toggle ${mobileMenuOpen ? "active" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle categories menu"
            id="mobile-categories-toggle"
            title="Categories"
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </div>

      {/* Top Dropdown Menu for Mobile Screen Layout */}
      {mobileMenuOpen && (
        <div className="editorial-dropdown-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="editorial-mobile-dropdown"
            onClick={(e) => e.stopPropagation()}
            id="mobile-categories-dropdown"
          >
            <div className="dropdown-header">
              <span className="dropdown-eyebrow">BROWSE PRODUCTIONS</span>
              <button
                className="dropdown-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <CloseIcon size={14} />
              </button>
            </div>
            <div className="dropdown-items">
              {CATEGORY_ITEMS.map((item) => {
                const isSelected = activeCategory === item.id;
                return (
                  <button
                    key={item.id}
                    className={`editorial-dropdown-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleCategoryClick(item.id)}
                    id={`cat-item-${item.id}`}
                  >
                    <span className="dropdown-bullet"></span>
                    <span className="dropdown-item-label">{item.label}</span>
                    {isSelected && <span className="dropdown-item-badge">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
