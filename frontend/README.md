# Voice of Art - React Web Application

A modern, responsive React web application built with **React 19**, **Vite**, and custom design tokens for the **Voice of Art** performing arts & education platform.

---

## 🎨 Features & Architecture

- **Interactive Hero & Navigation**: Smooth navigation with quick links, mobile hamburger drawer, and category browsing.
- **Production Show Highlights**:
  - Live filtering by category (Drama, Music, Poetry, Dance, All).
  - Search query integration.
  - Interactive show cards displaying venue, dates, pricing, and live seat availability badges.
- **Ticket Booking Modal**:
  - Live seat count calculation and price tallying in KES.
  - Mobile payment integration (M-Pesa Express, Airtel Money, Card) with direct phone input and reference tracking.
  - Instant booking confirmation and toast alerts.
- **School Calendar**:
  - Educational showcase terms (Term 1, Term 2, Term 3).
  - Interactive school booking requests with customized student group sizes.
- **Voice of Art Watch (Video Platform)**:
  - Curated streaming previews of past productions and rehearsals.
  - Built-in video player modal with custom playback controls and responsive embedding.
- **Admin Management Portal**:
  - Secure session token authentication.
  - Tabbed dashboard for managing Shows, Bookings, Calendar Entries, and Payment Configuration.
  - Add / edit / delete capabilities synced with the Node.js backend.
- **Toast Notification Engine**: Non-intrusive feedback for user actions and network responses.

---

## 📁 Project Structure

```
frontend/
├── index.html                 # HTML shell with Google Fonts (Playfair Display & DM Sans)
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration with /api reverse proxy to :3000
└── src/
    ├── main.jsx               # React entry point
    ├── App.jsx                # Core application orchestrator and modal manager
    ├── index.css              # Custom design system (glassmorphism, typography, colors)
    ├── api.js                 # API abstraction client with fallback mock datasets
    └── components/
        ├── Navbar.jsx         # Header & navigation with mobile drawer
        ├── Hero.jsx           # Hero spotlight banner
        ├── ShowsSection.jsx   # Productions gallery with filter pills & search
        ├── BookingModal.jsx   # Interactive ticket reservation & checkout flow
        ├── SchoolCalendar.jsx # Educational term dates & school bookings
        ├── WatchSection.jsx   # Curated performance video player hub
        ├── VideoPlayerModal.jsx # Video playback modal
        ├── AdminModal.jsx     # Full administrative portal
        ├── Toast.jsx          # Notification toasts
        ├── Footer.jsx         # Platform footer & social links
        └── Icons.jsx          # Lightweight SVG icons
```

---

## 🚀 Getting Started

### 1. Development Mode (with Hot Module Replacement)
To run the Vite frontend development server:
```bash
npm run dev
# or from root: npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser. Requests to `/api/*` are automatically proxied to the backend on `http://localhost:3000`.

### 2. Backend Server
To start the backend API:
```bash
cd backend
node server.js
# or from root: npm run backend
```
The backend API runs on **[http://localhost:3000](http://localhost:3000)**.

### 3. Production Build
To create an optimized production bundle:
```bash
npm run build
# or from root: npm run build
```
The output is generated in `frontend/dist/`. The backend server serves this directory directly when you access `http://localhost:3000/`.
