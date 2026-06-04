# Assessment Portal — Deployment Guide

> **Architecture**: Node.js + Express backend (Docker container with Java 17, Python 3, g++) + React/Vite frontend (Vercel static hosting).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [MongoDB Atlas Setup](#2-mongodb-atlas-setup)
3. [Deploy Backend to Render (Docker)](#3-deploy-backend-to-render-docker)
4. [Deploy Backend to Railway](#4-deploy-backend-to-railway)
5. [Deploy Backend to Koyeb](#5-deploy-backend-to-koyeb)
6. [Deploy Frontend to Vercel](#6-deploy-frontend-to-vercel)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

- GitHub account with this repository pushed
- MongoDB Atlas account (free M0 cluster)
- Account on **one** of: Render, Railway, or Koyeb

---

## 2. MongoDB Atlas Setup

> ⚠️ **Critical**: Free-tier cloud hosts (Render/Railway/Koyeb) use dynamic IPs. You **must** whitelist all IPs in Atlas.

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to **Security → Network Access**
3. Click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
4. Go to **Database → Connect** → **Connect your application**
5. Copy the connection string (format: `mongodb+srv://user:pass@cluster.mongodb.net/assessment_portal`)

---

## 3. Deploy Backend to Render (Docker)

### Step 1 — Create a Web Service

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repository
3. Choose **Docker** as the environment
4. Set:
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Build Context**: `backend`
   - **Plan**: Free

### Step 2 — Set Environment Variables

In Render dashboard → **Environment** tab, add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Any long random string (or click "Generate") |
| `ADMIN_PASSWORD` | A strong password |
| `CLIENT_URL` | Your Vercel frontend URL (after deploy step 6) |
| `USE_JUDGE0` | `false` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `CODE_EXEC_TIMEOUT` | `10000` |
| `MAX_MEMORY_MB` | `256` |

### Step 3 — Deploy

Click **Create Web Service**. Render will:
- Pull from GitHub
- Build the Docker image (installs Java 17, Python 3, g++)
- Run compiler verification (check deploy logs for ✅ lines)
- Start the server

### Step 4 — Verify

```
GET https://your-service.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "compilers": { "java": true, "python": true, "cpp": true, "node": true },
  "environment": "production"
}
```

> **Note**: Render free tier spins down after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

## 4. Deploy Backend to Railway

### Step 1 — Create Project

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select your repository
3. Railway auto-detects `railway.json` from the project root

### Step 2 — Configure Service

Railway will read `railway.json` and:
- Build from `backend/Dockerfile`
- Health-check on `/health`

### Step 3 — Set Environment Variables

In Railway dashboard → **Variables** tab:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Any long random string |
| `ADMIN_EMAIL` | `admin@assessment.com` |
| `ADMIN_PASSWORD` | A strong password |
| `ADMIN_NAME` | `Super Admin` |
| `CLIENT_URL` | Your Vercel frontend URL |
| `USE_JUDGE0` | `false` |
| `NODE_ENV` | `production` |
| `CODE_EXEC_TIMEOUT` | `10000` |
| `MAX_MEMORY_MB` | `256` |

> Railway automatically injects `PORT` — do not set it manually.

### Step 4 — Deploy & Verify

Railway deploys on push. Check **Deployments → View Logs** for:
```
✅ java     openjdk version "17.x.x"
✅ javac    javac 17.x.x
✅ python3  Python 3.x.x
✅ g++      g++ (Debian) x.x.x
🚀 Server running on port XXXX
```

---

## 5. Deploy Backend to Koyeb

### Step 1 — Create App

1. Go to [koyeb.com](https://koyeb.com) → **Create App**
2. Select **GitHub** as the source
3. Choose your repository and branch (`main`)

### Step 2 — Configure Build

Set:
- **Builder**: Docker
- **Dockerfile location**: `backend/Dockerfile`
- **Docker build context**: `backend`
- **Port**: `5000`

### Step 3 — Set Secrets

In Koyeb dashboard → **Secrets**, create:

| Secret Name | Value |
|-------------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Any long random string |
| `ADMIN_PASSWORD` | A strong password |
| `CLIENT_URL` | Your Vercel frontend URL |

### Step 4 — Set Environment Variables

In the service environment section:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `USE_JUDGE0` | `false` |
| `ADMIN_EMAIL` | `admin@assessment.com` |
| `ADMIN_NAME` | `Super Admin` |
| `CODE_EXEC_TIMEOUT` | `10000` |
| `MAX_MEMORY_MB` | `256` |

### Step 5 — Health Check

Set health check path to `/health` in the service configuration.

### Step 6 — Deploy

Click **Deploy**. Choose the **Free (Nano)** instance type.

---

## 6. Deploy Frontend to Vercel

> The frontend is a Vite React SPA. Vercel is the recommended host.

### Step 1

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework Preset: **Vite**

### Step 2 — Set Environment Variable

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` (or Railway/Koyeb URL) |

> Include `/api` at the end of the URL.

### Step 3 — Deploy

Click **Deploy**. Vercel builds `npm run build` and serves from `dist/`.

### Step 4 — Update Backend CORS

After getting your Vercel URL (e.g. `https://assessment-portal-opal.vercel.app`), go back to your backend deployment and set:

```
CLIENT_URL=https://assessment-portal-opal.vercel.app
```

Redeploy the backend to apply the CORS update.

---

## 7. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | `5000` | Server port (auto-set by Render/Railway) |
| `NODE_ENV` | Yes | `development` | Set to `production` |
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (keep secret!) |
| `JWT_EXPIRE` | No | `7d` | Token expiry duration |
| `ADMIN_EMAIL` | Yes | — | Email for the auto-created admin account |
| `ADMIN_PASSWORD` | Yes | — | Password for the admin account |
| `ADMIN_NAME` | No | `Super Admin` | Display name for admin |
| `CLIENT_URL` | Yes | — | Frontend URL(s) for CORS. Comma-separated. |
| `USE_JUDGE0` | No | `false` | `false` = local Docker compilers, `true` = Judge0 API |
| `JUDGE0_API_URL` | No | — | Only if USE_JUDGE0=true |
| `JUDGE0_API_KEY` | No | — | Only if USE_JUDGE0=true |
| `CODE_EXEC_TIMEOUT` | No | `10000` | Code execution timeout in milliseconds |
| `MAX_MEMORY_MB` | No | `256` | Memory limit per code execution in MB |
| `SMTP_HOST` | No | — | SMTP server for email notifications |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |

---

## 8. Troubleshooting

### ❌ `spawn java ENOENT` / `spawn javac ENOENT`

**Cause**: Java not found in PATH when `child_process.spawn()` is called.

**Fix** (already applied in `codeExecutor.js`): `env: process.env` is now passed to every spawn call, and PATH is explicitly extended with JVM bin paths.

**Verify**: Check the startup log for `✅ java` and `✅ javac`. If you see `❌`, the Dockerfile's `openjdk-17-jdk` installation failed — check build logs.

---

### ❌ `spawn python ENOENT`

**Cause**: `python` binary doesn't exist; only `python3` is installed.

**Fix** (already applied): `codeExecutor.js` now calls `python3` instead of `python`.

---

### ❌ CORS error in browser

**Cause**: `CLIENT_URL` env var not set or doesn't match the actual frontend URL.

**Fix**: 
1. Set `CLIENT_URL=https://your-frontend.vercel.app` on the backend deployment
2. Redeploy the backend
3. Verify: `GET /health` returns `200 OK` (no CORS block on health check)

---

### ❌ MongoDB connection failed / timeout

**Cause**: MongoDB Atlas hasn't whitelisted the deployment's IP.

**Fix**:
1. Atlas → Security → Network Access → Add `0.0.0.0/0`
2. Redeploy the backend (or just wait for a retry)

---

### ❌ Render free tier: first request takes 30+ seconds

**Cause**: Render spins down free services after 15 minutes of inactivity.

**Fix** (options):
- Accept the cold start (fine for testing)
- Use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 14 minutes to keep it warm
- Upgrade to Render Starter ($7/month) for always-on

---

### ❌ Java code compiles but gives wrong output

**Cause**: Missing `throws Exception` in the generated wrapper.

**Fix** (already applied): `codeExecutor.js` now generates `main(String[] args) throws Exception`.

---

### 🔍 How to verify compilers are working after deploy

```bash
# Check health endpoint
curl https://your-backend.onrender.com/health

# Expected output:
{
  "status": "ok",
  "compilers": {
    "java": true,
    "python": true,
    "cpp": true,
    "node": true
  }
}
```

If any compiler shows `false`, check the build logs for the `=== Compiler Verification ===` section.
