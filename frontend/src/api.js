const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.port === "3000"
    ? "/api"
    : "/api");

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
    // If backend is not started, throw informative error
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error(
        "Cannot reach Voice of Art server. Ensure backend is running (`cd backend && npm start`)."
      );
    }
    throw err;
  }
}

export const api = {
  getShows: () => apiRequest("/shows"),
  getCalendar: (month) => apiRequest(`/calendar?month=${month}`),
  getPaymentMethods: () => apiRequest("/payment-methods"),
  createBooking: (booking) =>
    apiRequest("/bookings", {
      method: "POST",
      body: JSON.stringify(booking),
    }),
  adminLogin: (credentials) =>
    apiRequest("/admin/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  getAdminBookings: (token) =>
    apiRequest("/admin/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateAdminBooking: (id, payload, token) =>
    apiRequest(`/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getAdminSchools: (token) =>
    apiRequest("/admin/schools", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getAdminPaymentMethods: (token) =>
    apiRequest("/admin/payment-methods", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default api;
