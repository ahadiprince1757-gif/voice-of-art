import React, { useState, useEffect } from "react";
import api from "../api";
import { XIcon, TicketIcon, CheckIcon } from "./Icons";

export default function BookingModal({ initialShow, initialDate, onClose, onSuccess, onToast }) {
  const [showTitle, setShowTitle] = useState(initialShow || "The Last Letter");
  const [bookingDate, setBookingDate] = useState(initialDate || "2026-10-18");
  const [tickets, setTickets] = useState("2 tickets");
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    if (initialShow) setShowTitle(initialShow);
    if (initialDate) setBookingDate(initialDate);
  }, [initialShow, initialDate]);

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
    if (!contactName.trim() || !email.trim() || !phone.trim()) {
      onToast("Please complete your contact name, email and phone number.", "error");
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
      onToast("🎉 Booking request received! We will contact you shortly.");
      onSuccess();
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: "6px" }}>Reserve Your Seat</div>
            <h3 className="font-serif">Book a show.</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <XIcon size={18} />
          </button>
        </div>

        {paymentInfo && (
          <div className="payment-badge-box">
            <CheckIcon size={18} />
            <div>
              <strong>Official {paymentInfo.name} ({paymentInfo.provider})</strong>
              <div style={{ fontSize: "0.78rem", color: "#047857" }}>
                Paybill / Ref: {paymentInfo.accountReference} — payment instructions confirmed upon booking.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">SELECT PRODUCTION</label>
            <select
              className="form-select"
              value={showTitle}
              onChange={(e) => setShowTitle(e.target.value)}
            >
              <option value="The Last Letter">The Last Letter (Nairobi • From KSh 500)</option>
              <option value="Behind the Mask">Behind the Mask (KU • From KSh 400)</option>
              <option value="New Voices">New Voices (Upcoming Showcase)</option>
              <option value="School Stage Visit">School Stage Visit (Custom Performance)</option>
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
              <label className="form-label">TICKETS / AUDIENCE</label>
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
            <label className="form-label">INSTITUTION / SCHOOL NAME</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Nairobi School / Individual attendee"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">CONTACT FULL NAME *</label>
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
              <label className="form-label">PHONE / WHATSAPP *</label>
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

          <div className="form-help">
            After submitting, our production coordinator will contact you via WhatsApp / Phone to confirm
            ticket allocation and payment reference.
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "1rem" }}
            disabled={isSubmitting}
          >
            <TicketIcon size={18} />
            <span>{isSubmitting ? "Submitting request..." : "Request booking →"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
