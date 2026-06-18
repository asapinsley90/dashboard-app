# Deployment & Setup

All-in-one deployment: single Node.js + Express server serving frontend + API, with SQLite database persistence and file uploads.

## Local Development

### Quick Start

```bash
npm install
npm run dev
```

Opens browser to `http://localhost:3000` automatically. Data persists in `db.sqlite`.

### Environment Variables

Create a `.env` file (or pass via environment):

```env
PORT=3000
HOST=0.0.0.0
DATA_DIR=/path/to/data
DB_PATH=/path/to/db.sqlite
UPLOADS_DIR=/path/to/uploads
```

If unset, defaults to current directory for data files.

### SQLite Migration (One-Time)

If migrating from the old JSON backend:

```bash
npm run migrate
```

Reads `db.json`, writes to `db.sqlite`, backs up the original. Then `npm start` or `npm run dev` uses SQLite automatically.

## Docker

### Build

```bash
docker build -t dashboard-app .
```

### Run

```bash
docker run --rm -p 3000:3000 -v dashboard_data:/data dashboard-app
```

App listens on `http://localhost:3000`. Data persists in `dashboard_data` volume.

## Cloud Deployment

### Render (Recommended)

**Prerequisites:** GitHub account, Render account

1. **Push to GitHub**
   - Create a new repo at [github.com/new](https://github.com/new)
   - Option A: Upload via GitHub web UI (drag files, or use `.gitignore` to filter)
   - Option B: Use git locally to push

2. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Click "Dashboard" → "New" → "Web Service"
   - Select "Deploy from GitHub repo"
   - Choose your repo
   - Render auto-detects `render.yaml` and auto-configures:
     - Node runtime, npm dependencies, start command
     - Environment variables (PORT, HOST, DATA_DIR, DB_PATH, UPLOADS_DIR)
     - Persistent volume at `/mnt/data` (10 GB)
   - Click "Create Web Service"

3. **First Deploy**
   - Takes 2–5 minutes
   - Your app lives at `https://dashboard-app-xxxx.onrender.com`
   - All data (SQLite, uploads) persists in the volume
   - Redeploy anytime with zero downtime

**Troubleshooting:**
- Build error? Ensure `package.json` and `app.js` are at repo root
- Free tier sleeps after 15 min inactivity (wake time ~30s)
- For production, upgrade to Starter tier ($7/mo, always-on)

### Railway

**Prerequisites:** GitHub account, Railway account

1. **Push to GitHub** (see Render instructions)

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Create New Project" → "GitHub repo"
   - Select your repo
   - Railway auto-detects Node and installs dependencies

3. **Configure Environment**
   - After service deploys, go to "Variables" tab
   - Add:
     ```
     NODE_ENV=production
     PORT=3000
     HOST=0.0.0.0
     DATA_DIR=/mnt/data
     DB_PATH=/mnt/data/db.sqlite
     UPLOADS_DIR=/mnt/data/uploads
     ```

4. **Attach Persistent Volume**
   - Click "Add" → "Volume"
   - Mount path: `/mnt/data`
   - Size: 5 GB (adjust as needed)
   - Save and Railway redeploys

5. **After Deployment**
   - Your app is live at a Railway URL
   - Data persists in the volume
   - Updates push and redeploy automatically

## Health Check

Once deployed, verify:

```bash
curl https://your-app-url/api/db
```

Should return JSON with areas, records, and reviews (seed data on first run).
6. Attach a persistent disk and mount to `/var/data`.
7. Redeploy.

## Railway Quick Start

1. Create a new project from your repo.
2. Set start command to `npm start`.
3. Set environment variables:
   - `HOST=0.0.0.0`
   - `PORT` from Railway
   - `DATA_DIR=/data` (if using persistent volume)
4. Add a persistent volume and mount at `/data`.

## Notes

- `db.json` + uploads are file-based persistence. For larger usage, migrate to SQLite next.
- Keep regular backups of `DATA_DIR`.
