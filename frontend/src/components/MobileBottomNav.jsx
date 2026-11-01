import React from "react";
import { HomeIcon, FilmIcon, SparklesIcon, TicketIcon, SchoolIcon } from "./Icons";

export default function MobileBottomNav({ activeNav, onNavClick, onOpenBooking, onOpenReels }) {
  const tabs = [
    { id: "home",    label: "Home",  Icon: HomeIcon },
    { id: "watch",   label: "Watch", Icon: FilmIcon,     isWatch: true },
    { id: "shows",   label: "Shows", Icon: SparklesIcon },
    { id: "book",    label: "Book",  Icon: TicketIcon,   isSpecial: true },
    { id: "schools", label: "Tours", Icon: SchoolIcon },
  ];

  const handleTabClick = (tab) => {
    if (tab.id === "book") {
      onOpenBooking?.();
      return;
    }
    if (tab.id === "watch") {
      // Always open immersive reels overlay from the mobile bottom nav
      onOpenReels?.();
      return;
    }
    onNavClick(tab.id);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {tabs.map((tab) => {
          const { id, label, Icon, isWatch, isSpecial } = tab;
          const isActive = activeNav === id;

          return (
            <button
              key={id}
              id={`mobile-nav-${id}`}
              className={`mobile-nav-item ${isActive ? "active" : ""} ${isSpecial ? "special-book" : ""} ${isWatch ? "watch-tab" : ""}`}
              onClick={() => handleTabClick(tab)}
              aria-label={label}
            >
              <div className="mobile-nav-icon-wrap">
                <Icon size={21} />
                {isWatch && <span className="mobile-nav-live-dot" />}
              </div>
              <span className="mobile-nav-label">{label}</span>
              {isActive && <span className="mobile-nav-active-pill" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
