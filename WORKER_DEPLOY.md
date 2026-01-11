# Playwright Worker Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended - Free, No Credit Card)
1. Go to https://railway.app
2. Click "Deploy from GitHub repo"
3. Connect your GitHub account
4. Create a new repo with these files:
   - `worker/worker.js`
   - `worker/package.json`
   - `Dockerfile.worker` (rename to `Dockerfile`)
   - `railway.toml`
5. Set environment variables in Railway:
   - `DATABASE_URL` (your Neon connection string)
   - `IG_CREDENTIALS_KEY` (same as Netlify)
6. Deploy

### Option 2: DigitalOcean App Platform (Free $200 credit)
1. Create a new app
2. Connect GitHub repo
3. Use `Dockerfile.worker` as build path
4. Set same environment variables
5. Deploy

### Option 3: Any VPS (Ubuntu/Debian)
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd instadm-worker
npm install
npx playwright install chromium

# Set environment variables
export DATABASE_URL="postgresql://..."
export IG_CREDENTIALS_KEY="your-key"

# Run worker
node worker/worker.js
```

## Environment Variables Required
- `DATABASE_URL`: Neon Postgres connection string
- `IG_CREDENTIALS_KEY`: Same 32+ char string used in Netlify

## Worker Endpoints
- Health check: `GET /health`
- Automatically polls for pending messages every 30 seconds
- Processes up to 3 messages concurrently

## After Deployment
1. Get the worker URL (e.g., `https://instadm-worker.up.railway.app`)
2. Update Netlify environment variable:
   - `WORKER_URL=https://instadm-worker.up.railway.app`
3. Redeploy Netlify

The dashboard will automatically use the worker for DM automation when `WORKER_URL` is set.
