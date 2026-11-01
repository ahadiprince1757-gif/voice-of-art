import React, { useState, useEffect } from "react";
import api from "../api";
import { useShows } from "../hooks/useShows";
import { CloseIcon, TicketIcon, CheckIcon } from "./Icons";

export default function BookingModal({ initialShow, initialDate, onClose, onToast }) {
  const [showTitle, setShowTitle] = useState(initialShow || "");
  const [bookingDate, setBookingDate] = useState(initialDate || "");
  const [tickets, setTickets] = useState("2 tickets");
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  // Fetch live shows list for the dropdown
  const { shows: availableShows, loading: showsLoading } = useShows();

  // When parent opens modal with specific show/date, sync them
  useEffect(() => {
    if (initialShow) setShowTitle(initialShow);
    if (initialDate) setBookingDate(initialDate);
  }, [initialShow, initialDate]);

  // When shows load, set a default selection if none is pre-selected
  useEffect(() => {
    if (!showTitle && availableShows.length > 0) {
      setShowTitle(availableShows[0].title);
    }
  }, [availableShows, showTitle]);

  useEffect(() => {
    api
      .getPaymentMethods()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPaymentInfo(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field presence checks
    if (!contactName.trim() || !email.trim() || !phone.trim()) {
      onToast("Please complete your contact name, email and phone number.", "error");
      return;
    }

    // Email format check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      onToast("Please enter a valid email address.", "error");
      return;
    }

    // Phone minimum length
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 9) {
      onToast("Please enter a valid phone number (at least 9 digits).", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        showTitle,
        bookingDate,
        tickets,
        schoolName: schoolName.trim() || "General Audience",
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      };

      await api.createBooking(payload);
      onToast("Booking request received! Our team will contact you shortly.");
      onClose();
    } catch (err) {
      console.error(err);
      onToast(err.message || "Failed to submit booking request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content-booking"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ticket Header Banner */}
        <div className="modal-head">
          <div>
            <div className="booking-eyebrow">STAGE TICKETING & RESERVATIONS</div>
            <h3 className="font-serif booking-title">Reserve Your Seats</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {paymentInfo && (
          <div className="payment-badge-box">
            <CheckIcon size={16} />
            <div>
              <strong>Official {paymentInfo.name} ({paymentInfo.provider})</strong>
              <div className="payment-badge-sub">
                Paybill / Ref: {paymentInfo.accountReference} — instant seat confirmation upon booking.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-field">
            <label className="form-label">SELECT PRODUCTION</label>
            <select
              className="form-select"
              value={showTitle}
              onChange={(e) => setShowTitle(e.target.value)}
              disabled={showsLoading}
            >
              {showsLoading && (
                <option value="">Loading productions...</option>
              )}
              {!showsLoading && availableShows.length > 0
                ? availableShows.map((show) => (
                    <option key={show.id} value={show.title}>
                      {show.title}
                      {show.venue ? ` — ${show.venue}` : ""}
                      {show.price ? ` (${show.price})` : ""}
                    </option>
                  ))
                : !showsLoading && (
                    <>
                      <option value="The Last Letter">The Last Letter (Nairobi • From KSh 500)</option>
                      <option value="Behind the Mask">Behind the Mask (KU • From KSh 400)</option>
                      <option value="New Voices">New Voices (Upcoming Showcase)</option>
                      <option value="School Stage Visit">School Stage Visit (Custom Performance)</option>
                    </>
                  )
              }
            </select>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">PERFORMANCE DATE</label>
              <input
                type="date"
                className="form-input"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">TICKETS COUNT</label>
              <select
                className="form-select"
                value={tickets}
                onChange={(e) => setTickets(e.target.value)}
              >
                <option value="1 ticket">1 ticket</option>
                <option value="2 tickets">2 tickets</option>
                <option value="3 tickets">3 tickets</option>
                <option value="4 tickets">4 tickets</option>
                <option value="5 tickets">5 tickets</option>
                <option value="10 tickets (Group)">10 tickets (Group)</option>
                <option value="School Delegation (50+)">School Delegation (50+ students)</option>
                <option value="Full School Auditorium">Full School Auditorium (200+ students)</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">INSTITUTION OR SCHOOL (OPTIONAL)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Individual / School / Group"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">FULL NAME *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Your full name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">EMAIL ADDRESS *</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">PHONE / MPESA NUMBER *</label>
              <input
                type="tel"
                required
                className="form-input"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="booking-submit-btn"
            disabled={isSubmitting}
          >
            <TicketIcon size={18} />
            <span>{isSubmitting ? "Processing Reservation..." : "Confirm Ticket Request"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
