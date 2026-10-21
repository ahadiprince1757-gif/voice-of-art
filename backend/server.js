import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";

const root = path.dirname(fileURLToPath(import.meta.url));
// Serve from the Vite production build output (frontend/dist).
// Run `npm run build` inside the frontend folder to refresh.
const frontendRoot = path.join(root, "..", "frontend", "dist");
const dataPath = path.join(root, "data.json");
const port = Number(process.env.PORT || 3000);
const tokenSecret =
  process.env.TOKEN_SECRET || "development-only-change-this-secret";
const adminEmail = process.env.ADMIN_EMAIL || "admin@voiceofart.co.ke";
const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";

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

const json = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large");
  }
  return body ? JSON.parse(body) : {};
};

const signToken = (payload) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", tokenSecret)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
};

const verifyToken = (request) => {
  const token = (request.headers.authorization || "").replace(/^Bearer /, "");
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expected = createHmac("sha256", tokenSecret)
    .update(encoded)
    .digest("base64url");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return false;
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  );
  return payload.role === "admin" && payload.exp > Date.now();
};

const requireAdmin = (request, response) => {
  if (!verifyToken(request)) {
    json(response, 401, { error: "Admin authentication required" });
    return false;
  }
  return true;
};

function handleApi(request, response, url) {
  const data = loadData();

  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    return readBody(request)
      .then((body) => {
        if (
          String(body.email || "")
            .trim()
            .toLowerCase() !== adminEmail ||
          String(body.password || "") !== adminPassword
        )
          return json(response, 401, { error: "Invalid credentials" });
        return json(response, 200, {
          token: signToken({
            role: "admin",
            exp: Date.now() + 8 * 60 * 60 * 1000,
          }),
        });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
  }

  if (request.method === "GET" && url.pathname === "/api/shows") {
    return json(
      response,
      200,
      data.shows
        .filter((show) => show.active)
        .sort((a, b) =>
          String(a.eventDate || "").localeCompare(String(b.eventDate || "")),
        ),
    );
  }

  if (request.method === "GET" && url.pathname === "/api/calendar") {
    const month = url.searchParams.get("month");
    if (!/^\d{4}-\d{2}$/.test(month || ""))
      return json(response, 400, { error: "month must use YYYY-MM" });
    const bookedDates = data.bookings
      .filter(
        (booking) =>
          booking.bookingDate.startsWith(`${month}-`) &&
          ["pending", "confirmed"].includes(booking.status),
      )
      .map((booking) => booking.bookingDate);
    return json(response, 200, { month, bookedDates });
  }

  if (request.method === "GET" && url.pathname === "/api/payment-methods") {
    return json(
      response,
      200,
      data.paymentMethods.filter((method) => method.active),
    );
  }

  if (request.method === "POST" && url.pathname === "/api/bookings") {
    return readBody(request)
      .then((body) => {
        const required = [
          "schoolName",
          "contactName",
          "email",
          "phone",
          "bookingDate",
        ];
        if (
          required.some((field) => !String(body[field] || "").trim()) ||
          !validDate(body.bookingDate)
        )
          return json(response, 400, {
            error:
              "schoolName, contactName, email, phone and a valid bookingDate are required",
          });
        if (
          data.bookings.some(
            (booking) =>
              booking.bookingDate === body.bookingDate &&
              ["pending", "confirmed"].includes(booking.status),
          )
        )
          return json(response, 409, { error: "That date is already booked" });
        const booking = {
          id: nextId(data, "bookings"),
          schoolId: null,
          schoolName: body.schoolName.trim(),
          contactName: body.contactName.trim(),
          email: body.email.trim(),
          phone: body.phone.trim(),
          bookingDate: body.bookingDate,
          status: "pending",
          notes: String(body.notes || "").trim(),
          createdAt: now(),
        };
        data.bookings.push(booking);
        saveData(data);
        return json(response, 201, { id: booking.id, status: booking.status });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
  }

  if (!url.pathname.startsWith("/api/admin/"))
    return json(response, 404, { error: "API route not found" });
  if (!requireAdmin(request, response)) return;

  if (request.method === "GET" && url.pathname === "/api/admin/bookings")
    return json(response, 200, data.bookings);
  if (request.method === "GET" && url.pathname === "/api/admin/schools")
    return json(response, 200, data.schools);
  if (request.method === "GET" && url.pathname === "/api/admin/payment-methods")
    return json(response, 200, data.paymentMethods);

  if (request.method === "POST" && url.pathname === "/api/admin/schools")
    return readBody(request)
      .then((body) => {
        if (
          [body.name, body.contactName, body.email, body.phone].some(
            (field) => !String(field || "").trim(),
          )
        )
          return json(response, 400, {
            error: "name, contactName, email and phone are required",
          });
        const school = {
          id: nextId(data, "schools"),
          name: body.name.trim(),
          contactName: body.contactName.trim(),
          email: body.email.trim(),
          phone: body.phone.trim(),
          address: String(body.address || "").trim(),
          createdAt: now(),
        };
        data.schools.push(school);
        saveData(data);
        return json(response, 201, school);
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));

  if (
    request.method === "POST" &&
    url.pathname === "/api/admin/payment-methods"
  )
    return readBody(request)
      .then((body) => {
        if (
          [body.name, body.provider, body.accountReference].some(
            (field) => !String(field || "").trim(),
          )
        )
          return json(response, 400, {
            error: "name, provider and accountReference are required",
          });
        const method = {
          id: nextId(data, "paymentMethods"),
          name: body.name.trim(),
          provider: body.provider.trim(),
          accountReference: body.accountReference.trim(),
          instructions: String(body.instructions || "").trim(),
          active: true,
          createdAt: now(),
        };
        data.paymentMethods.push(method);
        saveData(data);
        return json(response, 201, method);
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));

  if (request.method === "POST" && url.pathname === "/api/admin/shows")
    return readBody(request)
      .then((body) => {
        if (
          [body.title, body.description].some(
            (field) => !String(field || "").trim(),
          )
        )
          return json(response, 400, {
            error: "title and description are required",
          });
        const show = {
          id: nextId(data, "shows"),
          title: body.title.trim(),
          category: String(body.category || "Live production").trim(),
          description: body.description.trim(),
          venue: String(body.venue || "").trim(),
          eventDate: validDate(body.eventDate) ? body.eventDate : null,
          price: String(body.price || "").trim(),
          posterClass: String(body.posterClass || "").trim(),
          active: true,
          createdAt: now(),
        };
        data.shows.push(show);
        saveData(data);
        return json(response, 201, show);
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));

  const bookingMatch = url.pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
  if (request.method === "PATCH" && bookingMatch)
    return readBody(request)
      .then((body) => {
        if (!["pending", "confirmed", "cancelled"].includes(body.status))
          return json(response, 400, {
            error: "status must be pending, confirmed or cancelled",
          });
        const booking = data.bookings.find(
          (item) => item.id === Number(bookingMatch[1]),
        );
        if (!booking)
          return json(response, 404, { error: "Booking not found" });
        booking.status = body.status;
        saveData(data);
        return json(response, 200, booking);
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));

  const showMatch = url.pathname.match(/^\/api\/admin\/shows\/(\d+)$/);
  if (request.method === "PATCH" && showMatch)
    return readBody(request)
      .then((body) => {
        const show = data.shows.find(
          (item) => item.id === Number(showMatch[1]),
        );
        if (!show) return json(response, 404, { error: "Show not found" });
        for (const field of [
          "title",
          "category",
          "description",
          "venue",
          "price",
          "posterClass",
        ])
          if (body[field] !== undefined) show[field] = String(body[field]);
        if (body.eventDate !== undefined)
          show.eventDate = validDate(body.eventDate) ? body.eventDate : null;
        if (typeof body.active === "boolean") show.active = body.active;
        saveData(data);
        return json(response, 200, show);
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));

  return json(response, 404, { error: "Admin route not found" });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};
async function serveFrontend(response, pathname) {
  const requested = pathname === "/" ? "/Index.html" : pathname;
  const filePath = path.resolve(frontendRoot, `.${requested}`);
  if (
    !filePath.startsWith(path.resolve(frontendRoot)) ||
    !existsSync(filePath) ||
    !(await stat(filePath)).isFile()
  )
    return json(response, 404, { error: "File not found" });
  response.writeHead(200, {
    "Content-Type":
      mimeTypes[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  if (request.method === "OPTIONS") return json(response, 204, {});
  try {
    if (url.pathname.startsWith("/api/"))
      return handleApi(request, response, url);
    return serveFrontend(response, url.pathname);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Internal server error" });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. The Voice of Art backend may already be running at http://localhost:${port}.`,
    );
    process.exitCode = 1;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});

server.listen(port, () =>
  console.log(`Voice of Art server running at http://localhost:${port}`),
);
