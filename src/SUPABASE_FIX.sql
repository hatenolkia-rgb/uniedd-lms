-- ============================================================
--  UNIEDD LMS — FIX SQL (Run this instead of the full schema)
--  Your tables already exist. This just adds missing columns
--  and fixes any gaps. Safe to run multiple times.
-- ============================================================

-- ── Add missing columns to profiles ─────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

-- ── Add missing columns to payments ─────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_pct INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS generated_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── Add missing columns to courses ──────────────────────────
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Online';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 30;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- ── Add missing columns to leads ────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS student_id TEXT;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_room        ON chat_messages(room);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_no);
CREATE INDEX IF NOT EXISTS idx_profiles_role    ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
CREATE INDEX IF NOT EXISTS idx_classes_date     ON classes(class_date);

-- ── Storage bucket (safe to re-run) ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- ── Seed permissions (safe to re-run) ───────────────────────
INSERT INTO permissions (key, enabled) VALUES
  ('student_chat',      true),
  ('student_resources', true),
  ('student_payments',  true),
  ('teacher_create',    true),
  ('teacher_upload',    true),
  ('sales_leads',       true),
  ('sales_billing',     true),
  ('sales_demo',        true)
ON CONFLICT (key) DO NOTHING;

-- ── Real-time (add only if not already added) ────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE profiles;      EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE classes;       EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads;         EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE payments;      EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE events;        EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE enrollments;   EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE resources;     EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ============================================================
--  DONE. All columns added, indexes created.
--  You can now redeploy on Vercel.
-- ============================================================
