import React, { useState, useEffect } from "react";
import api from "../api";
import { ChevronLeft, ChevronRight, CalendarIcon, SchoolIcon, CheckIcon } from "./Icons";

export default function SchoolCalendar({ onOpenBooking, onToast }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // Default Oct 2026 or current
  const [bookedDates, setBookedDates] = useState(
    new Set(["2026-10-18", "2026-11-02", "2026-11-14", "2026-12-05"])
  );
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthTitle = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  // Load calendar availability from API
  useEffect(() => {
    let active = true;
    setLoading(true);

    api
      .getCalendar(monthKey)
      .then((data) => {
        if (active && data && Array.isArray(data.bookedDates)) {
          setBookedDates(new Set(data.bookedDates));
        }
      })
      .catch((err) => {
        // Fallback default booked dates
        console.warn("Using default calendar dates:", err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [monthKey]);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const handleSelectDate = (dateKey) => {
    if (bookedDates.has(dateKey)) return;
    setSelectedDate(dateKey);
    onToast(`Selected ${dateKey} for school performance.`);
  };

  const handleRequestBooking = () => {
    if (!selectedDate) {
      onToast("Please select an available calendar date first.", "error");
      return;
    }
    onOpenBooking(null, selectedDate);
  };

  // Generate days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysSpacers = Array.from({ length: firstDayIndex });
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <section id="schools" className="section blue-theme-section">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <SchoolIcon size={16} />
              <span>02 / School & Outreach Performances</span>
            </div>
            <h2 className="section-title font-serif">Bring the stage to your school.</h2>
          </div>
          <p className="section-desc">
            Check our live tour calendar and choose an available date for Voice of Art Productions to
            bring a live performance and workshop to your school institution.
          </p>
        </div>

        <div className="calendar-layout">
          <div className="calendar-panel">
            <div className="calendar-header">
              <button
                className="calendar-nav-btn"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>

              <h3 className="calendar-month-title font-serif">{monthTitle}</h3>

              <button
                className="calendar-nav-btn"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="calendar-weekdays">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="calendar-grid">
              {daysSpacers.map((_, i) => (
                <div key={`spacer-${i}`} className="calendar-day-spacer" />
              ))}

              {monthDays.map((day) => {
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isBooked = bookedDates.has(dateKey);
                const isSelected = selectedDate === dateKey;

                let classes = "calendar-day-btn";
                if (isBooked) classes += " booked";
                else classes += " available";
                if (isSelected) classes += " selected";

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={classes}
                    disabled={isBooked}
                    onClick={() => handleSelectDate(dateKey)}
                    title={isBooked ? `${dateKey} (Already Reserved)` : `${dateKey} (Available)`}
                  >
                    <span>{day}</span>
                    {isBooked ? (
                      <span className="booked-tick">✓</span>
                    ) : isSelected ? (
                      <span style={{ fontSize: "0.6rem" }}>●</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-pill avail"></span>
                <span>Available Date</span>
              </div>
              <div className="legend-item">
                <span className="legend-pill res"></span>
                <span>Reserved by School (✓)</span>
              </div>
              <div className="legend-item">
                <span className="legend-pill sel"></span>
                <span>Your Selection</span>
              </div>
            </div>
          </div>

          <aside className="booking-note-card">
            <span className="note-badge">Host a Performance</span>
            <h3 className="note-title font-serif">Reserve a date for your institution.</h3>
            <p className="note-p">
              We bring complete stage lighting, sound, seasoned young Kenyan actors, and engaging post-show
              theatrical discussions for students.
            </p>

            <div className="selected-date-preview">
              <CalendarIcon size={20} />
              <span>
                {selectedDate
                  ? new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(
                      new Date(`${selectedDate}T12:00:00`)
                    )
                  : "Click an available day on the calendar"}
              </span>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px", marginTop: "12px" }}
              onClick={handleRequestBooking}
              disabled={!selectedDate}
            >
              <SchoolIcon size={18} />
              <span>Request Booking for This Date →</span>
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
