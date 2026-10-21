import React, { useState, useEffect } from "react";
import EditorialHeader from "./components/EditorialHeader";
import EditorialHeroSection from "./components/EditorialHeroSection";
import EditorialShowsRail from "./components/EditorialShowsRail";
import EditorialVideoModal from "./components/EditorialVideoModal";
import BookingModal from "./components/BookingModal";
import SchoolCalendar from "./components/SchoolCalendar";
import AdminModal from "./components/AdminModal";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import { CloseIcon } from "./components/Icons";

export default function App() {
  const [activeNav, setActiveNav] = useState("home");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedShowForBooking, setSelectedShowForBooking] = useState("");
  const [selectedDateForBooking, setSelectedDateForBooking] = useState("");
  const [activeVideoForPlayer, setActiveVideoForPlayer] = useState(null);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "success" });
    }, 3500);
  };

  const handleOpenBooking = (showTitle = "", date = "") => {
    setSelectedShowForBooking(showTitle || "The Last Letter");
    setSelectedDateForBooking(date || "2026-10-18");
    setBookingModalOpen(true);
  };

  const handlePlayVideo = (video) => {
    setActiveVideoForPlayer(video);
  };

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    if (navId === "schools") {
      setSchoolModalOpen(true);
    } else if (navId === "watch" || navId === "live") {
      // open the spotlight trailer immediately
      handlePlayVideo({
        title: "The Last Letter – Official Stage Trailer",
        category: "Drama",
        venue: "Nairobi National Theatre",
        duration: "2:15:42",
        thumb: "/hero-stage.jpg",
        showTitle: "The Last Letter",
        eventDate: "2026-10-18",
      });
    } else if (navId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById("productions");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="editorial-app-root">
      {/* Editorial Header */}
      <EditorialHeader
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onOpenBooking={() => handleOpenBooking()}
        onOpenAdmin={() => setAdminModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main>
        {/* Split Hero: Stage Spotlight on Left + Watch / Upcoming on Right */}
        <EditorialHeroSection
          onOpenBooking={handleOpenBooking}
          onPlayVideo={handlePlayVideo}
          onNavigate={handleNavClick}
        />

        {/* Categories & 4 Theatrical Cards Row */}
        <div id="productions">
          <EditorialShowsRail
            onOpenBooking={handleOpenBooking}
            onPlayVideo={handlePlayVideo}
          />
        </div>
      </main>

      {/* Tasteful Minimalist Footer */}
      <Footer
        onNavigate={handleNavClick}
        onOpenBooking={() => handleOpenBooking()}
        onOpenSchoolBookings={() => setSchoolModalOpen(true)}
        onOpenWatch={() =>
          handlePlayVideo({
            title: "The Last Letter – Official Stage Trailer",
            thumb: "/hero-stage.jpg",
            showTitle: "The Last Letter",
            eventDate: "2026-10-18",
          })
        }
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

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

      {/* Admin Dashboard */}
      {adminModalOpen && (
        <AdminModal
          onClose={() => setAdminModalOpen(false)}
          onToast={showToast}
        />
      )}

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}
