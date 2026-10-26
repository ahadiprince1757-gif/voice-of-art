// ── Supabase SQL Schema for Voice of Art ────────────────────────────────────
// Run this entire file in: Supabase → SQL Editor → New query → Run
// ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Created automatically when a user signs up via trigger (see bottom).
-- Admin role is set manually (or via the trigger for the first admin).
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text unique,
  role        text not null default 'customer'
                check (role in ('customer', 'admin')),
  created_at  timestamptz default now()
);

-- ── shows ─────────────────────────────────────────────────────────────────────
create table if not exists shows (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  category    text not null default 'Live production',
  description text,
  venue       text,
  event_date  date,
  price       text,
  poster_url  text,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- ── videos ────────────────────────────────────────────────────────────────────
create table if not exists videos (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  description     text,
  category        text,
  storage_path    text not null,        -- path inside Supabase Storage "videos" bucket
  thumbnail_path  text,                 -- path inside Supabase Storage "posters" bucket
  original_name   text,
  mime_type       text,
  duration        text,
  price_kes       integer not null default 0,  -- 0 = free / trailer
  is_published    boolean not null default false,
  is_featured     boolean not null default false,  -- appears in hero carousel
  show_id         uuid references shows(id) on delete set null,
  venue           text,
  event_date      date,
  created_at      timestamptz default now()
);

-- ── bookings ──────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id            uuid primary key default uuid_generate_v4(),
  school_name   text not null,
  contact_name  text not null,
  email         text not null,
  phone         text not null,
  booking_date  date not null,
  show_id       uuid references shows(id) on delete set null,
  notes         text,
  status        text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'cancelled')),
  created_at    timestamptz default now()
);

-- ── video_purchases ───────────────────────────────────────────────────────────
create table if not exists video_purchases (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  video_id        uuid not null references videos(id) on delete cascade,
  amount_paid_kes integer not null default 0,
  mpesa_reference text,
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'failed')),
  purchased_at    timestamptz default now(),
  unique(user_id, video_id)
);

-- ── schools ───────────────────────────────────────────────────────────────────
create table if not exists schools (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  contact_name  text,
  email         text,
  phone         text,
  address       text,
  created_at    timestamptz default now()
);

-- ── payment_methods ───────────────────────────────────────────────────────────
create table if not exists payment_methods (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  provider            text not null,
  account_reference   text not null,
  instructions        text,
  active              boolean not null default true,
  created_at          timestamptz default now()
);

-- ── Seed default M-Pesa payment method ───────────────────────────────────────
insert into payment_methods (name, provider, account_reference, instructions, active)
values (
  'M-Pesa',
  'Safaricom',
  'VOICE-OF-ART',
  'Payment instructions are confirmed by the production team after booking.',
  true
)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles        enable row level security;
alter table shows           enable row level security;
alter table videos          enable row level security;
alter table bookings        enable row level security;
alter table video_purchases enable row level security;
alter table schools         enable row level security;
alter table payment_methods enable row level security;

-- shows: anyone can read active shows
create policy "Public read active shows"
  on shows for select using (active = true);

-- videos: anyone can read published videos (metadata only — no signed URL)
create policy "Public read published videos"
  on videos for select using (is_published = true);

-- bookings: anyone can create a booking
create policy "Anyone can create booking"
  on bookings for insert with check (true);

-- payment_methods: anyone can read active payment methods
create policy "Public read active payment methods"
  on payment_methods for select using (active = true);

-- video_purchases: users see only their own
create policy "Users see own purchases"
  on video_purchases for select
  using (auth.uid() = user_id);

-- profiles: users can read and update their own profile
create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: auto-create profile row when a new user signs up
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'customer'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
