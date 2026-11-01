import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorialHeader from "./components/EditorialHeader";
import EditorialHeroSection from "./components/EditorialHeroSection";
import EditorialShowsRail from "./components/EditorialShowsRail";
import StageWatchFeed from "./components/StageWatchFeed";
import EditorialVideoModal from "./components/EditorialVideoModal";
import BookingModal from "./components/BookingModal";
import SchoolCalendar from "./components/SchoolCalendar";
import Toast from "./components/Toast";
import MobileBottomNav from "./components/MobileBottomNav";
import MobileReelsFeed from "./components/MobileReelsFeed";
import ManagementPage from "./pages/ManagementPage";
import { CloseIcon } from "./components/Icons";

// ─────────────────────────────────────────────────────────────────────────────
// PublicApp — the customer-facing Voice of Art experience
// ─────────────────────────────────────────────────────────────────────────────
function PublicApp() {
  const [activeNav, setActiveNav] = useState("home");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedShowForBooking, setSelectedShowForBooking] = useState("");
  const [selectedDateForBooking, setSelectedDateForBooking] = useState("");
  const [activeVideoForPlayer, setActiveVideoForPlayer] = useState(null);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [reelsFeedOpen, setReelsFeedOpen] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "success" });
    }, 3500);
  };

  const handleOpenBooking = (showTitle = "", date = "") => {
    setSelectedShowForBooking(showTitle);
    setSelectedDateForBooking(date);
    setBookingModalOpen(true);
  };

  const handlePlayVideo = (video) => {
    setActiveVideoForPlayer(video);
  };

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    if (navId === "schools") {
      setSchoolModalOpen(true);
    } else if (navId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (navId === "watch" || navId === "live") {
      // Desktop: scroll to the watch feed section
      // Mobile: handled by MobileBottomNav → onOpenReels directly
      const el = document.getElementById("watch-feed");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      const el = document.getElementById("productions");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="editorial-app-root">
      {/* Editorial Header — top 3-line dropdown menu on mobile */}
      <EditorialHeader
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onOpenBooking={() => handleOpenBooking()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onOpenSchoolTours={() => setSchoolModalOpen(true)}
      />

      <main>
        {/* Split Hero: Stage Spotlight on Left + Watch / Upcoming on Right */}
        <EditorialHeroSection
          onOpenBooking={handleOpenBooking}
          onPlayVideo={handlePlayVideo}
          onNavigate={handleNavClick}
        />

        {/* Video Watch Feed */}
        <div id="watch-feed">
          <StageWatchFeed
            onOpenBooking={handleOpenBooking}
            onToast={showToast}
          />
        </div>

        {/* Categories & Shows Rail */}
        <div id="productions">
          <EditorialShowsRail
            onOpenBooking={handleOpenBooking}
            onPlayVideo={handlePlayVideo}
            searchQuery={searchQuery}
            activeCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </main>

      {/* Social-App Style Bottom Navigation for Phones */}
      <MobileBottomNav
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onOpenBooking={() => handleOpenBooking()}
        onOpenReels={() => setReelsFeedOpen(true)}
      />

      {/* Immersive TikTok / YouTube Shorts-Style Reels Overlay */}
      {reelsFeedOpen && (
        <MobileReelsFeed
          onClose={() => { setReelsFeedOpen(false); setActiveNav("home"); }}
          onOpenBooking={handleOpenBooking}
          onToast={showToast}
        />
      )}

      {/* Protected Video Streaming Modal */}
      {activeVideoForPlayer && (
        <EditorialVideoModal
          video={activeVideoForPlayer}
          onClose={() => setActiveVideoForPlayer(null)}
          onOpenBooking={handleOpenBooking}
        />
      )}

      {/* Ticket Reservation & Instant M-Pesa Checkout */}
      {bookingModalOpen && (
        <BookingModal
          initialShow={selectedShowForBooking}
          initialDate={selectedDateForBooking}
          onClose={() => setBookingModalOpen(false)}
          onToast={showToast}
        />
      )}

      {/* School Tours & Educational Calendar Dialog */}
      {schoolModalOpen && (
        <div className="overlay-backdrop" onClick={() => setSchoolModalOpen(false)}>
          <div
            className="feature-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setSchoolModalOpen(false)}
              aria-label="Close dialog"
            >
              <CloseIcon size={18} />
            </button>
            <SchoolCalendar
              onOpenBooking={(title, date) => {
                setSchoolModalOpen(false);
                handleOpenBooking(title, date);
              }}
              onToast={showToast}
            />
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App — root with React Router
// /management  → hidden admin console (Supabase Auth protected)
// /*           → public-facing site
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/management/*" element={<ManagementPage />} />
        <Route path="/*" element={<PublicApp />} />
      </Routes>
    </BrowserRouter>
  );
}
