import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import busboy from "busboy";
import { createClient } from "@supabase/supabase-js";

const root         = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(root, "..", "frontend", "dist");
const port         = Number(process.env.PORT || 3000);

// ── Environment secrets ────────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Legacy HMAC token secret (kept for backward-compat during transition)
const tokenSecret = process.env.TOKEN_SECRET;
if (!tokenSecret) {
  if (IS_PRODUCTION) {
    console.error("FATAL: TOKEN_SECRET is not set. Refusing to start in production.");
    process.exit(1);
  }
  console.warn("[WARN] TOKEN_SECRET not set — using development placeholder.");
}
const _tokenSecret = tokenSecret || "development-only-change-this-secret";

const adminEmail    = process.env.ADMIN_EMAIL    || "admin@voiceofart.co.ke";
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  if (IS_PRODUCTION) {
    console.error("FATAL: ADMIN_PASSWORD is not set. Refusing to start in production.");
    process.exit(1);
  }
  console.warn("[WARN] ADMIN_PASSWORD not set — using development placeholder.");
}
const _adminPassword = adminPassword || "dev-change-this-password";

// Supabase (service role — backend only, never sent to browser)
const supabaseUrl         = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRole) {
  if (IS_PRODUCTION) {
    console.error("FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to start.");
    process.exit(1);
  }
  console.warn("[WARN] Supabase env vars not set — DB and Storage features will not work.");
}

// Service-role client bypasses RLS — used only for trusted backend operations
const supabase = supabaseUrl && supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// ── CORS allowlist ─────────────────────────────────────────────────────────
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
  if (!IS_PRODUCTION && /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin))
    return origin;
  return null;
};

// ── CORS-aware JSON response ───────────────────────────────────────────────
const json = (response, status, body, origin) => {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  const allowed = getCorsOrigin(origin);
  if (allowed) {
    headers["Access-Control-Allow-Origin"]  = allowed;
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    headers["Vary"] = "Origin";
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
};

// ── Body helpers ───────────────────────────────────────────────────────────
const readBody = async (request) => {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body too large");
  }
  return body ? JSON.parse(body) : {};
};

// ── Legacy HMAC token auth (for the old /api/admin/login flow) ─────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────
const now       = () => new Date().toISOString();
const validDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// ── Allowed media MIME types ───────────────────────────────────────────────
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/3gpp", "video/3gpp2", "video/x-matroska",
]);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

// ── Media upload handler — streams to Supabase Storage ────────────────────
function handleMediaUpload(request, response, origin) {
  const reply = (status, body) => json(response, status, body, origin);

  if (!supabase) return reply(503, { error: "Storage not configured (Supabase env vars missing)." });

  return new Promise((resolve) => {
    let bb;
    try {
      bb = busboy({ headers: request.headers, limits: { fileSize: MAX_UPLOAD_BYTES } });
    } catch {
      return resolve(reply(400, { error: "Invalid multipart request" }));
    }

    const fields       = {};
    let   fileBuffer   = null;
    let   fileInfo_    = null;
    let   uploadError  = null;
    const chunks       = [];

    bb.on("file", (fieldName, stream, info) => {
      const { filename, mimeType } = info;
      const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
      const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);

      if (!isVideo && !isImage) {
        stream.resume();
        uploadError = `File type "${mimeType}" is not supported. Upload MP4, WebM, MOV, JPG, PNG, or WebP.`;
        return;
      }

      const origExt  = path.extname(filename || "").toLowerCase();
      const ext      = origExt || (isVideo ? ".mp4" : ".jpg");
      const bucket   = isVideo ? "videos" : "posters";
      const uniqueName = `${randomUUID()}${ext}`;

      fileInfo_ = { uniqueName, filename: filename || uniqueName, mimeType, mediaType: isVideo ? "video" : "image", bucket, ext };

      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("limit", () => {
        uploadError = "File is too large (maximum 500 MB).";
        stream.destroy();
      });
      stream.on("error", (err) => {
        uploadError = `Stream error: ${err.message}`;
      });
    });

    bb.on("field", (name, value) => { fields[name] = value; });

    bb.on("close", async () => {
      if (uploadError) return resolve(reply(400, { error: uploadError }));
      if (!fileInfo_)  return resolve(reply(400, { error: "No file received." }));

      fileBuffer = Buffer.concat(chunks);

      try {
        // 1. Upload file to Supabase Storage
        const { error: storageErr } = await supabase.storage
          .from(fileInfo_.bucket)
          .upload(fileInfo_.uniqueName, fileBuffer, {
            contentType: fileInfo_.mimeType,
            upsert: false,
          });

        if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);

        // 2. Build the storage_path (used to generate signed URLs later)
        const storagePath = fileInfo_.uniqueName;

        // 3. Insert video/image metadata into Supabase DB
        const record = {
          title:         String(fields.title || fileInfo_.filename).trim(),
          description:   String(fields.description || "").trim(),
          category:      String(fields.category || (fileInfo_.mediaType === "video" ? "Live Production" : "Photo")).trim(),
          venue:         String(fields.venue || "").trim(),
          duration:      String(fields.duration || "").trim(),
          event_date:    validDate(fields.eventDate) ? fields.eventDate : null,
          price_kes:     parseInt(fields.price_kes || "0", 10) || 0,
          is_featured:   fields.featured === "true",
          is_published:  fields.is_published === "true",
          storage_path:  storagePath,
          original_name: fileInfo_.filename,
          mime_type:     fileInfo_.mimeType,
        };

        // Only videos go into the videos table; images go into posters bucket but no DB row needed for now
        if (fileInfo_.mediaType === "video") {
          const { data: inserted, error: dbErr } = await supabase
            .from("videos")
            .insert(record)
            .select()
            .single();

          if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`);
          return resolve(reply(201, { ...inserted, mediaType: "video", filename: storagePath }));
        } else {
          // Image — return the storage path so UI can use it
          return resolve(reply(201, {
            id: randomUUID(),
            mediaType: "image",
            filename: storagePath,
            storage_path: storagePath,
            bucket: fileInfo_.bucket,
            title: record.title,
            created_at: now(),
          }));
        }
      } catch (err) {
        console.error("[Upload error]", err);
        return resolve(reply(500, { error: err.message }));
      }
    });

    bb.on("error", (err) => resolve(reply(500, { error: `Upload error: ${err.message}` })));
    request.pipe(bb);
  });
}

// ── Helper: generate a short-lived signed URL for a private video ──────────
async function getSignedVideoUrl(storagePath, expiresInSeconds = 7200) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ── API router ─────────────────────────────────────────────────────────────
async function handleApi(request, response, url, origin) {
  const reply = (status, body) => json(response, status, body, origin);

  // ── Admin legacy login (HMAC token — kept for AdminModal compatibility) ──
  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    return readBody(request)
      .then((body) => {
        if (
          String(body.email    || "").trim().toLowerCase() !== adminEmail ||
          String(body.password || "")                      !== _adminPassword
        )
          return reply(401, { error: "Invalid credentials" });
        return reply(200, { token: signToken({ role: "admin", exp: Date.now() + 8 * 60 * 60 * 1000 }) });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // ── Public: shows ─────────────────────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/shows") {
    if (!supabase) {
      try {
        const dataFilePath = path.join(root, "data.json");
        if (existsSync(dataFilePath)) {
          const raw = JSON.parse(await import("node:fs/promises").then(fs => fs.readFile(dataFilePath, "utf8")));
          return reply(200, (raw.shows || []).filter(s => s.active !== false));
        }
      } catch (err) {
        console.warn("[Local shows fallback error]", err);
      }
      return reply(200, []);
    }
    const { data, error } = await supabase
      .from("shows")
      .select("*")
      .eq("active", true)
      .order("event_date", { ascending: true, nullsFirst: false });
    if (error) return reply(500, { error: error.message });
    // Map snake_case → camelCase for frontend compatibility
    return reply(200, data.map(s => ({
      id:          s.id,
      title:       s.title,
      category:    s.category,
      description: s.description,
      venue:       s.venue,
      eventDate:   s.event_date,
      price:       s.price,
      posterUrl:   s.poster_url,
      active:      s.active,
    })));
  }

  // ── Public: calendar ──────────────────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/calendar") {
    const month = url.searchParams.get("month");
    if (!/^\d{4}-\d{2}$/.test(month || ""))
      return reply(400, { error: "month must use YYYY-MM" });
    if (!supabase) return reply(200, { month, bookedDates: [] });
    const start = `${month}-01`;
    const end   = `${month}-31`;
    const { data, error } = await supabase
      .from("bookings")
      .select("booking_date, status")
      .gte("booking_date", start)
      .lte("booking_date", end)
      .in("status", ["pending", "confirmed"]);
    if (error) return reply(500, { error: error.message });
    const bookedDates = data.map(b => b.booking_date);
    return reply(200, { month, bookedDates });
  }

  // ── Public: payment methods ───────────────────────────────────────────────
  if (request.method === "GET" && url.pathname === "/api/payment-methods") {
    if (!supabase) return reply(200, [{ id: 1, name: "M-Pesa", provider: "Safaricom", accountReference: "VOICE-OF-ART", instructions: "Contact us after booking.", active: true }]);
    const { data, error } = await supabase.from("payment_methods").select("*").eq("active", true);
    if (error) return reply(500, { error: error.message });
    return reply(200, data.map(m => ({
      id: m.id, name: m.name, provider: m.provider,
      accountReference: m.account_reference, instructions: m.instructions, active: m.active,
    })));
  }

  // ── Public: video catalogue (no signed URLs — metadata only) ─────────────
  if (request.method === "GET" && url.pathname === "/api/media") {
    if (!supabase) return reply(200, []);
    const type     = url.searchParams.get("type");
    const featured = url.searchParams.get("featured");
    let query = supabase.from("videos").select("id,title,description,category,venue,event_date,price_kes,is_published,is_featured,thumbnail_path,original_name,created_at").eq("is_published", true).order("created_at", { ascending: false });
    if (featured) query = query.eq("is_featured", featured === "true");
    const { data, error } = await query;
    if (error) return reply(500, { error: error.message });
    return reply(200, data.map(v => ({
      id:          v.id,
      title:       v.title,
      description: v.description,
      category:    v.category,
      venue:       v.venue,
      eventDate:   v.event_date,
      priceKes:    v.price_kes,
      isPublished: v.is_published,
      featured:    v.is_featured,
      mediaType:   "video",
      // No storage_path here — clients must request a signed URL via /api/videos/watch/:id
      thumbnailPath: v.thumbnail_path,
      createdAt:   v.created_at,
    })));
  }

  // ── Public: get a signed playback URL (requires confirmed purchase or free video) ──
  if (request.method === "GET" && url.pathname.match(/^\/api\/videos\/watch\/([^/]+)$/)) {
    const videoId = url.pathname.split("/").pop();
    if (!supabase) return reply(503, { error: "Database not configured." });

    const { data: video, error: videoErr } = await supabase
      .from("videos")
      .select("id, title, price_kes, storage_path, is_published")
      .eq("id", videoId)
      .single();

    if (videoErr || !video) return reply(404, { error: "Video not found." });
    if (!video.is_published) return reply(403, { error: "This video is not available." });

    // Free video — issue signed URL immediately
    if (video.price_kes === 0) {
      try {
        const signedUrl = await getSignedVideoUrl(video.storage_path);
        return reply(200, { signedUrl, title: video.title, expiresIn: 7200 });
      } catch (err) {
        return reply(500, { error: err.message });
      }
    }

    // Paid video — check for a confirmed purchase via auth header (Supabase JWT)
    const authHeader = request.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return reply(401, { error: "Authentication required to watch paid content." });
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return reply(401, { error: "Invalid or expired session." });

    const { data: purchase, error: purchaseErr } = await supabase
      .from("video_purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .eq("status", "confirmed")
      .maybeSingle();

    if (purchaseErr) return reply(500, { error: purchaseErr.message });
    if (!purchase)   return reply(403, { error: "Purchase required. Please buy this video to watch it." });

    try {
      const signedUrl = await getSignedVideoUrl(video.storage_path);
      return reply(200, { signedUrl, title: video.title, expiresIn: 7200 });
    } catch (err) {
      return reply(500, { error: err.message });
    }
  }

  // ── Public: submit a booking ──────────────────────────────────────────────
  if (request.method === "POST" && url.pathname === "/api/bookings") {
    return readBody(request)
      .then(async (body) => {
        const required = ["schoolName", "contactName", "email", "phone", "bookingDate"];
        if (required.some((f) => !String(body[f] || "").trim()) || !validDate(body.bookingDate))
          return reply(400, { error: "schoolName, contactName, email, phone and a valid bookingDate are required" });
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(String(body.email || "").trim()))
          return reply(400, { error: "A valid email address is required" });

        if (!supabase) return reply(503, { error: "Database not configured." });

        // Check for date conflict
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("booking_date", body.bookingDate)
          .in("status", ["pending", "confirmed"])
          .maybeSingle();

        if (existing) return reply(409, { error: "That date is already booked" });

        const { data: booking, error: insertErr } = await supabase
          .from("bookings")
          .insert({
            school_name:  body.schoolName.trim(),
            contact_name: body.contactName.trim(),
            email:        body.email.trim(),
            phone:        body.phone.trim(),
            booking_date: body.bookingDate,
            notes:        String(body.notes || "").trim(),
            status:       "pending",
          })
          .select("id, status")
          .single();

        if (insertErr) return reply(500, { error: insertErr.message });
        return reply(201, { id: booking.id, status: booking.status });
      })
      .catch((err) => reply(400, { error: err.message || "Invalid request" }));
  }

  // ── Admin routes (all require HMAC token) ─────────────────────────────────
  if (!url.pathname.startsWith("/api/admin/"))
    return reply(404, { error: "API route not found" });
  if (!requireAdmin(request, response, origin)) return;

  // Admin: upload media → Supabase Storage
  if (request.method === "POST" && url.pathname === "/api/admin/media")
    return handleMediaUpload(request, response, origin);

  // Admin: list all media (including unpublished)
  if (request.method === "GET" && url.pathname === "/api/admin/media") {
    if (!supabase) return reply(503, { error: "Database not configured." });
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return reply(500, { error: error.message });
    return reply(200, data.map(v => ({
      id:           v.id,
      title:        v.title,
      description:  v.description,
      category:     v.category,
      venue:        v.venue,
      eventDate:    v.event_date,
      priceKes:     v.price_kes,
      isPublished:  v.is_published,
      active:       v.is_published,      // backward-compat alias
      featured:     v.is_featured,
      mediaType:    "video",
      filename:     v.storage_path,      // used by MediaCard for display
      createdAt:    v.created_at,
    })));
  }

  // Admin: delete media
  const mediaMatch = url.pathname.match(/^\/api\/admin\/media\/([^/]+)$/);
  if (request.method === "DELETE" && mediaMatch) {
    const id = mediaMatch[1];
    if (!supabase) return reply(503, { error: "Database not configured." });
    const { data: video, error: fetchErr } = await supabase
      .from("videos").select("storage_path").eq("id", id).single();
    if (fetchErr || !video) return reply(404, { error: "Media not found" });

    // Delete from storage
    await supabase.storage.from("videos").remove([video.storage_path]);
    // Delete DB row
    const { error: delErr } = await supabase.from("videos").delete().eq("id", id);
    if (delErr) return reply(500, { error: delErr.message });
    return reply(200, { deleted: true, id });
  }

  // Admin: update media (toggle published / featured / update metadata)
  if (request.method === "PATCH" && mediaMatch) {
    const id = mediaMatch[1];
    if (!supabase) return reply(503, { error: "Database not configured." });
    return readBody(request)
      .then(async (body) => {
        const updates = {};
        if (body.title       !== undefined) updates.title       = String(body.title);
        if (body.description !== undefined) updates.description = String(body.description);
        if (body.category    !== undefined) updates.category    = String(body.category);
        if (body.venue       !== undefined) updates.venue       = String(body.venue);
        if (body.duration    !== undefined) updates.duration    = String(body.duration);
        if (body.price_kes   !== undefined) updates.price_kes   = parseInt(body.price_kes, 10) || 0;
        if (typeof body.active    === "boolean") updates.is_published = body.active;
        if (typeof body.featured  === "boolean") updates.is_featured  = body.featured;
        if (typeof body.is_published === "boolean") updates.is_published = body.is_published;
        if (body.eventDate !== undefined)
          updates.event_date = validDate(body.eventDate) ? body.eventDate : null;

        const { data: updated, error: updateErr } = await supabase
          .from("videos").update(updates).eq("id", id).select().single();
        if (updateErr) return reply(500, { error: updateErr.message });
        return reply(200, { ...updated, active: updated.is_published, featured: updated.is_featured, mediaType: "video" });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // Admin: bookings
  if (request.method === "GET" && url.pathname === "/api/admin/bookings") {
    if (!supabase) return reply(503, { error: "Database not configured." });
    const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (error) return reply(500, { error: error.message });
    return reply(200, data.map(b => ({
      id: b.id, schoolName: b.school_name, contactName: b.contact_name,
      email: b.email, phone: b.phone, bookingDate: b.booking_date,
      status: b.status, notes: b.notes, createdAt: b.created_at,
    })));
  }

  const bookingMatch = url.pathname.match(/^\/api\/admin\/bookings\/([^/]+)$/);
  if (request.method === "PATCH" && bookingMatch) {
    const id = bookingMatch[1];
    return readBody(request)
      .then(async (body) => {
        if (!["pending", "confirmed", "cancelled"].includes(body.status))
          return reply(400, { error: "status must be pending, confirmed or cancelled" });
        if (!supabase) return reply(503, { error: "Database not configured." });
        const { data: booking, error: updateErr } = await supabase
          .from("bookings").update({ status: body.status }).eq("id", id).select().single();
        if (updateErr) return reply(500, { error: updateErr.message });
        return reply(200, { id: booking.id, status: booking.status });
      })
      .catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // Admin: schools
  if (request.method === "GET" && url.pathname === "/api/admin/schools") {
    if (!supabase) return reply(503, { error: "Database not configured." });
    const { data, error } = await supabase.from("schools").select("*").order("created_at", { ascending: false });
    if (error) return reply(500, { error: error.message });
    return reply(200, data);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/schools") {
    return readBody(request).then(async (body) => {
      if ([body.name, body.contactName, body.email, body.phone].some((f) => !String(f || "").trim()))
        return reply(400, { error: "name, contactName, email and phone are required" });
      if (!supabase) return reply(503, { error: "Database not configured." });
      const { data: school, error: insertErr } = await supabase
        .from("schools")
        .insert({ name: body.name.trim(), contact_name: body.contactName.trim(), email: body.email.trim(), phone: body.phone.trim(), address: String(body.address || "").trim() })
        .select().single();
      if (insertErr) return reply(500, { error: insertErr.message });
      return reply(201, school);
    }).catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // Admin: shows
  if (request.method === "GET" && url.pathname === "/api/admin/shows") {
    if (!supabase) return reply(503, { error: "Database not configured." });
    const { data, error } = await supabase.from("shows").select("*").order("event_date", { ascending: true });
    if (error) return reply(500, { error: error.message });
    return reply(200, data);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/shows") {
    return readBody(request).then(async (body) => {
      if ([body.title, body.description].some((f) => !String(f || "").trim()))
        return reply(400, { error: "title and description are required" });
      if (!supabase) return reply(503, { error: "Database not configured." });
      const { data: show, error: insertErr } = await supabase
        .from("shows")
        .insert({
          title: body.title.trim(), category: String(body.category || "Live production").trim(),
          description: body.description.trim(), venue: String(body.venue || "").trim(),
          event_date: validDate(body.eventDate) ? body.eventDate : null,
          price: String(body.price || "").trim(), active: true,
        })
        .select().single();
      if (insertErr) return reply(500, { error: insertErr.message });
      return reply(201, show);
    }).catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  const showMatch = url.pathname.match(/^\/api\/admin\/shows\/([^/]+)$/);
  if (request.method === "PATCH" && showMatch) {
    const id = showMatch[1];
    return readBody(request).then(async (body) => {
      const updates = {};
      for (const f of ["title", "category", "description", "venue", "price"])
        if (body[f] !== undefined) updates[f] = String(body[f]);
      if (body.eventDate !== undefined) updates.event_date = validDate(body.eventDate) ? body.eventDate : null;
      if (typeof body.active === "boolean") updates.active = body.active;
      if (!supabase) return reply(503, { error: "Database not configured." });
      const { data: show, error: updateErr } = await supabase.from("shows").update(updates).eq("id", id).select().single();
      if (updateErr) return reply(500, { error: updateErr.message });
      return reply(200, show);
    }).catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // Admin: confirm a video purchase (manual M-Pesa verification)
  if (request.method === "POST" && url.pathname === "/api/admin/purchases/confirm") {
    return readBody(request).then(async (body) => {
      if (!body.userId || !body.videoId) return reply(400, { error: "userId and videoId are required" });
      if (!supabase) return reply(503, { error: "Database not configured." });
      const { data: purchase, error: upsertErr } = await supabase
        .from("video_purchases")
        .upsert({
          user_id: body.userId, video_id: body.videoId,
          amount_paid_kes: parseInt(body.amountPaidKes || "0", 10),
          mpesa_reference: String(body.mpesaReference || "").trim(),
          status: "confirmed",
        }, { onConflict: "user_id,video_id" })
        .select().single();
      if (upsertErr) return reply(500, { error: upsertErr.message });
      return reply(200, purchase);
    }).catch(() => reply(400, { error: "Invalid JSON body" }));
  }

  // Admin: payment methods
  if (request.method === "GET" && url.pathname === "/api/admin/payment-methods") {
    if (!supabase) return reply(200, []);
    const { data, error } = await supabase.from("payment_methods").select("*");
    if (error) return reply(500, { error: error.message });
    return reply(200, data.map(m => ({
      id: m.id, name: m.name, provider: m.provider,
      accountReference: m.account_reference, instructions: m.instructions, active: m.active,
    })));
  }

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

async function serveFrontend(response, pathname, origin) {
  if (pathname === "/" || pathname === "" || pathname === "/index.html") {
    const indexPath = path.join(frontendRoot, "index.html");
    if (existsSync(indexPath)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      createReadStream(indexPath).pipe(response);
      return;
    }
    return json(response, 200, {
      status: "ok",
      service: "🎭 Voice of Art API",
      message: "API server is running successfully on Render",
      endpoints: {
        shows: "/api/shows",
        videos: "/api/videos",
        calendar: "/api/calendar",
        paymentMethods: "/api/payment-methods"
      }
    }, origin);
  }

  const requested = pathname;
  const filePath  = path.resolve(frontendRoot, `.${requested}`);
  if (
    !filePath.startsWith(path.resolve(frontendRoot)) ||
    !existsSync(filePath) ||
    !(await stat(filePath)).isFile()
  ) {
    const indexPath = path.join(frontendRoot, "index.html");
    if (existsSync(indexPath)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      createReadStream(indexPath).pipe(response);
      return;
    }
    return json(response, 404, { error: `Not found: ${pathname}` }, origin);
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

// ── HTTP server ────────────────────────────────────────────────────────────
const server = createServer(async (request, response) => {
  const origin = request.headers.origin || null;
  const url    = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") return json(response, 204, {}, origin);

  try {
    if (url.pathname.startsWith("/api/"))
      return await handleApi(request, response, url, origin);

    return serveFrontend(response, url.pathname, origin);
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
  console.log(`   Network: http://<your-local-ip>:${port}  ← open this on your phone`);
  console.log(`   Admin:   http://localhost:${port}/management  (keep this URL private)\n`);
});
