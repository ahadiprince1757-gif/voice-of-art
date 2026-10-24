import React, { useState, useEffect } from "react";
import api from "../api";
import MediaManager from "./MediaManager";
import { XIcon, ShieldLockIcon, CheckIcon, SchoolIcon } from "./Icons";

export default function AdminModal({ onClose, onToast }) {
  const [token, setToken] = useState(() => localStorage.getItem("voa_admin_token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [schools, setSchools] = useState([]);
  const [activeTab, setActiveTab] = useState("bookings");
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (token) {
      loadAdminData(token);
    }
  }, [token]);

  const loadAdminData = async (authToken) => {
    setIsLoadingData(true);
    try {
      const [bookingsData, schoolsData] = await Promise.allSettled([
        api.getAdminBookings(authToken),
        api.getAdminSchools(authToken),
      ]);

      if (bookingsData.status === "fulfilled") {
        setBookings(bookingsData.value || []);
      }
      if (schoolsData.status === "fulfilled") {
        setSchools(schoolsData.value || []);
      }
    } catch (err) {
      console.error(err);
      onToast("Session expired or invalid. Please sign in again.", "error");
      handleLogout();
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await api.adminLogin({ email, password });
      if (res && res.token) {
        setToken(res.token);
        localStorage.setItem("voa_admin_token", res.token);
        onToast("✅ Admin login successful!");
      }
    } catch (err) {
      onToast(err.message || "Invalid credentials", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("voa_admin_token");
    setBookings([]);
    setSchools([]);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.updateAdminBooking(id, { status: newStatus }, token);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      onToast(`Updated booking #${id} to ${newStatus}`);
    } catch (err) {
      onToast(err.message || "Failed to update booking status", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldLockIcon size={24} />
            <div>
              <div className="eyebrow" style={{ marginBottom: "2px" }}>Management Console</div>
              <h3 className="font-serif">Voice of Art Admin</h3>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <XIcon size={18} />
          </button>
        </div>

        {!token ? (
          <form onSubmit={handleLogin} style={{ maxWidth: "420px", margin: "10px auto" }}>
            <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: "20px" }}>
              Sign in with administrative privileges to manage show bookings, school performances, and schedules.
            </p>

            <div className="form-field">
              <label className="form-label">ADMIN EMAIL</label>
              <input
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">PASSWORD</label>
              <input
                type="password"
                className="form-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "12px", padding: "13px" }}
              disabled={isLoggingIn}
            >
              <span>{isLoggingIn ? "Verifying..." : "Sign In to Admin Console"}</span>
            </button>
          </form>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className={`btn ${activeTab === "bookings" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  onClick={() => setActiveTab("bookings")}
                >
                  Bookings ({bookings.length})
                </button>
                <button
                  className={`btn ${activeTab === "schools" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  onClick={() => setActiveTab("schools")}
                >
                  Schools ({schools.length})
                </button>
                <button
                  className={`btn ${activeTab === "media" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  onClick={() => setActiveTab("media")}
                >
                  🎬 Media
                </button>
              </div>

              <button
                className="btn btn-secondary"
                style={{ padding: "6px 14px", fontSize: "0.82rem", color: "#ef4444" }}
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>

            {isLoadingData ? (
              <p style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading database records...</p>
            ) : activeTab === "media" ? (
              <MediaManager token={token} onToast={onToast} />
            ) : activeTab === "bookings" ? (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>School / Attendee</th>
                      <th>Contact</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                          No bookings found yet.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => (
                        <tr key={b.id}>
                          <td>#{b.id}</td>
                          <td>
                            <strong>{b.schoolName}</strong>
                            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{b.notes || "General show"}</div>
                          </td>
                          <td>
                            <div>{b.contactName}</div>
                            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{b.phone} • {b.email}</div>
                          </td>
                          <td>{b.bookingDate}</td>
                          <td>
                            <span className={`status-badge ${b.status || "confirmed"}`}>
                              {b.status || "confirmed"}
                            </span>
                          </td>
                          <td>
                            <select
                              value={b.status || "confirmed"}
                              onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "0.78rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                            >
                              <option value="confirmed">Confirm</option>
                              <option value="pending">Pending</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>School Name</th>
                      <th>Contact Person</th>
                      <th>Email / Phone</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                          No schools registered yet.
                        </td>
                      </tr>
                    ) : schools.map((s) => (
                      <tr key={s.id}>
                        <td>#{s.id}</td>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.contactName}</td>
                        <td>{s.email}<br />{s.phone}</td>
                        <td>{s.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
