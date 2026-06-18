# Deployment & Operations Guide

This app runs as one Node.js service (frontend + API) using SQLite and uploaded files on persistent disk.

## Local Development

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`.

### Environment Variables

```env
PORT=3000
HOST=0.0.0.0
DATA_DIR=/path/to/data
DB_PATH=/path/to/db.sqlite
UPLOADS_DIR=/path/to/uploads
BACKUP_TOKEN=long-random-secret
BACKUP_TOKEN_SEED=long-random-rotation-seed
```

- `BACKUP_TOKEN` enables static token mode.
- `BACKUP_TOKEN_SEED` enables automatic monthly token rotation mode.
- If both are set, both modes are accepted.

## Render Deployment

`render.yaml` defines:

- `branch: main`
- `autoDeploy: true`
- persistent disk at `/mnt/data`
- health check endpoint `/healthz`

### Verify Auto-Deploy from Main

1. Open Render service.
2. Settings -> Build & Deploy.
3. Confirm branch is `main`.
4. Confirm Auto-Deploy is ON.

## Health & Monitoring

### Health Endpoints

- `GET /healthz`
- `GET /api/health`

Both return service status, uptime, and DB counts. Render uses `/healthz` for platform health checks.

### Suggested Uptime Monitoring

Use UptimeRobot, Better Stack, or similar:

1. Monitor URL: `https://your-app.onrender.com/healthz`
2. Interval: 5 minutes
3. Alert channel: email + phone push

## Backup & Export

### Backup Status

`GET /api/backup/status`

Shows whether backup export is enabled.

### Download Backup Archive

`GET /api/backup/export`

Required header:

`x-backup-token: <BACKUP_TOKEN>`

In rotation mode, token is derived monthly from `BACKUP_TOKEN_SEED` using HMAC-SHA256 over `backup:YYYY-MM`.
Server accepts current month and previous month tokens.

Archive contents:

- `db.sqlite`
- `uploads/` directory
- `manifest.json` with metadata and counts

### Download via Script

```bash
BACKUP_URL=https://your-app.onrender.com BACKUP_TOKEN=your-secret npm run backup:download
```

Or in rotation mode:

```bash
BACKUP_URL=https://your-app.onrender.com BACKUP_TOKEN_SEED=your-seed npm run backup:download
```

Backups are written to `./backups` by default.

### Backup Schedule Recommendation

1. Weekly manual export minimum.
2. Before major schema or deployment changes.
3. Keep at least 4 rolling backups.
4. Test restore monthly.

### Automated Weekly Backups (GitHub Actions)

Workflow file:

- `.github/workflows/weekly-backup.yml`

Schedule:

- Every Sunday at 09:17 UTC
- Manual trigger supported via GitHub Actions UI (`workflow_dispatch`)

One-time setup:

1. Open GitHub repo -> Settings -> Secrets and variables -> Actions.
2. Add repository secret `RENDER_BACKUP_URL` with your base app URL.
	- Example: `https://dashboard-app-jxlb.onrender.com`
3. Add repository secret `RENDER_BACKUP_TOKEN` with your current backup token.
	- Optional rotating mode: use `RENDER_BACKUP_TOKEN_SEED` instead.
4. Open Actions tab -> Weekly Backup -> Run workflow once to validate.

Where backups are stored:

1. GitHub Actions artifacts (named `dashboard-backup-<timestamp>`)
2. Artifact retention is set to 30 days

Operational notes:

1. Static mode: rotate `RENDER_BACKUP_TOKEN` in Render and GitHub secrets at the same time.
2. Rotating mode: no monthly manual rotation needed after seed is set in both systems.
3. If a run fails, open the failed workflow and review the "Download backup archive" step logs.
4. Download at least one artifact per month to an external storage location for independent retention.

## Restore Procedure (Manual)

1. Stop app.
2. Replace `db.sqlite` from backup zip.
3. Restore `uploads/` directory.
4. Start app.
5. Verify `/api/db` counts and key records.

## Custom Domain (Optional)

1. Render -> Settings -> Custom Domains.
2. Add domain (for example `dashboard.yourdomain.com`).
3. Add DNS CNAME in domain provider.
4. Wait for TLS issuance.

## Ownership & Runbook

Keep this owner checklist in your password manager or notes:

1. Render account owner and recovery method.
2. GitHub repository owner and backup admins.
3. `BACKUP_TOKEN` storage location.
4. Last successful backup date.
5. Restore dry-run date.

## Quick Verification Commands

```bash
curl https://your-app.onrender.com/healthz
curl https://your-app.onrender.com/api/db
curl https://your-app.onrender.com/api/backup/status
```
