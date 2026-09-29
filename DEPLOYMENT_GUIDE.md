# DIMAAG KA FALOODA: BEAT RUN 2.0 - DEPLOYMENT & DATABASE GUIDE

A complete, production-ready, step-by-step handbook to upload your game repository to GitHub, set up a 100% free Supabase PostgreSQL database for the live global leaderboard with real-time push synchronization, and host both the frontend and WebSocket 1v1 multiplayer backend for free.

---

## TABLE OF CONTENTS
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Push Game Code to GitHub](#2-step-1-push-game-code-to-github)
3. [Step 2: Free Supabase Cloud Database Setup](#3-step-2-free-supabase-cloud-database-setup)
   - [A. Create Free Project](#a-create-free-project)
   - [B. Run Database Migration SQL](#b-run-database-migration-sql)
   - [C. Retrieve API Keys](#c-retrieve-api-keys)
   - [D. Connect Database to Game](#d-connect-database-to-game)
4. [Step 3: Free Cloud Hosting (Full Multiplayer Support)](#4-step-3-free-cloud-hosting-full-multiplayer-support)
   - [Option A (Recommended): Render.com Free Web Service (Frontend + WebSockets)](#option-a-recommended-rendercom-free-web-service)
   - [Option B: GitHub Pages / Vercel (Static Frontend)](#option-b-github-pages--vercel-static-frontend)
5. [Step 4: Live Verification & Testing](#5-step-4-live-verification--testing)
6. [Troubleshooting & FAQ](#6-troubleshooting--faq)

---

## 1. Prerequisites

Before beginning, ensure you have:
- A free **GitHub Account**: [https://github.com](https://github.com)
- A free **Supabase Account**: [https://supabase.com](https://supabase.com)
- A free **Render Account** (for 1v1 live WebSockets): [https://render.com](https://render.com)
- Git installed on your computer.

---

## 2. Step 1: Push Game Code to GitHub

Follow these steps in your terminal or PowerShell from the project root (`d:\Games`):

### 1. Initialize Git in the project directory
```bash
git init
```

### 2. Stage all project files
```bash
git add .
```

### 3. Make the initial commit
```bash
git commit -m "feat: Dimaag Ka Falooda Beat Run with 60 blocks, Hindi Lo-Fi radio, and live DJ beats"
```

### 4. GitHub Repository Link
Repository created at: `https://github.com/aditya2438/Dimaag-Ka-Falooda.git`

### 5. Link local repository and push to GitHub
```bash
git remote add origin https://github.com/aditya2438/Dimaag-Ka-Falooda.git
git branch -M main
git push -u origin main
```

Your code is now securely published on your GitHub profile.

---

## 3. Step 2: Free Supabase Cloud Database Setup

Supabase provides a free PostgreSQL database with instant REST APIs and WebSocket Realtime subscriptions.

### A. Your Live Supabase Project Details
- **Project Name**: `Dimaag-Ka-Falooda`
- **Project ID**: `dfixypyqewrdofaufehg`
- **Dashboard URL**: [https://supabase.com/dashboard/project/dfixypyqewrdofaufehg](https://supabase.com/dashboard/project/dfixypyqewrdofaufehg)
- **Direct SQL Editor**: [https://supabase.com/dashboard/project/dfixypyqewrdofaufehg/sql/new](https://supabase.com/dashboard/project/dfixypyqewrdofaufehg/sql/new)
- **API Endpoint URL**: `https://dfixypyqewrdofaufehg.supabase.co`
- **Publishable Key**: `sb_publishable_u-T2e51hbuuIp8cblLxkqQ_JMTpE90g`

---

### B. Run Database Migration SQL (1-Click Setup)
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/dfixypyqewrdofaufehg/sql/new) directly.
2. Click **New query** (or open the local file `supabase_setup.sql`).
3. Paste the following SQL script into the query editor:

```sql
-- ============================================================================
-- DIMAAG KA FALOODA: BEAT RUN 2.0 - SUPABASE LEADERBOARD SCHEMA
-- ============================================================================

-- 1. Create the leaderboard table
CREATE TABLE IF NOT EXISTS public.blind_matrix_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    avatar TEXT NOT NULL DEFAULT 'cutting_chai',
    high_score BIGINT NOT NULL DEFAULT 0,
    max_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index on high_score for instant top 10 queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_high_score 
ON public.blind_matrix_leaderboard (high_score DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.blind_matrix_leaderboard ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow anyone (anon) to read top scores
DROP POLICY IF EXISTS "Allow public read access" ON public.blind_matrix_leaderboard;
CREATE POLICY "Allow public read access"
ON public.blind_matrix_leaderboard
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Policy: Allow anyone (anon) to insert new high scores
DROP POLICY IF EXISTS "Allow public insert" ON public.blind_matrix_leaderboard;
CREATE POLICY "Allow public insert"
ON public.blind_matrix_leaderboard
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Policy: Allow anyone (anon) to update their score
DROP POLICY IF EXISTS "Allow public update" ON public.blind_matrix_leaderboard;
CREATE POLICY "Allow public update"
ON public.blind_matrix_leaderboard
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 7. Add leaderboard table to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.blind_matrix_leaderboard;

-- 8. Seed initial fun starter scores
INSERT INTO public.blind_matrix_leaderboard (username, avatar, high_score, max_level)
VALUES 
    ('SHARMA_JI_KA_LADKA', 'sharma_beta', 4200, 14),
    ('CHINTU_CODER',       'chintu_pro',   3500, 11),
    ('BAAZIGAR_VIRAL',     'desi_alien',   2950, 9)
ON CONFLICT (username) DO NOTHING;
```

4. Click **Run** (or press `Ctrl + Enter`).
5. You should see `Success. No rows returned`. Your table, policies, and real-time streaming are now live!

---

### C. Live Database Pre-Configuration Status
The game is **already pre-configured** with your project credentials in `game.js`:
- `supabaseUrl`: `https://dfixypyqewrdofaufehg.supabase.co`
- `supabaseKey`: `sb_publishable_u-T2e51hbuuIp8cblLxkqQ_JMTpE90g`

Every player who loads the game will immediately connect to your Supabase project in real time without needing to configure anything! Custom overrides can still be entered in the in-game settings modal.

---

## 4. Step 3: Free Cloud Hosting (Full Multiplayer Support)

Because Dimaag Ka Falooda: Beat Run 2.0 includes a **native Node.js WebSocket engine** for 1v1 room duels, we recommend deploying on **Render.com** (100% Free).

### Option A (Recommended): Render.com Free Web Service
Render will run your Express static file server and native WebSocket server together on a free HTTPS/WSS URL.

1. Sign in to [https://dashboard.render.com](https://dashboard.render.com).
2. Click **New +** &rarr; **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Connect your GitHub account and select your `dimaag-ka-falooda-beat-run` repository.
5. Configure the deployment settings:
   - **Name**: `dimaag-ka-falooda-beat-run` (or your choice)
   - **Region**: Closest to your users (e.g., Singapore or Frankfurt or Oregon)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free** ($0/month)
6. Click **Create Web Service**.
7. Render will build and deploy your app in about 1–2 minutes.
8. Once deployed, Render provides a public URL:  
   `https://dimaag-ka-falooda-xyz.onrender.com`

**Everything works out of the box!**
- The game frontend loads smoothly over HTTPS.
- 1v1 Room Duels connect over secure WebSockets (`wss://`).
- Real Hindi Lo-Fi tracks stream peacefully in the background with live DJ beats.
- Live global leaderboard synchronizes automatically with Supabase.

---

### Option B: GitHub Pages / Vercel (Static Frontend)
If you only want static hosting (Solo Mode + Bot Sparring + Live Supabase Leaderboard):

#### Deploying on GitHub Pages:
1. Go to your GitHub repository on [https://github.com](https://github.com).
2. Click **Settings** &rarr; **Pages** (in the left sidebar).
3. Under **Branch**, select `main` and `/ (root)`.
4. Click **Save**.
5. After 1 minute, your site will be live at:  
   `https://aditya2438.github.io/Dimaag-Ka-Falooda/`

*Note: On GitHub Pages, 1v1 Bot Sparring works completely offline. For live player-vs-player room duels across different devices, host the `server.js` backend on Render.com.*

---

## 5. Step 4: Live Verification & Testing

Verify that all systems are running in peak condition:

1. **Escalating Block Scaling**:
   - Level 1–2: 9 blocks (3x3).
   - Level 3–4: 12 blocks (3x4).
   - Level 5–6: 15 blocks (3x5).
   - Level 7–8: 20 blocks (4x5).
   - Level 9–10: 30 blocks (5x6).
   - Level 11–13: 40 blocks (5x8).
   - Level 14+: 60 blocks (6x10 God Matrix Mode).

2. **Celebration Glow & Dynamic Round Palettes**:
   - Clear Round 1.
   - Observe the elastic ripple wave across all blind blocks.
   - Verify the theme colors smoothly transition to the next round's unique neon combination (e.g., Electric Cyberpunk, Toxic Matrix, Hyper Tangerine).
   - Verify the 1.25s celebration hold before the next round begins.

3. **Retro Radio Terminal**:
   - Click `[ RADIO ]` in the top header.
   - Verify the CRT scanline window opens.
   - Play *Tum Hi Ho*, *Kesariya*, or *Channa Mereya*.
   - Confirm spoken comedy voice lines mute automatically while music plays.

4. **Live Leaderboard**:
   - Finish a game or achieve a high score.
   - Check the **LEADERBOARD** tab in the game.
   - Check your Supabase Table Editor (`blind_matrix_leaderboard`) to verify the new score row is stored.

---

## 6. Troubleshooting & FAQ

### Q: Why is my Supabase leaderboard showing "CONNECTING TO CLOUD..."?
- Ensure you created the table `blind_matrix_leaderboard` with the exact schema in Step 2.
- Verify your Supabase URL has no trailing slash (e.g., `https://xyz.supabase.co`).
- Check that the `anon` public key is entered correctly.
- Ensure Row Level Security (RLS) policies were created using the provided SQL script.

### Q: How do 1v1 Room Codes work across different internet connections?
- When deployed on Render.com, both players enter the same 4-letter Room Code (e.g. `DESI`). The server connects them directly via native WebSockets with zero latency.

### Q: Is there any cost involved?
- **Zero cost ($0.00)**. GitHub, Supabase Free Tier, and Render Free Tier are 100% free with no credit card required.

---

**End of Deployment Guide**
