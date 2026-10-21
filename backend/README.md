# Voice of Art backend

This backend stores schools, bookings, shows, and payment methods in `backend/data.json`. The JSON file is server-side storage and is never sent to the browser as a database.

Frontend API calls live in `frontend/api.js`. UI behavior lives in `frontend/script.js`. Admin credentials come from environment variables, while admins can change live content through protected API routes.

## Run it

From the `backend` folder:

```powershell
$env:ADMIN_PASSWORD = "use-a-real-password"
$env:TOKEN_SECRET = "use-a-long-random-secret"
npm start
```

Open `http://localhost:3000/`. The frontend automatically uses the API when served by this server. When opened directly as a local file, it requests the API at `http://localhost:3000/api`.

## API shape

Public reads:

- `GET /api/shows`
- `GET /api/calendar?month=YYYY-MM`
- `GET /api/payment-methods`
- `POST /api/bookings`

Admin login and protected management:

- `POST /api/admin/login`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings/:id`
- `GET /api/admin/schools`
- `POST /api/admin/schools`
- `GET /api/admin/payment-methods`
- `POST /api/admin/payment-methods`
- `POST /api/admin/shows`
- `PATCH /api/admin/shows/:id`

All `/api/admin/*` routes require the bearer token returned by admin login. Do not use the development fallback credentials in production; set `ADMIN_PASSWORD` and `TOKEN_SECRET` before starting the server.
