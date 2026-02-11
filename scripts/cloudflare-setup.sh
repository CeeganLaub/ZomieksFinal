#!/bin/bash
set -e

# Cloudflare Resources Setup Script
# This script creates all necessary Cloudflare resources for Zomieks platform

echo "🚀 Zomieks Cloudflare Setup"
echo "================================"
echo ""

# Check authentication
echo "🔐 Checking Cloudflare authentication..."
if ! npx wrangler whoami &> /dev/null; then
    echo "❌ Not authenticated. Please run: npx wrangler login"
    exit 1
fi

echo "✓ Authenticated"
echo ""

# Navigate to api-worker directory
cd "$(dirname "$0")/../apps/api-worker"

echo "📦 Creating Cloudflare Resources..."
echo ""

# 1. Create D1 Database
echo "1️⃣ Creating D1 Database..."
if npx wrangler d1 list | grep -q "zomieks-db"; then
    echo "✓ D1 Database 'zomieks-db' already exists"
    DB_ID=$(npx wrangler d1 list | grep "zomieks-db" | awk '{print $2}')
else
    echo "Creating new D1 database..."
    DB_OUTPUT=$(npx wrangler d1 create zomieks-db)
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | cut -d'"' -f4)
    echo "✓ Created D1 Database with ID: $DB_ID"
fi
echo ""

# 2. Create KV Namespaces
echo "2️⃣ Creating KV Namespaces..."

# CACHE namespace
if npx wrangler kv:namespace list | grep -q "zomieks-cache"; then
    echo "✓ KV Namespace 'zomieks-cache' already exists"
    CACHE_ID=$(npx wrangler kv:namespace list | grep "zomieks-cache" | grep -v "preview" | head -1 | cut -d'"' -f4)
else
    CACHE_OUTPUT=$(npx wrangler kv:namespace create CACHE)
    CACHE_ID=$(echo "$CACHE_OUTPUT" | grep "id" | cut -d'"' -f4)
    echo "✓ Created CACHE namespace with ID: $CACHE_ID"
fi

# SESSIONS namespace
if npx wrangler kv:namespace list | grep -q "zomieks-sessions"; then
    echo "✓ KV Namespace 'zomieks-sessions' already exists"
    SESSIONS_ID=$(npx wrangler kv:namespace list | grep "zomieks-sessions" | grep -v "preview" | head -1 | cut -d'"' -f4)
else
    SESSIONS_OUTPUT=$(npx wrangler kv:namespace create SESSIONS)
    SESSIONS_ID=$(echo "$SESSIONS_OUTPUT" | grep "id" | cut -d'"' -f4)
    echo "✓ Created SESSIONS namespace with ID: $SESSIONS_ID"
fi

# RATE_LIMIT namespace
if npx wrangler kv:namespace list | grep -q "zomieks-ratelimit"; then
    echo "✓ KV Namespace 'zomieks-ratelimit' already exists"
    RATE_LIMIT_ID=$(npx wrangler kv:namespace list | grep "zomieks-ratelimit" | grep -v "preview" | head -1 | cut -d'"' -f4)
else
    RATE_LIMIT_OUTPUT=$(npx wrangler kv:namespace create RATE_LIMIT)
    RATE_LIMIT_ID=$(echo "$RATE_LIMIT_OUTPUT" | grep "id" | cut -d'"' -f4)
    echo "✓ Created RATE_LIMIT namespace with ID: $RATE_LIMIT_ID"
fi
echo ""

# 3. Create R2 Buckets
echo "3️⃣ Creating R2 Buckets..."
if npx wrangler r2 bucket list | grep -q "zomieks-uploads"; then
    echo "✓ R2 Bucket 'zomieks-uploads' already exists"
else
    npx wrangler r2 bucket create zomieks-uploads
    echo "✓ Created R2 bucket 'zomieks-uploads'"
fi
echo ""

# 4. Create Queues
echo "4️⃣ Creating Queues..."
for queue_name in "escrow-queue" "notification-queue" "email-queue"; do
    if npx wrangler queues list | grep -q "$queue_name"; then
        echo "✓ Queue '$queue_name' already exists"
    else
        npx wrangler queues create "$queue_name"
        echo "✓ Created queue '$queue_name'"
    fi
done
echo ""

# 5. Generate wrangler.toml update
echo "📝 Generating wrangler.toml configuration..."
echo ""
cat > /tmp/wrangler-ids.txt << EOF
# Update your wrangler.toml with these IDs:

[[d1_databases]]
binding = "DB"
database_name = "zomieks-db"
database_id = "$DB_ID"

[[kv_namespaces]]
binding = "CACHE"
id = "$CACHE_ID"

[[kv_namespaces]]
binding = "SESSIONS"
id = "$SESSIONS_ID"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "$RATE_LIMIT_ID"
EOF

cat /tmp/wrangler-ids.txt
echo ""

# 6. Summary of secrets to set
echo "🔑 Required Secrets (set with 'npx wrangler secret put SECRET_NAME'):"
echo ""
echo "  npx wrangler secret put JWT_SECRET"
echo "  npx wrangler secret put PAYFAST_MERCHANT_ID"
echo "  npx wrangler secret put PAYFAST_MERCHANT_KEY"
echo "  npx wrangler secret put PAYFAST_PASSPHRASE"
echo "  npx wrangler secret put OZOW_SITE_CODE"
echo "  npx wrangler secret put OZOW_PRIVATE_KEY"
echo "  npx wrangler secret put MAILCHANNELS_API_KEY  # Optional"
echo ""

echo "✅ Cloudflare resources setup complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Update apps/api-worker/wrangler.toml with the IDs above"
echo "  2. Set required secrets using wrangler secret put"
echo "  3. Run: npm run db:migrate:d1 (to apply migrations)"
echo "  4. Run: npm run deploy:worker (to deploy the API)"
echo "  5. Set up Cloudflare Pages for the frontend"
echo ""
