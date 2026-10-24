# 🎭 Voice of Art Productions

A full-stack web platform for a Kenyan live theatre company — book shows, watch stage videos, manage the media library from your phone, and administer bookings via a secure dashboard.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js HTTP server (zero framework) |
| Database | JSON flat-file (`data.json`) with write mutex |
| Auth | HMAC-SHA256 signed tokens |
| File uploads | `busboy` multipart streaming |
| Styling | Vanilla CSS with design tokens |

## Features

### Public
- **Hero slider** — auto-advances through featured uploaded videos
- **Watch feed** — real video player with category filtering, likes, comments, and share
- **Shows rail** — live API-driven production cards with tab and search filtering
- **Booking form** — school tour / ticket reservation with M-Pesa reference
- **School calendar** — interactive date availability checker

### Admin (protected)
- **Bookings** — view, confirm, and cancel all bookings
- **Schools** — registered school directory
- **🎬 Media** — upload videos and images directly from your phone:
  - "Choose from Gallery" — pick any video or photo
  - "Record Video Now" — open phone camera directly
  - Real upload progress bar (not simulated)
  - Feature flag — mark items to appear in the hero carousel
  - Delete files from server

## Getting Started

### Prerequisites
- Node.js 18+

### 1. Clone and install

```bash
git clone https://github.com/ahadiprince1757-gif/voice-of-art.git
cd voice-of-art

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD and TOKEN_SECRET
```

Generate a secure TOKEN_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Run in development

```bash
# Terminal 1 — backend API server (port 3000)
cd backend
npm start

# Terminal 2 — Vite dev server (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Access from your phone (same Wi-Fi)

The backend binds to `0.0.0.0` so any device on your network can reach it.
Find your computer's local IP, then open:

```
http://<your-local-ip>:3000
```

To upload videos directly from your phone, go to **Admin Portal → 🎬 Media → ＋ Upload**.

## Uploading Videos

1. Open the app on your phone (use the local IP URL above)
2. Tap **Admin Portal** in the footer
3. Log in with your admin credentials
4. Go to the **🎬 Media** tab
5. Tap **＋ Upload**
6. Choose **"Choose from Gallery"** or **"Record Video Now"**
7. Fill in the title and details
8. Tap **"⬆ Upload to Voice of Art"**

Uploaded videos appear immediately in the watch feed and hero section.

## Deployment

### Environment variables (required in production)

| Variable | Description |
|---|---|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password (strong, unique) |
| `TOKEN_SECRET` | 64-char hex string for signing auth tokens |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Set to `production` to enforce required env vars |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

The server **refuses to start** in production if `ADMIN_PASSWORD` or `TOKEN_SECRET` are missing.

### Build frontend for production

```bash
cd frontend
npm run build
# Output goes to frontend/dist/ — served automatically by the backend
```

## Project Structure

```
voice-of-art/
├── backend/
│   ├── server.js          # HTTP server, API routes, file upload
│   ├── data.json          # Flat-file database
│   ├── uploads/           # Uploaded media files (gitignored)
│   └── .env.example       # Environment variable template
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js          # API client (fetch + XHR for uploads)
        ├── hooks/
        │   └── useShows.js # Shared shows data hook
        └── components/
            ├── MediaManager.jsx       # Upload interface
            ├── EditorialHeroSection.jsx
            ├── StageWatchFeed.jsx
            ├── EditorialShowsRail.jsx
            ├── BookingModal.jsx
            ├── AdminModal.jsx
            └── ...
```

## Security notes

- Admin credentials live in environment variables only — never hardcoded
- All write operations go through a mutex to prevent concurrent corruption
- CORS is locked to an explicit allowlist (localhost + `ALLOWED_ORIGINS` env var)
- Auth tokens use timing-safe comparison to prevent timing attacks
- Uploaded file paths are validated against the uploads directory to prevent traversal
