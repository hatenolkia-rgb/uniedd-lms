# Uniedd LMS — Setup Guide

Your Supabase project is already wired in. Just follow 4 steps.

---

## Step 1 — Run the Database Schema

1. Go to https://supabase.com → your project → **SQL Editor**
2. Click **New Query**
3. Open `SUPABASE_SCHEMA.sql` from this folder
4. Copy everything → paste into SQL Editor → click **Run**

You'll see: "Success. No rows returned" — that means all 10 tables are created. ✅

---

## Step 2 — Enable Email OTP in Supabase

1. Supabase Dashboard → **Authentication** → **Settings**
2. Under **Email** make sure "Enable Email Confirmations" is ON
3. Optionally set your custom SMTP (Gmail, SendGrid etc.) for branded emails
   - If you don't set SMTP, Supabase sends emails from their default domain (works fine for testing)

To set custom SMTP (recommended for production):
- Supabase → Authentication → Settings → SMTP Settings
- Enter your Gmail / SendGrid / Mailgun credentials

---

## Step 3 — Install & Run Locally

```bash
# Install dependencies (only needed once)
npm install

# Start the app
npm start
```

Opens at: http://localhost:3000

**First time:** Select **Admin** role → Create Account → check email for confirmation → sign in.
Then go to Admin → Users to set roles for other users.

---

## Step 4 — Deploy Live on Vercel (Free, No Laptop After This)

### Option A: GitHub + Vercel (Recommended)

1. Create account at https://github.com
2. New repository → name it `uniedd-lms`
3. Upload all files from this folder to GitHub

4. Go to https://vercel.com → Sign up with GitHub
5. New Project → Import `uniedd-lms` → Deploy

Your app is LIVE instantly at: `https://uniedd-lms.vercel.app`

---

## Step 5 — Connect Your Domain

1. In Vercel → your project → **Settings → Domains**
2. Type your domain e.g. `lms.uniedd.com` → Add
3. Vercel shows you DNS records to add

4. Go to your domain registrar (GoDaddy / Namecheap / Google Domains)
5. DNS Settings → Add record:
   - Type: `CNAME`
   - Name: `lms` (or `app`)
   - Value: `cname.vercel-dns.com`

6. Wait 5–15 minutes → your LMS is live at `https://lms.uniedd.com` with free SSL ✅

---

## What's Connected

| Feature | Status |
|---------|--------|
| Supabase URL | https://mgpvfkuzurhzysorkbvh.supabase.co |
| Real-time sync | ✅ All tables |
| Email + OTP login | ✅ Built-in |
| File uploads | ✅ Supabase Storage |
| Role-based access | ✅ 4 roles |
| Chat (real-time) | ✅ Live messages |
| Calendar | ✅ Shared across roles |

---

## Roles & First Login

1. **Admin** — Register first, can manage all users and set their roles
2. **Teacher** — Register, then admin sets role to "teacher"
3. **Sales** — Register, then admin sets role to "sales"
4. **Student** — Register (default role is student)

---

## Support

Your Supabase project: https://supabase.com/dashboard/project/mgpvfkuzurhzysorkbvh
