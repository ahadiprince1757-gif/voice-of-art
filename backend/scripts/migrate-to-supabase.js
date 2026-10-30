#!/usr/bin/env node
/**
 * migrate-to-supabase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time migration: reads data.json and inserts shows, bookings,
 * schools and payment_methods into Supabase PostgreSQL.
 *
 * Run once with:
 *   node backend/scripts/migrate-to-supabase.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// ── Load .env manually (no dotenv dependency needed) ──────────────────────
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(root, ".env");

try {
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn("[WARN] Could not read .env file — using existing env vars");
}

const supabaseUrl         = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error(
    "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env\n" +
    "Get them from: Supabase → Settings → API\n"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Load data.json ─────────────────────────────────────────────────────────
const dataPath = path.join(root, "data.json");
let data;
try {
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} catch {
  console.error("ERROR: Could not read backend/data.json");
  process.exit(1);
}

console.log("\n🎭 Voice of Art — Supabase Migration\n");
console.log(`   Source: ${dataPath}`);
console.log(`   Target: ${supabaseUrl}\n`);

// ── Helper ─────────────────────────────────────────────────────────────────
function pass(label, count) {
  console.log(`   ✅ ${label}: ${count} record${count !== 1 ? "s" : ""} inserted`);
}
function skip(label, reason) {
  console.log(`   ⏭️  ${label}: skipped — ${reason}`);
}
function fail(label, err) {
  console.error(`   ❌ ${label}: ${err.message || err}`);
}

// ── 1. Shows ───────────────────────────────────────────────────────────────
console.log("1. Migrating shows…");
const shows = (data.shows || []).filter(s => s.active !== false);
if (shows.length === 0) {
  skip("shows", "no shows in data.json");
} else {
  const rows = shows.map(s => ({
    title:       s.title,
    category:    s.category || "Live production",
    description: s.description || "",
    venue:       s.venue || "",
    event_date:  s.eventDate || null,
    price:       s.price || "",
    active:      s.active !== false,
  }));
  const { error } = await supabase.from("shows").insert(rows);
  if (error) fail("shows", error); else pass("shows", rows.length);
}

// ── 2. Schools ─────────────────────────────────────────────────────────────
console.log("2. Migrating schools…");
const schools = data.schools || [];
if (schools.length === 0) {
  skip("schools", "no schools in data.json");
} else {
  const rows = schools.map(s => ({
    name:         s.name,
    contact_name: s.contactName || "",
    email:        s.email || "",
    phone:        s.phone || "",
    address:      s.address || "",
  }));
  const { error } = await supabase.from("schools").insert(rows);
  if (error) fail("schools", error); else pass("schools", rows.length);
}

// ── 3. Bookings ────────────────────────────────────────────────────────────
console.log("3. Migrating bookings…");
const bookings = data.bookings || [];
if (bookings.length === 0) {
  skip("bookings", "no bookings in data.json");
} else {
  const rows = bookings.map(b => ({
    school_name:  b.schoolName || "Unknown",
    contact_name: b.contactName || "Unknown",
    email:        b.email || "unknown@example.com",
    phone:        b.phone || "N/A",
    booking_date: b.bookingDate,
    status:       b.status || "pending",
    notes:        b.notes || "",
  }));
  const { error } = await supabase.from("bookings").insert(rows);
  if (error) fail("bookings", error); else pass("bookings", rows.length);
}

// ── 4. Payment methods ─────────────────────────────────────────────────────
console.log("4. Migrating payment methods…");
const paymentMethods = data.paymentMethods || [];
if (paymentMethods.length === 0) {
  skip("payment_methods", "none in data.json — default M-Pesa was added by schema SQL");
} else {
  const rows = paymentMethods.map(m => ({
    name:               m.name,
    provider:           m.provider,
    account_reference:  m.accountReference,
    instructions:       m.instructions || "",
    active:             m.active !== false,
  }));
  const { data: existing } = await supabase.from("payment_methods").select("id").limit(1);
  if (!existing || existing.length === 0) {
    const { error } = await supabase.from("payment_methods").insert(rows);
    if (error) fail("payment_methods", error); else pass("payment_methods", rows.length);
  } else {
    skip("payment_methods", "already seeded in Supabase");
  }
}

// ── 5. Media (videos) ──────────────────────────────────────────────────────
console.log("5. Checking media…");
const media = data.media || [];
if (media.length === 0) {
  skip("media/videos", "no uploaded videos in data.json yet");
} else {
  console.log(`   ℹ️  Found ${media.length} media records.`);
  console.log("   ℹ️  Video files are stored locally (backend/uploads/).");
  console.log("   ℹ️  To migrate them, re-upload each video through the admin panel.");
  console.log("   ℹ️  data.json media records are NOT migrated automatically (files must be re-uploaded to Supabase Storage).");
}

console.log("\n✨ Migration complete!\n");
console.log("Next steps:");
console.log("  1. Create your admin user in Supabase → Authentication → Users");
console.log("  2. Run this SQL to grant admin role:");
console.log("     UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';");
console.log("  3. Go to /management to verify you can log in\n");
