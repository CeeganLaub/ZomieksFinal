# Cloudflare Deployment - Quick Start

Fast-track deployment guide for experienced developers.

## Prerequisites
- Cloudflare account with Workers Paid plan
- `wrangler` CLI installed globally
- Authenticated: `wrangler login`

## 30-Second Deploy

```bash
# 1. Create all Cloudflare resources
./scripts/cloudflare-setup.sh

# 2. Update apps/api-worker/wrangler.toml with the IDs printed above

# 3. Set required secrets
cd apps/api-worker
wrangler secret put JWT_SECRET  # Generate: openssl rand -base64 32
wrangler secret put PAYFAST_MERCHANT_ID
wrangler secret put PAYFAST_MERCHANT_KEY
wrangler secret put PAYFAST_PASSPHRASE
wrangler secret put OZOW_SITE_CODE
wrangler secret put OZOW_PRIVATE_KEY

# 4. Migrate database
./scripts/db-seed.sh production

# 5. Deploy everything
./scripts/deploy.sh production
```

## Deploy to Staging

```bash
./scripts/deploy.sh staging
```

## Verify

```bash
# Backend health check
curl https://zomieks-api.your-subdomain.workers.dev/health

# Frontend
curl https://zomieks.pages.dev
```

## Logs

```bash
# Worker logs
cd apps/api-worker
wrangler tail

# Pages deployment logs
wrangler pages deployment list --project-name=zomieks
```

## Rollback

```bash
# Workers
cd apps/api-worker
wrangler rollback

# Pages
wrangler pages deployment list --project-name=zomieks
wrangler pages deployment rollback <deployment-id>
```

## Full Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide with troubleshooting.
