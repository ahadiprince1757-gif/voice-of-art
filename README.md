# Voice of Art 🎭

A modern, responsive full-stack platform for **Voice of Art** performing arts & education.

## Overview

Voice of Art provides live theater production highlights, ticket reservations with mobile payment options, an educational school calendar, an on-demand video showcase platform ("Voice of Art Watch"), and an administrative management dashboard.

## Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS with custom design tokens, Lucide Icons
- **Backend**: Node.js, Express, File-backed JSON data store / REST API

## Project Structure

```text
Voice of art/
├── frontend/             # React + Vite application
│   ├── src/              # Components, contexts, styles, and views
│   └── vite.config.js    # Vite configuration & API proxy
├── backend/              # Node.js + Express REST API
│   ├── server.js         # API server
│   └── data/             # Data models and seed items
├── package.json          # Workspace root scripts
├── .gitignore            # Git ignore rules
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

### Running Locally

From the root directory:

- Run the frontend development server:
  ```bash
  npm run dev
  ```
- Run the backend API server:
  ```bash
  npm run backend
  ```
