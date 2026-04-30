# UniEDD LMS — Complete Setup Guide

## Files in this repo

```
├── public/
│   └── index.html              ← HTML shell (don't edit)
├── src/
│   ├── index.js                ← React entry (don't edit)
│   ├── index.css               ← Global styles
│   ├── App.js                  ← Auth + role routing
│   ├── supabaseClient.js       ← Supabase connection
│   └── components/
│       ├── LoginPage.js        ← Login / forgot password / register
│       ├── Layout.js           ← Shared nav + UI components
│       ├── AdminDash.js        ← Admin dashboard
│       ├── TeacherDash.js      ← Teacher dashboard
│       ├── StudentDash.js      ← Student dashboard
│       └── SalesDash.js        ← Sales CRM
├── SUPABASE_SCHEMA.sql         ← Paste this in Supabase SQL Editor
├── .env.example                ← Copy to .env, add your anon key
├── package.json
└── .gitignore
```

---

## STEP 1 — Run the Database Schema in Supabase

1. Go to https://supabase.com → open your project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `SUPABASE_SCHEMA.sql` from this folder
5. Copy ALL the content → paste it → click **Run**

You'll see: `Success. No rows returned` ✅

---

## STEP 2 — Get your Supabase Anon Key

1. Supabase Dashboard → **Settings** → **API**
2. Copy the **"anon public"** key (starts with `eyJ...`)

---

## STEP 3 — Add the key to Vercel

1. Go to https://vercel.com → your project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name:** `REACT_APP_SUPABASE_ANON_KEY`
   - **Value:** paste your anon key
   - **Environment:** Production + Preview + Development
3. Click **Save**
4. Go to **Deployments** → click the three dots on latest → **Redeploy**

Your app is now live at `https://your-project.vercel.app` ✅

---

## STEP 4 — First Login (Admin)

1. Open your app URL
2. Click **"Create a student account"**
3. Sign up with your email
4. Check email → click confirmation link
5. Sign in → you'll land on the **Student** dashboard

**To make yourself Admin:**
- Go to Supabase → **Table Editor** → `profiles` table
- Find your row → click it → change `role` from `student` to `admin`
- Sign out and sign in again → you'll see the Admin dashboard

After that, you can change other users' roles directly from the Admin dashboard.

---

## STEP 5 — How roles work

| Role | What they see | How to assign |
|------|--------------|---------------|
| **Admin** | Everything + user management | Set manually in Supabase first time |
| **Teacher** | Their classes, schedule Zoom | Admin sets role from dashboard |
| **Sales** | Leads CRM, add new leads | Admin sets role from dashboard |
| **Student** | Their classes, Zoom links | Default role on signup |

Login page shows **no role selector** — the system auto-detects role from credentials.

---

## Supabase Project

URL: `https://mgpvfkuzurhzysorkbvh.supabase.co`
Dashboard: `https://supabase.com/dashboard/project/mgpvfkuzurhzysorkbvh`
