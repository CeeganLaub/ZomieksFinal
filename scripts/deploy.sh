#!/bin/bash
set -e

# Complete Cloudflare Deployment Script
# Deploys both backend (Workers) and frontend (Pages)

echo "🚀 Zomieks Complete Deployment"
echo "================================"
echo ""

# Configuration
WORKER_DIR="apps/api-worker"
WEB_DIR="apps/web"
ENV=${1:-"production"}

echo "Environment: $ENV"
echo ""

# Check authentication
if ! npx wrangler whoami &> /dev/null; then
    echo "❌ Not authenticated with Cloudflare"
    echo "Run: npx wrangler login"
    exit 1
fi

# Step 1: Build and deploy backend
echo "1️⃣ Deploying Backend (Workers)..."
cd "$WORKER_DIR"

if [ "$ENV" = "production" ]; then
    npx wrangler deploy --env production
elif [ "$ENV" = "staging" ]; then
    npx wrangler deploy --env staging
else
    npx wrangler deploy
fi

echo "✓ Backend deployed"
echo ""
cd ../..

# Step 2: Build frontend
echo "2️⃣ Building Frontend..."
cd "$WEB_DIR"
npm run build
echo "✓ Frontend built"
echo ""

# Step 3: Deploy to Cloudflare Pages
echo "3️⃣ Deploying Frontend (Pages)..."
if [ "$ENV" = "production" ]; then
    npx wrangler pages deploy dist --project-name=zomieks --branch=main
else
    npx wrangler pages deploy dist --project-name=zomieks --branch=staging
fi

echo "✓ Frontend deployed"
echo ""
cd ../..

echo "✅ Deployment Complete!"
echo ""
echo "🔍 Verify deployment:"
echo "  Backend: npx wrangler tail (in $WORKER_DIR)"
echo "  Frontend: Check Cloudflare Pages dashboard"
echo ""
