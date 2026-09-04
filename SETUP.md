# SAIKO! BACKLOG - Setup Summary

## What's Live

| Component | Status | URL / ID |
|-----------|--------|----------|
| **Supabase Project** | Active | `tbaancbaturdmyyypwii` |
| **Database Schema** | Applied | games, user_games, diary_entries, lists, list_items |
| **IGDB Edge Function** | Deployed | `https://tbaancbaturdmyyypwii.supabase.co/functions/v1/igdb-proxy` |
| **GitHub Repo** | Public | `https://github.com/minty-E/saikobacklog` |
| **Vercel Deployment** | Live | `https://saikobacklog.vercel.app` |
| **PWA** | Valid | manifest, service worker, icons all present |

## Manual Steps Required

### 1. Link GitHub to Vercel (auto-deploy)
1. Go to https://vercel.com/dashboard
2. Click **saikobacklog** project
3. Go to **Settings → Git**
4. Click **Connect Git Repository**
5. Select `minty-E/saikobacklog`
6. Future pushes to `main` will auto-deploy

### 2. Add Supabase Keep-Alive Workflow
The GitHub token lacked `workflow` scope. Add this file manually:

**File:** `.github/workflows/keep-alive.yml`

```yaml
name: Keep Supabase Alive

on:
  schedule:
    - cron: '0 12 * * *'  # Daily at 12:00 UTC
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -s "https://tbaancbaturdmyyypwii.supabase.co/rest/v1/games?select=count" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            > /dev/null
          echo "Pinged Supabase at $(date)"
```

Then add the secret:
1. Go to https://github.com/minty-E/saikobacklog/settings/secrets/actions
2. Click **New repository secret**
3. Name: `SUPABASE_ANON_KEY`
4. Value: (get from Supabase dashboard → Settings → API → anon public key)

### 3. Point Custom Domain (saikobacklog.moe)
1. Go to Vercel project → **Settings → Domains**
2. Add `saikobacklog.moe`
3. Update your DNS:
   - Type: `CNAME`
   - Name: `@` (or `www`)
   - Value: `cname.vercel-dns.com`
4. Wait for SSL certificate (automatic)

### 4. Create Your User Account
1. Go to https://saikobacklog.vercel.app/auth
2. Sign up with your email
3. Start logging games!

## Architecture

```
Browser (React SPA)
    ↓
Vercel (static hosting, HTTPS, CDN)
    ↓
Supabase (Postgres + Auth + Edge Functions)
    ↓
IGDB API (game metadata via Twitch OAuth)
```

## Features Built

- **Landing page**: Upcoming & hyped games, ratings histogram, trending
- **Profile page**: Recent activity, favorites, ratings distribution
- **Game page**: Cover, metadata, log modal (status, rating, review, date, favorite)
- **Auth**: Email/password via Supabase
- **PWA**: Installable, offline shell, maskable icons

## Next Steps (Not Built Yet)

- Global log modal (currently only on game page)
- Search page
- Custom lists
- CSV import
- Backlog page (all user games by status)

## Credentials Reference

| Service | Where to Find |
|---------|---------------|
| Supabase anon key | Dashboard → Settings → API → `anon` `public` |
| Supabase service key | Dashboard → Settings → API → `service_role` `secret` |
| Twitch Client ID | Twitch Dev Console → Your App |
| Twitch Client Secret | Twitch Dev Console → Your App |

## Cost

**$0/month** on free tiers:
- Supabase: 500MB DB, 1GB storage, 5GB egress (pauses after 7 days idle — keep-alive prevents this)
- Vercel: 100GB bandwidth, unlimited sites
- IGDB: Free with Twitch app
