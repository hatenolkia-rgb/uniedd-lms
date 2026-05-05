-- ============================================================
-- UniEDD v8 — NEW TABLES & COLUMNS
-- Run this in Supabase SQL Editor → New Query → Run
-- ============================================================

-- 1. ATTENDANCE TABLE
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  teacher_id  uuid references profiles(id),
  status      text not null default 'present', -- present | absent | late
  class_date  date,
  created_at  timestamptz default now(),
  unique(class_id, student_id)
);

-- RLS for attendance
alter table attendance enable row level security;
create policy "Attendance accessible by authenticated users"
  on attendance for all using (auth.role() = 'authenticated');

-- 2. Add notes column to leads (for call log)
alter table leads add column if not exists notes text;
alter table leads add column if not exists demo_date timestamptz;

-- 3. Add meet_link & zoom fields to classes (already exists in most setups, but ensure)
alter table classes add column if not exists meet_link text;

-- 4. Add extra columns to payments for student-facing view
alter table payments add column if not exists course_name text;
alter table payments add column if not exists student_id uuid references profiles(id);
alter table payments add column if not exists due_date date;
alter table payments add column if not exists paid_date date;

-- 5. Index for fast attendance lookup
create index if not exists idx_attendance_class_id    on attendance(class_id);
create index if not exists idx_attendance_student_id  on attendance(student_id);
create index if not exists idx_leads_status           on leads(status);

-- Done!
