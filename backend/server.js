import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { stat, mkdir, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import busboy from "busboy";

const root = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(root, "..", "frontend", "dist");
const dataPath = path.join(root, "data.json");
const uploadsDir = path.join(root, "uploads");
const port = Number(process.env.PORT || 3000);

// Ensure uploads directory exists on every start
await mkdir(uploadsDir, { recursive: true });

// ── Environment secrets ────────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const tokenSecret = process.env.TOKEN_SECRET;
if (!tokenSecret) {
  if (IS_PRODUCTION) {
    console.error("FATAL: TOKEN_SECRET is not set. Refusing to start in production.");
    process.exit(1);
  }
  console.warn("[WARN] TOKEN_SECRET not set — using development placeholder.");
}
const _tokenSecret = tokenSecret || "development-only-change-this-secret";

const adminEmail = process.env.ADMIN_EMAIL || "admin@voiceofart.co.ke";
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  if (IS_PRODUCTION) {
    console.error("FATAL: ADMIN_PASSWORD is not set. Refusing to start in production.");
    process.exit(1);
  }
  console.warn("[WARN] ADMIN_PASSWORD not set — using development placeholder.");
}
const _adminPassword = adminPassword || "dev-change-this-password";

// ── CORS allowlist ─────────────────────────────────────────────────────────
// Expand ALLOWED_ORIGINS env var to allow phone access on local network:
// e.g. ALLOWED_ORIGINS=http://192.168.1.42:3000,http://192.168.1.42:5173
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
]);

const getCorsOrigin = (origin) => {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Allow any local network IP in development (192.168.x.x, 10.x.x.x, 172.x.x.x)
  if (!IS_PRODUCTION && /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin))
    return origin;
  return null;
};

// ── Write mutex ────────────────────────────────────────────────────────────
let _writeLock = Promise.resolve();
const withWriteLock = (fn) => {
  _writeLock = _writeLock.then(fn).catch((err) => {
    console.error("[WriteLock] error:", err);
    throw err;
  });
  return _writeLock;
};

// ── Data helpers ───────────────────────────────────────────────────────────
const loadData = () => JSON.parse(readFileSync(dataPath, "utf8"));
const saveData = (data) =>
  writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
const now = () => new Date().toISOString();
const nextId = (data, collection) => {
  const id = data.nextIds[collection];
  data.nextIds[collection] += 1;
  return id;
};
const validDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// ── CORS-aware JSON response ───────────────────────────────────────────────
const json = (response, status, body, origin) => {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  const allowed = getCorsOrigin(origin);
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = allowed;
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    headers["Vary"] = "Origin";
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
};

// ── Body / auth helpers ────────────────────────────────────────────────────
const readBody = async (request) => {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body too large");
  }
  return body ? JSON.parse(body) : {};
};

const signToken = (payload) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", _tokenSecret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
};

const verifyToken = (request) => {
  const token = (request.headers.authorization || "").replace(/^Bearer /, "");
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  const expected = createHmac("sha256", _tokenSecret).update(encoded).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return false;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  return payload.role === "admin" && payload.exp > Date.now();
};

const requireAdmin = (request, response, origin) => {
  if (!verifyToken(request)) {
    json(response, 401, { error: "Admin authentication required" }, origin);
    return false;
  }
  return true;
};

// ── Allowed media MIME types ───────────────────────────────────────────────
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/3gpp", "video/3gpp2", "video/x-matroska",
]);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

// ── Media upload handler ───────────────────────────────────────────────────
function handleMediaUpload(request, response, origin) {
  const reply = (status, body) => json(response, status, body, origin);

  return new Promise((resolve) => {
    let bb;
    try {
      bb = busboy({ headers: request.headers, limits: { fileSize: MAX_UPLOAD_BYTES } });
    } catch {
      return resolve(reply(400, { error: "Invalid multipart request" }));
    }

    const fields = {};
    let savedFile = null;
    let uploadError = null;

    bb.on("file", (fieldName, stream, info) => {
      const { filename, mimeType } = info;
      const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
      const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);

      if (!isVideo && !isImage) {
        stream.resume();
        uploadError = `File type "${mimeType}" is not supported. Upload MP4, WebM, MOV, JPG, PNG, or WebP.`;
        return;
      }

      // Derive extension from original filename, fallback to MIME type
      const origExt = path.extname(filename || "").toLowerCase();
      const ext = origExt || (isVideo ? ".mp4" : ".jpg");
      const uniqueName = `${randomUUID()}${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);
      const writeStream = createWriteStream(filePath);

      stream.pipe(writeStream);
      savedFile = { uniqueName, filePath, filename: filename || uniqueName, mimeType, mediaType: isVideo ? "video" : "image" };

      stream.on("limit", () => {
        uploadError = "File is too large (maximum 500 MB).";
        stream.destroy();
        writeStream.destroy();
        unlink(filePath).catch(() => {});
        savedFile = null;
      });

      writeStream.on("error", (err) => {
        uploadError = `Could not save file: ${err.message}`;
        savedFile = null;
      });
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("close", () => {
      if (uploadError) return resolve(reply(400, { error: uploadError }));
      if (!savedFile)   return resolve(reply(400, { error: "No file received." }));

      withWriteLock(() => {
        const data = loadData();
        const record = {
          id:           nextId(data, "media"),
          mediaType:    savedFile.mediaType,
          filename:     savedFile.uniqueName,
          originalName: savedFile.filename,
          title:        String(fields.title || savedFile.filename).trim(),
          description:  String(fields.description || "").trim(),
          showTitle:    String(fields.showTitle || "").trim(),
          category:     String(fields.category || (savedFile.mediaType === "video" ? "Live Production" : "Photo")).trim(),
          venue:        String(fields.venue || "").trim(),
          duration:     String(fields.duration || "").trim(),
          eventDate:    validDate(fields.eventDate) ? fields.eventDate : null,
          price:        String(fields.price || "").trim(),
          featured:     fields.featured === "true",
          active:       true,
          createdAt:    now(),
        };
        data.media.push(record);
        saveData(data);
        return resolve(reply(201, record));
      }).catch((err) => resolve(reply(500, { error: `Metadata error: ${err.message}` })));
    });

    bb.on("error", (err) =>
      resolve(reply(500, { error: `Upload error: ${err.message}` }))
    );

    request.pipe(bb);
  });
}

// ── API router ─────────────────────────────────────────────────────────────
function handleApi(request, response, url, origin) {
  const reply = (status, body) => json(response, status, body, origin);

  // ── Public: auth ──────────────────────────────────────────────────────
  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    return readBody(request)
      .then((body) => {
        if (
          String(body.email || "").trim().toLowerCase() !== adminEmail ||
          String(body.password || "") !== _adminPassword
        )
          return reply(401, { error: "Invalid credentials" });
        return reply(200, { token: signToken({ role: "admin", exp: Date.now() + 8 * 60 * 60 * 1000 }) });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // ── Public: shows ─────────────────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/shows") {
    const data = loadData();
    return reply(
      200,
      data.shows
        .filter((s) => s.active)
        .sort((a, b) => String(a.eventDate || "").localeCompare(String(b.eventDate || "")))
    );
  }

  // ── Public: calendar ─────────────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/calendar") {
    const month = url.searchParams.get("month");
    if (!/^\d{4}-\d{2}$/.test(month || ""))
      return reply(400, { error: "month must use YYYY-MM" });
    const data = loadData();
    const bookedDates = data.bookings
      .filter((b) => b.bookingDate.startsWith(`${month}-`) && ["pending", "confirmed"].includes(b.status))
      .map((b) => b.bookingDate);
    return reply(200, { month, bookedDates });
  }

  // ── Public: payment methods ───────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/payment-methods") {
    const data = loadData();
    return reply(200, data.paymentMethods.filter((m) => m.active));
  }

  // ── Public: media library ─────────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/media") {
    const data = loadData();
    let items = (data.media || []).filter((m) => m.active);
    const type = url.searchParams.get("type");
    const featured = url.searchParams.get("featured");
    if (type)     items = items.filter((m) => m.mediaType === type);
    if (featured) items = items.filter((m) => m.featured === (featured === "true"));
    // Newest first
    return reply(200, items.slice().reverse());
  }

  // ── Public: bookings ──────────────────────────────────────────────────
  if (request.method === "POST" && url.pathname === "/api/bookings") {
    return readBody(request)
      .then((body) => {
        const required = ["schoolName", "contactName", "email", "phone", "bookingDate"];
        if (required.some((f) => !String(body[f] || "").trim()) || !validDate(body.bookingDate))
          return reply(400, { error: "schoolName, contactName, email, phone and a valid bookingDate are required" });
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(String(body.email || "").trim()))
          return reply(400, { error: "A valid email address is required" });
        return withWriteLock(() => {
          const data = loadData();
          if (data.bookings.some((b) => b.bookingDate === body.bookingDate && ["pending", "confirmed"].includes(b.status)))
            return reply(409, { error: "That date is already booked" });
          const booking = {
            id: nextId(data, "bookings"), schoolId: null,
            schoolName: body.schoolName.trim(), contactName: body.contactName.trim(),
            email: body.email.trim(), phone: body.phone.trim(),
            bookingDate: body.bookingDate, status: "pending",
            notes: String(body.notes || "").trim(), createdAt: now(),
          };
          data.bookings.push(booking);
          saveData(data);
          return reply(201, { id: booking.id, status: booking.status });
        });
      })
      .catch(() => reply(400, { error: "Invalid request" }));
  }

  // ── Admin routes (all require auth) ───────────────────────────────────
  if (!url.pathname.startsWith("/api/admin/"))
    return reply(404, { error: "API route not found" });
  if (!requireAdmin(request, response, origin)) return;

  // Admin: upload media
  if (request.method === "POST" && url.pathname === "/api/admin/media")
    return handleMediaUpload(request, response, origin);

  const data = loadData();

  // Admin: list all media
  if (request.method === "GET" && url.pathname === "/api/admin/media")
    return reply(200, (data.media || []).slice().reverse());

  // Admin: delete media
  const mediaMatch = url.pathname.match(/^\/api\/admin\/media\/(\d+)$/);
  if (request.method === "DELETE" && mediaMatch) {
    return withWriteLock(async () => {
      const d = loadData();
      const idx = (d.media || []).findIndex((m) => m.id === Number(mediaMatch[1]));
      if (idx === -1) return reply(404, { error: "Media not found" });
      const [removed] = d.media.splice(idx, 1);
      saveData(d);
      // Delete the file from disk (best-effort)
      unlink(path.join(uploadsDir, removed.filename)).catch(() => {});
      return reply(200, { deleted: true, id: removed.id });
    });
  }

  // Admin: update media (toggle active / featured / update metadata)
  if (request.method === "PATCH" && mediaMatch) {
    return readBody(request)
      .then((body) =>
        withWriteLock(() => {
          const d = loadData();
          const item = (d.media || []).find((m) => m.id === Number(mediaMatch[1]));
          if (!item) return reply(404, { error: "Media not found" });
          for (const f of ["title", "description", "showTitle", "category", "venue", "duration", "price"])
            if (body[f] !== undefined) item[f] = String(body[f]);
          if (typeof body.active   === "boolean") item.active   = body.active;
          if (typeof body.featured === "boolean") item.featured = body.featured;
          if (body.eventDate !== undefined)
            item.eventDate = validDate(body.eventDate) ? body.eventDate : null;
          saveData(d);
          return reply(200, item);
        })
      )
      .catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // Admin: bookings
  if (request.method === "GET" && url.pathname === "/api/admin/bookings")
    return reply(200, data.bookings);
  if (request.method === "GET" && url.pathname === "/api/admin/schools")
    return reply(200, data.schools);
  if (request.method === "GET" && url.pathname === "/api/admin/payment-methods")
    return reply(200, data.paymentMethods);

  const bookingMatch = url.pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
  if (request.method === "PATCH" && bookingMatch)
    return readBody(request)
      .then((body) => {
        if (!["pending", "confirmed", "cancelled"].includes(body.status))
          return reply(400, { error: "status must be pending, confirmed or cancelled" });
        return withWriteLock(() => {
          const d = loadData();
          const booking = d.bookings.find((b) => b.id === Number(bookingMatch[1]));
          if (!booking) return reply(404, { error: "Booking not found" });
          booking.status = body.status;
          saveData(d);
          return reply(200, booking);
        });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));

  if (request.method === "POST" && url.pathname === "/api/admin/schools")
    return readBody(request)
      .then((body) => {
        if ([body.name, body.contactName, body.email, body.phone].some((f) => !String(f || "").trim()))
          return reply(400, { error: "name, contactName, email and phone are required" });
        return withWriteLock(() => {
          const d = loadData();
          const school = {
            id: nextId(d, "schools"), name: body.name.trim(),
            contactName: body.contactName.trim(), email: body.email.trim(),
            phone: body.phone.trim(), address: String(body.address || "").trim(), createdAt: now(),
          };
          d.schools.push(school);
          saveData(d);
          return reply(201, school);
        });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));

  if (request.method === "POST" && url.pathname === "/api/admin/shows")
    return readBody(request)
      .then((body) => {
        if ([body.title, body.description].some((f) => !String(f || "").trim()))
          return reply(400, { error: "title and description are required" });
        return withWriteLock(() => {
          const d = loadData();
          const show = {
            id: nextId(d, "shows"), title: body.title.trim(),
            category: String(body.category || "Live production").trim(),
            description: body.description.trim(), venue: String(body.venue || "").trim(),
            eventDate: validDate(body.eventDate) ? body.eventDate : null,
            price: String(body.price || "").trim(), posterClass: String(body.posterClass || "").trim(),
            active: true, createdAt: now(),
          };
          d.shows.push(show);
          saveData(d);
          return reply(201, show);
        });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));

  const showMatch = url.pathname.match(/^\/api\/admin\/shows\/(\d+)$/);
  if (request.method === "PATCH" && showMatch)
    return readBody(request)
      .then((body) =>
        withWriteLock(() => {
          const d = loadData();
          const show = d.shows.find((s) => s.id === Number(showMatch[1]));
          if (!show) return reply(404, { error: "Show not found" });
          for (const f of ["title", "category", "description", "venue", "price", "posterClass"])
            if (body[f] !== undefined) show[f] = String(body[f]);
          if (body.eventDate !== undefined)
            show.eventDate = validDate(body.eventDate) ? body.eventDate : null;
          if (typeof body.active === "boolean") show.active = body.active;
          saveData(d);
          return reply(200, show);
        })
      )
      .catch(() => reply(400, { error: "Invalid JSON body" }));

  if (request.method === "POST" && url.pathname === "/api/admin/payment-methods")
    return readBody(request)
      .then((body) => {
        if ([body.name, body.provider, body.accountReference].some((f) => !String(f || "").trim()))
          return reply(400, { error: "name, provider and accountReference are required" });
        return withWriteLock(() => {
          const d = loadData();
          const method = {
            id: nextId(d, "paymentMethods"), name: body.name.trim(),
            provider: body.provider.trim(), accountReference: body.accountReference.trim(),
            instructions: String(body.instructions || "").trim(), active: true, createdAt: now(),
          };
          d.paymentMethods.push(method);
          saveData(d);
          return reply(201, method);
        });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));

  return reply(404, { error: "Admin route not found" });
}

// ── Static file serving ────────────────────────────────────────────────────
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".svg":  "image/svg+xml",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".ogg":  "video/ogg",
  ".mov":  "video/quicktime",
  ".avi":  "video/x-msvideo",
  ".mkv":  "video/x-matroska",
  ".3gp":  "video/3gpp",
};

async function serveUpload(response, filename) {
  const filePath = path.resolve(uploadsDir, filename);
  // Path traversal guard
  if (!filePath.startsWith(path.resolve(uploadsDir))) {
    response.writeHead(403); response.end(); return;
  }
  if (!existsSync(filePath) || !(await stat(filePath)).isFile()) {
    response.writeHead(404); response.end(); return;
  }
  const fileStat = await stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  // Support range requests so <video> seeking works on mobile
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": fileStat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000",
  });
  createReadStream(filePath).pipe(response);
}

async function serveFrontend(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(frontendRoot, `.${requested}`);
  if (
    !filePath.startsWith(path.resolve(frontendRoot)) ||
    !existsSync(filePath) ||
    !(await stat(filePath)).isFile()
  ) {
    // SPA fallback — serve index.html for client-side routes
    const indexPath = path.join(frontendRoot, "index.html");
    if (existsSync(indexPath)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      createReadStream(indexPath).pipe(response);
      return;
    }
    response.writeHead(404); response.end("Not found"); return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

// ── HTTP server ────────────────────────────────────────────────────────────
const server = createServer(async (request, response) => {
  const origin = request.headers.origin || null;
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") return json(response, 204, {}, origin);

  try {
    if (url.pathname.startsWith("/api/"))
      return handleApi(request, response, url, origin);

    // Serve uploaded media files
    if (url.pathname.startsWith("/uploads/")) {
      const filename = path.basename(url.pathname);
      return serveUpload(response, filename);
    }

    return serveFrontend(response, url.pathname);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Internal server error" }, origin);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
    process.exitCode = 1; return;
  }
  console.error(error);
  process.exitCode = 1;
});

server.listen(port, "0.0.0.0", () => {
  console.log(`\n🎭 Voice of Art server running`);
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://<your-local-ip>:${port}  ← open this on your phone\n`);
});
