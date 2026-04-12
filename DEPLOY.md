# AgricLife Deployment Guide

## Architecture

| Service | Platform | What it runs |
|---------|----------|-------------|
| Backend API | Render.com (free) | Node.js server + node-cron |
| Frontend | Vercel (free) | Static HTML/CSS/JS |
| Database | MongoDB Atlas (free) | MongoDB cluster |
| Images | Cloudinary (free) | Stock images |

---

## Step 1 — MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create free account
2. Create a **free M0 cluster** (choose any region)
3. Under **Database Access** → Add a database user with username + password. Save these.
4. Under **Network Access** → Add IP Address → Click **Allow Access from Anywhere** (0.0.0.0/0)
5. Under **Clusters** → Connect → Connect your application → Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/agriclife`
   - Replace `<password>` with your actual password
   - Keep this URI — you'll need it next

---

## Step 2 — Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) → Create free account
2. From your **Dashboard**, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Keep these — you'll need them in Step 3

---

## Step 3 — Render (Backend)

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Push your project to a GitHub repo first (see below)
3. Click **New → Web Service** → Connect your GitHub repo
4. Settings:
   - **Name**: `agriclife-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Click **Environment** tab → Add these variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas connection string |
   | `JWT_SECRET` | any long random string (e.g. `agriclife_jwt_secret_2024_xyz789`) |
   | `CLOUDINARY_CLOUD_NAME` | from Step 2 |
   | `CLOUDINARY_API_KEY` | from Step 2 |
   | `CLOUDINARY_API_SECRET` | from Step 2 |
   | `RECAPTCHA_SECRET_KEY` | leave blank for now |

6. Click **Deploy Web Service**
7. Wait ~2 minutes. Your API URL will be something like:
   `https://agriclife-api.onrender.com`
8. **Copy this URL** — you need it for the frontend

---

## Step 4 — Update Frontend API URL

Before deploying the frontend, update the API base URL so the frontend calls your Render backend.

Open `public/js/auth-guard.js` and find the `apiFetch` function. Change the base URL if needed, OR set a config variable.

The simplest approach — open `public/js/auth-guard.js` and find:
```js
async function apiFetch(url, options = {}) {
```
Make sure all fetch calls use relative `/api/...` paths (they should already).

Then open `vercel.json` and update the API proxy line:
```json
{ "source": "/api/(.*)", "destination": "https://YOUR-APP.onrender.com/api/$1" }
```
Replace `YOUR-APP` with your actual Render app name.

---

## Step 5 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **New Project** → Import your GitHub repo
3. Settings:
   - **Framework Preset**: Other
   - **Root Directory**: leave blank (or set to `/` — the whole repo)
   - **Output Directory**: `public`
   - **Build Command**: leave blank (static site, no build)
4. Click **Deploy**
5. Your site URL will be something like: `https://agriclife.vercel.app`

> Note: Vercel only hosts the **frontend** (`/public` folder). The backend runs on Render. The `vercel.json` proxies all `/api/...` calls to Render.

---

## Step 6 — Push to GitHub

If you haven't already:

```bash
# In your project folder
git init
git add .
git commit -m "Initial AgricLife deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/agriclife.git
git push -u origin main
```

Create a `.gitignore` file first (see below).

---

## .gitignore

Create a `.gitignore` file in your project root:

```
node_modules/
.env
uploads/
*.log
.DS_Store
```

---

## Step 7 — Set Admin Account

After deployment, register your first account on the live site. Then go to MongoDB Atlas:

1. **Atlas → Browse Collections → agriclife → users**
2. Find your user document
3. Click **Edit** → change `"role": "user"` to `"role": "admin"`
4. Save

Now log in — you'll have full admin access at `/admin`.

---

## Step 8 — Admin Settings

Log into your admin panel at `https://your-site.vercel.app/admin` and go to **Settings**:

- Set your WhatsApp number (e.g. `+233241234567`)
- Set your Telegram username (e.g. `@agriclife_support`)
- Set your support email
- Set deposit account details (MoMo name, number, bank details)

---

## Free Tier Limits

| Platform | Free Limit | Notes |
|----------|-----------|-------|
| Render | 750 hrs/month | Sleeps after 15min inactivity (first request ~30s slow) |
| Vercel | 100GB bandwidth | More than enough |
| MongoDB Atlas | 512MB storage | Enough for thousands of users |
| Cloudinary | 25GB storage, 25GB bandwidth | More than enough for stock images |

> **Render cold start**: On the free tier, your backend sleeps after 15 minutes of no traffic. The first request after sleep takes ~30 seconds. Users won't notice this during normal use, but the first load of the day may be slow. Upgrade to Render's $7/month paid plan to avoid this.

---

## Troubleshooting

**Login not working after deploy**
- Check `JWT_SECRET` is set in Render environment variables
- Check `MONGODB_URI` is correct and Atlas allows all IPs

**Images not uploading**
- Check all 3 Cloudinary env vars are set correctly in Render
- Check Cloudinary dashboard for upload errors

**Site shows old data / balance not updating**
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for API errors

**Admin panel shows 401**
- Re-login — your JWT may have expired
- Make sure your user's role is `admin` in MongoDB
