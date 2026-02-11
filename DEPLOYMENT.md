# Cloudflare Deployment Guide

Complete guide for deploying Zomieks platform to Cloudflare Workers and Pages.

## Prerequisites

1. **Cloudflare Account** with Workers Paid plan ($5/month minimum)
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Git** installed and repository access
4. **Node.js** 20+ installed

## Architecture

- **Backend API**: Cloudflare Workers (Hono framework)
- **Frontend**: Cloudflare Pages (Vite/React)
- **Database**: D1 (SQLite)
- **Storage**: R2 (S3-compatible)
- **Cache/Sessions**: KV namespaces
- **Real-time**: Durable Objects (WebSocket chat)
- **Background Jobs**: Queues

---

## Step 1: Authenticate with Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate. Alternatively, use an API token:

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
```

Verify authentication:
```bash
wrangler whoami
```

---

## Step 2: Create Cloudflare Resources

Run the automated setup script:

```bash
./scripts/cloudflare-setup.sh
```

This creates:
- D1 database (`zomieks-db`)
- KV namespaces (CACHE, SESSIONS, RATE_LIMIT)
- R2 bucket (`zomieks-uploads`)
- Queues (escrow, notification, email)

The script outputs IDs that need to be added to `wrangler.toml`.

---

## Step 3: Update Configuration

### 3.1 Update `apps/api-worker/wrangler.toml`

Replace the placeholder IDs with the real ones from the setup script:

```toml
[[d1_databases]]
binding = "DB"
database_name = "zomieks-db"
database_id = "xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx"  # From setup script

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx"  # From setup script

[[kv_namespaces]]
binding = "SESSIONS"
id = "xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx"  # From setup script

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx"  # From setup script
```

### 3.2 Set Production Environment Variables

Edit the `[env.production]` section in `wrangler.toml`:

```toml
[env.production]
vars = { 
  ENVIRONMENT = "production",
  APP_URL = "https://zomieks.com",  # Your production domain
  PAYFAST_SANDBOX = "false",
  OZOW_TEST_MODE = "false"
}
```

---

## Step 4: Set Secrets

Secrets are encrypted and never stored in code. Set them using wrangler:

```bash
cd apps/api-worker

# Required secrets
wrangler secret put JWT_SECRET
# Enter: Generate a strong random string (32+ chars)

wrangler secret put PAYFAST_MERCHANT_ID
# Enter: Your PayFast merchant ID

wrangler secret put PAYFAST_MERCHANT_KEY
# Enter: Your PayFast merchant key

wrangler secret put PAYFAST_PASSPHRASE
# Enter: Your PayFast passphrase

wrangler secret put OZOW_SITE_CODE
# Enter: Your Ozow site code

wrangler secret put OZOW_PRIVATE_KEY
# Enter: Your Ozow private key

# Optional: For transactional emails via MailChannels
wrangler secret put MAILCHANNELS_API_KEY
```

To set secrets for a specific environment (staging/production):
```bash
wrangler secret put JWT_SECRET --env production
```

To list all secrets (not values, just names):
```bash
wrangler secret list
```

---

## Step 5: Database Migration

### 5.1 Apply Migrations to D1

```bash
cd apps/api-worker
wrangler d1 migrations apply zomieks-db
```

This runs all SQL migrations from `packages/db/migrations/`.

### 5.2 Seed the Database (Optional)

If you have a seed file:

```bash
wrangler d1 execute zomieks-db --file=../../packages/db/seed.sql
```

Or connect to D1 console to run manual SQL:

```bash
wrangler d1 execute zomieks-db --command="SELECT * FROM users LIMIT 5;"
```

### 5.3 D1 Dashboard

View your database in the Cloudflare dashboard:
- Go to **Workers & Pages** > **D1** > `zomieks-db`
- Run queries directly in the console

---

## Step 6: Deploy Backend (Workers)

### 6.1 Build and Deploy

```bash
cd apps/api-worker
wrangler deploy
```

Or from the root:
```bash
npm run deploy:worker
```

### 6.2 Deploy to Specific Environment

```bash
wrangler deploy --env production
wrangler deploy --env staging
```

### 6.3 Verify Deployment

```bash
# Tail live logs
wrangler tail

# Test health endpoint
curl https://zomieks-api.your-subdomain.workers.dev/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-11T...",
    "environment": "production"
  }
}
```

---

## Step 7: Deploy Frontend (Pages)

### 7.1 Create Pages Project

**Option A: Via Dashboard (Recommended)**

1. Go to Cloudflare Dashboard > **Workers & Pages** > **Create application**
2. Select **Pages** > **Connect to Git**
3. Authorize GitHub and select `ZomieksFinal` repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/` (or `apps/web` if monorepo issues)
   - **Environment variables**: See section 7.2

**Option B: Via CLI**

```bash
cd apps/web

# Build production bundle
npm run build

# Deploy to Pages
npx wrangler pages deploy dist --project-name=zomieks
```

### 7.2 Set Environment Variables (Pages)

In the Cloudflare Dashboard under your Pages project settings:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://zomieks-api.your-subdomain.workers.dev` |
| `VITE_APP_NAME` | `Zomieks` |
| `VITE_PAYFAST_MERCHANT_ID` | Your PayFast ID (public, safe for frontend) |
| `NODE_VERSION` | `20` |

### 7.3 Custom Domain

1. Go to your Pages project > **Custom domains**
2. Click **Set up a custom domain**
3. Enter `zomieks.com` (and `www.zomieks.com`)
4. Add CNAME records as instructed
5. Wait for SSL certificate provisioning (~10 minutes)

---

## Step 8: Configure CORS and Routes

### 8.1 Update Worker CORS Settings

In `apps/api-worker/src/index.ts`, ensure CORS allows your Pages domain:

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://zomieks.com',
  'https://www.zomieks.com',
  'https://zomieks.pages.dev'
];
```

### 8.2 Use Workers Routes (Optional)

Instead of a separate `workers.dev` subdomain, route API calls through your main domain:

In `wrangler.toml`:
```toml
routes = [
  { pattern = "zomieks.com/api/*", zone_name = "zomieks.com" }
]
```

Then update frontend to use `/api/v1` instead of full Worker URL.

---

## Step 9: Monitoring and Logs

### 9.1 Live Logs

```bash
# Worker logs
cd apps/api-worker
wrangler tail

# Filter by status
wrangler tail --status error

# Follow a specific request
wrangler tail --header "cf-ray: YOUR_RAY_ID"
```

### 9.2 Analytics Dashboard

View in Cloudflare Dashboard:
- **Workers & Pages** > Your worker > **Metrics**
- See requests/sec, errors, CPU time, invocations

### 9.3 Durable Objects Usage

Monitor WebSocket connections:
- **Workers & Pages** > **Durable Objects**
- Check `ChatRoom`, `Presence`, `CrmNotifications` usage

---

## Step 10: Post-Deployment Checks

### 10.1 Health Checks

```bash
# Backend health
curl https://your-worker.workers.dev/health

# Frontend
curl https://zomieks.com
```

### 10.2 Test Critical Flows

1. **User Registration**: Create test account
2. **Authentication**: Login and check JWT
3. **Service Listing**: Browse services
4. **Payment Flow**: Test with PayFast sandbox
5. **WebSocket Chat**: Open two browsers, send messages
6. **File Upload**: Upload service image (R2)
7. **Admin Panel**: Check analytics and user management

### 10.3 Database Verification

```bash
wrangler d1 execute zomieks-db --command="SELECT COUNT(*) as total FROM users;"
```

---

## Troubleshooting

### Issue: "Module not found" during build

**Solution**: Run `npm install` in the workspace root, then in `apps/api-worker`:
```bash
npm install
wrangler deploy
```

### Issue: "Durable Object class not found"

**Solution**: Ensure Durable Object bindings are correct in `wrangler.toml`:
```toml
[[durable_objects.bindings]]
name = "CHAT_ROOMS"
class_name = "ChatRoom"
script_name = "zomieks-api"  # Must match your worker name
```

### Issue: CORS errors in browser

**Solution**: 
1. Check `allowedOrigins` in worker code
2. Ensure Pages domain is included
3. Redeploy worker: `wrangler deploy`

### Issue: D1 database locked

**Solution**: D1 uses SQLite in exclusive mode. If migrations fail:
```bash
# Wait 30 seconds and retry
wrangler d1 migrations apply zomieks-db --force
```

### Issue: R2 upload fails with 403

**Solution**: Check R2 bucket CORS settings:
```bash
wrangler r2 bucket cors set zomieks-uploads --config=cors.json
```

Example `cors.json`:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://zomieks.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}
```

---

## Updating After Code Changes

### Backend (Workers)

```bash
git pull
cd apps/api-worker
wrangler deploy
```

### Frontend (Pages)

If connected to Git, Pages auto-deploys on push to `main`. Otherwise:

```bash
git pull
cd apps/web
npm run build
npx wrangler pages deploy dist --project-name=zomieks
```

---

## Cost Estimates

**Cloudflare Workers Paid Plan**: $5/month (includes):
- 10M requests/month
- Unlimited Durable Objects (billed separately)
- D1 database (25GB storage, 25B row reads free)
- R2 storage (10GB free, then $0.015/GB)
- KV (100k ops/day free)

**Additional costs** (if exceeded):
- Workers: $0.50 per 1M requests
- Durable Objects: $0.15 per 1M requests
- R2 egress: $0.01/GB (within Cloudflare network = free)

**Estimated monthly cost** for 100k users: ~$50-150

---

## Rollback Strategy

### Rollback Worker Deployment

Cloudflare keeps previous deployments:

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback
```

### Rollback Database Migration

D1 doesn't auto-rollback. Create a reverse migration:

```sql
-- In packages/db/migrations/XXXX_rollback.sql
DROP TABLE IF EXISTS new_feature_table;
ALTER TABLE users DROP COLUMN new_column;
```

Then apply:
```bash
wrangler d1 execute zomieks-db --file=path/to/rollback.sql
```

---

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

---

## Support

For deployment issues, check:
1. Cloudflare Dashboard > **Workers & Pages** > Logs
2. `wrangler tail` for live debugging
3. GitHub Issues: [CeeganLaub/ZomieksFinal](https://github.com/CeeganLaub/ZomieksFinal/issues)
