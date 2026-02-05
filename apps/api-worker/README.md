# Zomieks - Cloudflare Deployment Guide

This guide covers deploying Zomieks to Cloudflare's infrastructure using Workers, D1, KV, R2, Queues, and Durable Objects.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge Network                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │  Cloudflare  │     │   Workers    │     │   Durable    │     │
│  │    Pages     │────▶│   API (Hono) │────▶│   Objects    │     │
│  │  (Frontend)  │     │              │     │  (Realtime)  │     │
│  └──────────────┘     └──────────────┘     └──────────────┘     │
│                              │                    │              │
│         ┌────────────────────┼────────────────────┘              │
│         │                    │                                   │
│         ▼                    ▼                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │      D1      │     │      KV      │     │      R2      │     │
│  │   (SQLite)   │     │   (Cache)    │     │  (Storage)   │     │
│  └──────────────┘     └──────────────┘     └──────────────┘     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Queues                                │   │
│  │  ┌────────────┐  ┌──────────────┐  ┌────────────┐         │   │
│  │  │   Escrow   │  │ Notification │  │   Email    │         │   │
│  │  └────────────┘  └──────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Cloudflare Account** with Workers Paid plan ($5/month)
2. **Wrangler CLI** installed globally:
   ```bash
   npm install -g wrangler
   ```
3. **Domain** configured in Cloudflare (for email and custom domain)

## Quick Start

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Create D1 Database

```bash
cd apps/api-worker
wrangler d1 create zomieks-db
```

Copy the database ID to `wrangler.toml`.

### 3. Create KV Namespaces

```bash
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create RATE_LIMIT
```

Copy the namespace IDs to `wrangler.toml`.

### 4. Create R2 Bucket

```bash
wrangler r2 bucket create zomieks-uploads
```

### 5. Create Queues

```bash
wrangler queues create escrow-queue
wrangler queues create notification-queue
wrangler queues create email-queue
```

### 6. Set Secrets

```bash
# JWT Secret (generate a random 64-character string)
wrangler secret put JWT_SECRET

# PayFast Credentials
wrangler secret put PAYFAST_MERCHANT_ID
wrangler secret put PAYFAST_MERCHANT_KEY
wrangler secret put PAYFAST_PASSPHRASE

# Ozow Credentials
wrangler secret put OZOW_SITE_CODE
wrangler secret put OZOW_PRIVATE_KEY
```

### 7. Run Database Migrations

First, generate migrations from Drizzle schema:

```bash
cd packages/db
npm run generate
```

Then apply migrations to D1:

```bash
cd apps/api-worker
wrangler d1 migrations apply zomieks-db
```

### 8. Deploy API Worker

```bash
cd apps/api-worker
npm run deploy
```

### 9. Deploy Frontend to Pages

```bash
cd apps/web
npm run build
wrangler pages deploy dist --project-name=zomieks
```

## Environment Configuration

### Development

Create a `.dev.vars` file in `apps/api-worker`:

```env
JWT_SECRET=your-dev-jwt-secret-at-least-32-characters
PAYFAST_MERCHANT_ID=your-sandbox-id
PAYFAST_MERCHANT_KEY=your-sandbox-key
PAYFAST_PASSPHRASE=your-passphrase
OZOW_SITE_CODE=your-test-code
OZOW_PRIVATE_KEY=your-test-key
```

### Production

Set via Cloudflare dashboard or `wrangler secret put`:

- `JWT_SECRET` - JWT signing key
- `PAYFAST_MERCHANT_ID` - PayFast live merchant ID
- `PAYFAST_MERCHANT_KEY` - PayFast live merchant key
- `PAYFAST_PASSPHRASE` - PayFast passphrase
- `OZOW_SITE_CODE` - Ozow site code
- `OZOW_PRIVATE_KEY` - Ozow private key

### Frontend Environment

Create `.env` or `.env.production` in `apps/web`:

```env
VITE_API_URL=https://api.zomieks.com
VITE_WS_URL=wss://api.zomieks.com
```

## Local Development

### Start API Worker

```bash
cd apps/api-worker
npm run dev
```

This starts:
- API at http://localhost:8787
- WebSocket at ws://localhost:8787

### Start Frontend

```bash
cd apps/web
npm run dev
```

Frontend available at http://localhost:5173

## DNS Configuration

Add these DNS records in Cloudflare:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | api | your-worker.workers.dev | Yes |
| CNAME | @ | your-pages-project.pages.dev | Yes |
| CNAME | www | your-pages-project.pages.dev | Yes |

## Custom Domain Routes

Update `wrangler.toml` with production routes:

```toml
routes = [
  { pattern = "api.zomieks.com/*", zone_name = "zomieks.com" }
]
```

## Email Configuration

Zomieks uses Mailchannels (free for Workers) for transactional emails.

### Domain Verification

Add these DNS records:

```
TXT _mailchannels @ "v=mc1 cfid=your-worker-subdomain.workers.dev"
SPF @ "v=spf1 include:relay.mailchannels.net ~all"
DKIM (follow Mailchannels setup)
```

## Database Seeding

Create a seed script and run:

```bash
cd packages/db
npx tsx src/seed.ts
```

Or via D1 directly:

```bash
wrangler d1 execute zomieks-db --file=./seed.sql
```

## Monitoring

### Worker Analytics

View in Cloudflare Dashboard → Workers → Analytics

### Logs

```bash
wrangler tail zomieks-api
```

### Queue Monitoring

```bash
wrangler queues consumer zomieks-api escrow-queue
```

## Costs Estimate (Paid Workers Plan)

| Service | Free Tier | Beyond Free |
|---------|-----------|-------------|
| Workers | 10M requests/mo | $0.50/M requests |
| D1 | 5M reads, 100K writes/day | $0.001/M reads |
| KV | 100K reads, 1K writes/day | $0.50/M reads |
| R2 | 10GB storage, 10M ops | $0.015/GB |
| Queues | 1M messages/mo | $0.40/M |
| Durable Objects | 1M requests | $0.15/M |

**Estimated monthly cost for MVP**: $5-15/month

## Troubleshooting

### D1 Connection Issues

Check database binding in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "zomieks-db"
database_id = "your-actual-id"
```

### WebSocket Not Connecting

Ensure Durable Object classes are exported in `src/index.ts`:
```typescript
export { ChatRoom } from './durable-objects/ChatRoom';
export { Presence } from './durable-objects/Presence';
export { CrmNotifications } from './durable-objects/CrmNotifications';
```

### Email Not Sending

1. Check Mailchannels DNS records
2. Verify domain is set up in Workers
3. Check for SPF/DKIM alignment

### Rate Limiting Issues

Adjust limits in `src/middleware/rate-limit.ts`:
```typescript
export const apiRateLimit = rateLimit({ limit: 100, window: 60 });
```

## Migration from Express

If migrating from the Express backend:

1. Export existing PostgreSQL data
2. Transform data for D1 (SQLite)
3. Update frontend API calls
4. Update WebSocket connections
5. Test payment webhooks

## Production Checklist

- [ ] D1 database created and migrated
- [ ] KV namespaces created
- [ ] R2 bucket created
- [ ] Queues created
- [ ] Secrets configured
- [ ] Custom domain configured
- [ ] Email DNS records added
- [ ] PayFast webhook URL updated
- [ ] Ozow webhook URL updated
- [ ] Frontend deployed to Pages
- [ ] SSL/TLS configured
- [ ] Rate limiting tested
- [ ] Error monitoring set up
