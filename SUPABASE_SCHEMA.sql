-- ============================================================
--  UNIEDD LMS — SUPABASE DATABASE SCHEMA
--  Run this ENTIRE file in:
--  Supabase Dashboard → SQL Editor → New Query → RUN
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text check (role in ('student','teacher','sales','admin')) default 'student',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "View all profiles" on profiles for select using (true);
create policy "Insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Update own profile" on profiles for update using (auth.uid() = id);
create policy "Admin can update any" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 2. COURSES
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid references profiles(id),
  duration_months int,
  fee numeric default 0,
  created_at timestamptz default now()
);
alter table courses enable row level security;
create policy "Anyone can view courses" on courses for select using (true);
create policy "Teachers and admins manage courses" on courses for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('teacher','admin'))
);

-- 3. ENROLLMENTS
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  course_id uuid references courses(id),
  batch text,
  progress int default 0,
  created_at timestamptz default now()
);
alter table enrollments enable row level security;
create policy "Students see own enrollments" on enrollments for select using (
  student_id = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role in ('teacher','admin'))
);
create policy "Admins manage enrollments" on enrollments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','sales'))
);

-- 4. CLASSES
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  teacher_id uuid references profiles(id),
  teacher_name text,
  class_date date,
  start_time text,
  duration text default '1h',
  batch text,
  meet_link text,
  recording_url text,
  created_at timestamptz default now()
);
alter table classes enable row level security;
create policy "Anyone can view classes" on classes for select using (true);
create policy "Teachers and admins manage classes" on classes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('teacher','admin'))
);

-- 5. RESOURCES
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  resource_type text check (resource_type in ('pdf','video','doc','other')) default 'pdf',
  file_url text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table resources enable row level security;
create policy "Anyone can view resources" on resources for select using (true);
create policy "Teachers and admins manage resources" on resources for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('teacher','admin'))
);

-- 6. PAYMENTS
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  student_name text,
  description text,
  amount numeric not null,
  due_date date,
  paid_date date,
  status text check (status in ('pending','paid','overdue')) default 'pending',
  method text,
  payment_link text,
  created_at timestamptz default now()
);
alter table payments enable row level security;
create policy "Students view own payments" on payments for select using (
  student_id = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role in ('sales','admin'))
);
create policy "Sales and admins manage payments" on payments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('sales','admin'))
);

-- 7. LEADS
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  course_interest text,
  source text default 'Website',
  status text default 'New',
  demo_date timestamptz,
  notes text,
  assigned_to uuid references profiles(id),
  created_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Sales and admins manage leads" on leads for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('sales','admin'))
);

-- 8. CHAT MESSAGES
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id),
  room text default 'support',
  content text not null,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "Authenticated users can view chat" on chat_messages for select using (auth.uid() is not null);
create policy "Authenticated users can send chat" on chat_messages for insert with check (auth.uid() = sender_id);

-- 9. EVENTS (shared calendar)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text check (event_type in ('class','demo','meeting','payment','exam')) default 'class',
  day int,
  month int,
  year int,
  time text,
  teacher_name text,
  batch text,
  lead text,
  sales text,
  created_at timestamptz default now()
);
alter table events enable row level security;
create policy "Anyone can view events" on events for select using (true);
create policy "Authenticated users can manage events" on events for all using (auth.uid() is not null);

-- 10. PERMISSIONS
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  enabled boolean default true,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);
alter table permissions enable row level security;
create policy "Anyone can view permissions" on permissions for select using (true);
create policy "Admins manage permissions" on permissions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── ENABLE REAL-TIME ─────────────────────────────────────────────────────────
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table classes;
alter publication supabase_realtime add table resources;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table enrollments;

-- ── STORAGE BUCKET FOR FILE UPLOADS ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

create policy "Public read access" on storage.objects
  for select using (bucket_id = 'resources');

create policy "Authenticated upload" on storage.objects
  for insert with check (auth.uid() is not null and bucket_id = 'resources');

create policy "Owner can delete" on storage.objects
  for delete using (auth.uid() = owner);

-- ── SEED: default permission rows ────────────────────────────────────────────
insert into permissions (key, enabled) values
  ('student_chat', true),
  ('student_resources', true),
  ('student_payments', true),
  ('teacher_create', true),
  ('teacher_upload', true),
  ('sales_leads', true),
  ('sales_billing', true),
  ('sales_demo', true)
on conflict (key) do nothing;

-- ============================================================
--  DONE! All 10 tables created with RLS + real-time enabled.
--  Go back to your app and sign up as Admin first.
-- ============================================================

-- ─── NEW MIGRATIONS (Run in Supabase SQL Editor) ────────────────────────────

-- Add invoice columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_pct INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS generated_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add course structure columns
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Online';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 30;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Add chat rooms support (room column already exists, just ensure index)
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_no);
