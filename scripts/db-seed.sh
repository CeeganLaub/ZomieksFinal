#!/bin/bash
set -e

# D1 Database Migration and Seed Script
# Run this after initial Cloudflare setup to populate the database

echo "🗄️  Zomieks D1 Database Setup"
echo "================================"
echo ""

# Check current directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: Must run from apps/api-worker directory"
    echo "Usage: cd apps/api-worker && ../../scripts/db-seed.sh"
    exit 1
fi

# Check for environment argument
ENV=${1:-"local"}

if [ "$ENV" = "production" ] || [ "$ENV" = "prod" ]; then
    DB_FLAG=""
    echo "⚠️  WARNING: Deploying to PRODUCTION database"
    echo ""
    read -p "Are you sure? Type 'yes' to continue: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
elif [ "$ENV" = "staging" ]; then
    DB_FLAG="--env staging"
    echo "📦 Deploying to STAGING database"
else
    DB_FLAG="--local"
    echo "💻 Deploying to LOCAL database"
fi

echo ""

# Step 1: Apply migrations
echo "1️⃣ Applying database migrations..."
if npx wrangler d1 migrations apply zomieks-db $DB_FLAG; then
    echo "✓ Migrations applied successfully"
else
    echo "❌ Migration failed"
    exit 1
fi
echo ""

# Step 2: Check if seed file exists
SEED_FILE="../../packages/db/seed.sql"
if [ ! -f "$SEED_FILE" ]; then
    echo "⚠️  No seed file found at $SEED_FILE"
    echo "Skipping seeding step."
    exit 0
fi

# Step 3: Seed database
echo "2️⃣ Seeding database with test data..."
if [ "$ENV" = "production" ] || [ "$ENV" = "prod" ]; then
    echo "⚠️  Skipping seed on production (run manually if needed)"
    echo "To seed production: npx wrangler d1 execute zomieks-db --file=$SEED_FILE"
else
    if npx wrangler d1 execute zomieks-db $DB_FLAG --file="$SEED_FILE"; then
        echo "✓ Database seeded successfully"
    else
        echo "❌ Seeding failed (might be already seeded)"
    fi
fi
echo ""

# Step 4: Verify
echo "3️⃣ Verifying database setup..."
USER_COUNT=$(npx wrangler d1 execute zomieks-db $DB_FLAG --command="SELECT COUNT(*) as count FROM users;" --json | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
SERVICE_COUNT=$(npx wrangler d1 execute zomieks-db $DB_FLAG --command="SELECT COUNT(*) as count FROM services;" --json | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo "✓ Users: $USER_COUNT"
echo "✓ Services: $SERVICE_COUNT"
echo ""

echo "✅ Database setup complete!"
echo ""
echo "📋 Useful commands:"
echo "  npx wrangler d1 execute zomieks-db $DB_FLAG --command='SELECT * FROM users LIMIT 5;'"
echo "  npx wrangler d1 execute zomieks-db $DB_FLAG --command='SELECT * FROM services LIMIT 5;'"
echo ""
