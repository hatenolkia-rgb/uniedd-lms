# UniEDD LMS — Complete Setup Guide

## Files to upload to GitHub

```
uniedd-lms/
├── public/
│   └── index.html
├── src/
│   ├── index.js
│   ├── index.css
│   ├── App.js
│   ├── supabaseClient.js
│   └── components/
│       ├── LoginPage.js
│       ├── Layout.js
│       ├── AdminDash.js
│       ├── TeacherDash.js
│       ├── StudentDash.js
│       └── SalesDash.js
├── package.json
├── vercel.json          ← fixes the CI build error
├── .gitignore
└── SUPABASE_SCHEMA.sql
```

---

## STEP 1 — Supabase: Run the SQL schema

1. Go to https://supabase.com/dashboard/project/mgpvfkuzurhzysorkbvh
2. Click **SQL Editor** → **New Query**
3. Open `SUPABASE_SCHEMA.sql` → copy all → paste → click **Run**
4. You should see: `Success. No rows returned` ✅

---

## STEP 2 — Supabase: Get your Anon Key

1. Supabase Dashboard → **Settings** → **API**
2. Copy the **anon / public** key (starts with `eyJ...`)
3. Keep this — you need it in Step 4

---

## STEP 3 — GitHub: Upload all files

1. Go to your repo: https://github.com/hatenolkia-rgb/uniedd-lms
2. Delete ALL existing files (select all → delete)
3. Upload ALL files from this zip (drag and drop or upload folder)
4. Commit changes

---

## STEP 4 — Vercel: Add environment variable

1. Go to https://vercel.com → your project → **Settings** → **Environment Variables**
2. Add:
   - **Key:** `REACT_APP_SUPABASE_ANON_KEY`
   - **Value:** paste the `eyJ...` key from Step 2
   - Check all 3 environments (Production, Preview, Development)
3. Click **Save**

---

## STEP 5 — Vercel: Redeploy

1. Vercel → your project → **Deployments**
2. Click the **3 dots** on the latest deployment → **Redeploy**
3. Wait ~2 minutes → your app is live ✅

---

## STEP 6 — First login (make yourself Admin)

1. Open your live app URL
2. Click **"Create a student account"** → sign up with your email
3. Check your email → click the confirmation link
4. Sign in → you'll land on Student dashboard (default)

**To become Admin:**
1. Supabase → **Table Editor** → click `profiles` table
2. Find your row → click the `role` cell → change from `student` to `admin`
3. Sign out of the app → sign back in → you'll see the Admin dashboard

**From Admin dashboard you can change anyone else's role without going to Supabase.**

---

## How roles work (automatic — no selector on login page)

| Role | Auto-routed to | Set by |
|------|---------------|--------|
| admin | Admin dashboard — full control | You set manually first time in Supabase |
| teacher | Teacher dashboard — schedule classes | Admin sets from dashboard |
| sales | Sales CRM — manage leads | Admin sets from dashboard |
| student | Student dashboard — view classes | Default on signup |

---

## Your Supabase project
- URL: https://mgpvfkuzurhzysorkbvh.supabase.co
- Dashboard: https://supabase.com/dashboard/project/mgpvfkuzurhzysorkbvh
