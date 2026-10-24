// VITE_API_URL can be set in .env.local to point at a remote server.
// In production the bundle is served from the same origin so /api is correct.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    let data;

    if (contentType.includes("application/json") && body) {
      data = JSON.parse(body);
    } else {
      data = { raw: body };
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error(
        "Cannot reach Voice of Art server. Ensure the backend is running (`cd backend && npm start`)."
      );
    }
    throw err;
  }
}

/**
 * Upload a media file with real progress tracking.
 * Uses XMLHttpRequest because fetch does not expose upload progress events.
 * @param {FormData} formData
 * @param {string}   token      Admin JWT
 * @param {Function} onProgress Called with 0–100 as the upload progresses
 */
function uploadMedia(formData, token, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/admin/media`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error — check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("Upload timed out — the file may be too large."));
    xhr.timeout = 30 * 60 * 1000; // 30-minute timeout for large video files

    xhr.send(formData);
  });
}

export const api = {
  // ── Shows ────────────────────────────────────────────────────────────────
  getShows: () => apiRequest("/shows"),

  // ── Calendar ─────────────────────────────────────────────────────────────
  getCalendar: (month) => apiRequest(`/calendar?month=${month}`),

  // ── Payment methods ───────────────────────────────────────────────────────
  getPaymentMethods: () => apiRequest("/payment-methods"),

  // ── Bookings ──────────────────────────────────────────────────────────────
  createBooking: (booking) =>
    apiRequest("/bookings", { method: "POST", body: JSON.stringify(booking) }),

  // ── Public media library ──────────────────────────────────────────────────
  getMedia: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
    ).toString();
    return apiRequest(`/media${qs ? `?${qs}` : ""}`);
  },

  // ── Admin auth ────────────────────────────────────────────────────────────
  adminLogin: (credentials) =>
    apiRequest("/admin/login", { method: "POST", body: JSON.stringify(credentials) }),

  // ── Admin bookings ────────────────────────────────────────────────────────
  getAdminBookings: (token) =>
    apiRequest("/admin/bookings", { headers: { Authorization: `Bearer ${token}` } }),
  updateAdminBooking: (id, payload, token) =>
    apiRequest(`/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  // ── Admin schools ─────────────────────────────────────────────────────────
  getAdminSchools: (token) =>
    apiRequest("/admin/schools", { headers: { Authorization: `Bearer ${token}` } }),

  // ── Admin payment methods ─────────────────────────────────────────────────
  getAdminPaymentMethods: (token) =>
    apiRequest("/admin/payment-methods", { headers: { Authorization: `Bearer ${token}` } }),

  // ── Admin media ───────────────────────────────────────────────────────────
  getAdminMedia: (token) =>
    apiRequest("/admin/media", { headers: { Authorization: `Bearer ${token}` } }),

  uploadMedia,

  updateMedia: (id, payload, token) =>
    apiRequest(`/admin/media/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  deleteMedia: (id, token) =>
    apiRequest(`/admin/media/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default api;
