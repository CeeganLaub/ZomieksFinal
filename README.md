# Zomieks – Freelance Marketplace Platform

A full-stack freelance marketplace platform built with a monorepo architecture using Turborepo. Zomieks connects buyers with sellers for services and courses, featuring escrow payments, real-time messaging with custom offers, a CRM pipeline, seller analytics, BioLink pages, course hosting, KYC verification, and a comprehensive admin panel.

## Tech Stack

### Frontend (`apps/web`)
- **React 18** with Vite 6
- **TypeScript 5**
- **TailwindCSS 3** with Radix UI components
- **TanStack Query 5** for server state management
- **Zustand 5** for client state
- **React Router 6** for routing
- **Socket.io Client** for real-time features
- **Framer Motion** for animations
- **PWA** support via vite-plugin-pwa

### Backend (`apps/api`)
- **Node.js 20+** with Express 4.x
- **TypeScript 5**
- **Prisma 6** ORM with PostgreSQL
- **Redis** (ioredis) for caching, sessions, and rate limiting
- **Socket.io 4** for real-time messaging
- **BullMQ** for job queues (escrow release, notifications, payouts)
- **JWT** authentication (access + refresh tokens)
- **Helmet** + **express-rate-limit** for security

### Edge Worker (`apps/api-worker`)
- **Cloudflare Workers** with Hono framework
- **Drizzle ORM** with D1 database
- Durable Objects for real-time features

### Shared Packages
- `packages/shared` – Shared types, Zod schemas, constants, fee calculation utilities
- `packages/db` – Drizzle ORM schema and migrations for the edge worker

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.2.0
- **PostgreSQL** 15+
- **Redis** 7+

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` with your database, Redis, and payment gateway credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zomieks?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET=your-secret-at-least-32-characters
JWT_REFRESH_SECRET=another-secret-at-least-32-characters

# Payment Gateways
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
OZOW_SITE_CODE=your-site-code
OZOW_PRIVATE_KEY=your-private-key
OZOW_API_KEY=your-api-key
```

### 3. Generate Prisma Client & Run Migrations

```bash
# Generate the Prisma client
npm run db:generate

# Run database migrations (requires PostgreSQL running)
npm run db:migrate

# (Optional) Seed the database
cd apps/api && npx tsx prisma/seed.ts

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

### 4. Start Development Servers

```bash
# Start all services (API + Web) concurrently
npm run dev

# Or start individually:
npm run dev:api   # Backend on http://localhost:3000
npm run dev:web   # Frontend on http://localhost:5173
```

## Project Structure

```
├── apps/
│   ├── api/                 # Express backend (Port 3000)
│   │   ├── prisma/          # Prisma schema & migrations
│   │   └── src/
│   │       ├── config/      # Environment configuration
│   │       ├── lib/         # Prisma, Redis, Queue, Logger
│   │       ├── middleware/   # Auth, validation, rate limiting
│   │       ├── routes/      # API route handlers
│   │       │   ├── auth.routes.ts
│   │       │   ├── user.routes.ts
│   │       │   ├── service.routes.ts
│   │       │   ├── order.routes.ts
│   │       │   ├── course.routes.ts
│   │       │   ├── conversation.routes.ts
│   │       │   ├── payment.routes.ts
│   │       │   ├── subscription.routes.ts
│   │       │   ├── seller-subscription.routes.ts
│   │       │   ├── upload.routes.ts
│   │       │   ├── webhook.routes.ts
│   │       │   └── admin.routes.ts
│   │       ├── services/    # Business logic
│   │       │   ├── auth.service.ts
│   │       │   ├── payment.service.ts
│   │       │   ├── escrow.service.ts
│   │       │   ├── payout.service.ts
│   │       │   ├── crm.service.ts
│   │       │   └── notification.service.ts
│   │       └── socket/      # WebSocket handlers
│   ├── api-worker/          # Cloudflare Worker (edge)
│   └── web/                 # React frontend (Port 5173)
│       └── src/
│           ├── components/  # Reusable UI components
│           ├── hooks/       # Custom React hooks
│           ├── layouts/     # Page layouts (Main, Auth, Dashboard, Admin)
│           ├── lib/         # API client, socket, utilities
│           ├── pages/
│           │   ├── auth/        # Login, Register, Password Reset
│           │   ├── dashboard/   # Buyer dashboard, orders, messages
│           │   ├── seller/      # Seller dashboard, services, courses, CRM, analytics
│           │   └── admin/       # Admin dashboard, users, KYC, analytics, inbox
│           └── stores/      # Zustand stores (auth, chat, etc.)
├── packages/
│   ├── db/                  # Drizzle ORM schema (edge)
│   └── shared/              # Shared types, schemas, fee utilities
│       └── src/
│           ├── constants/   # Platform constants
│           ├── schemas/     # Zod validation schemas
│           ├── types/       # TypeScript type definitions
│           └── utils/       # Fee calculations, formatters
├── turbo.json               # Turborepo configuration
└── package.json             # Root workspace configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start web frontend only |
| `npm run dev:worker` | Start Cloudflare Worker locally |
| `npm run deploy:worker` | Deploy Cloudflare Worker |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate:d1` | Generate Drizzle schema for D1 |
| `npm run db:migrate:d1` | Run D1 migrations for edge worker |

## API Endpoints

All API routes are prefixed with `/api/v1/`:

| Route | Description |
|-------|-------------|
| `/api/v1/auth` | Register, login, refresh tokens, password reset |
| `/api/v1/users` | Profile management, seller onboarding, seller analytics |
| `/api/v1/services` | Service CRUD, packages, reviews, favorites |
| `/api/v1/orders` | Order lifecycle, deliveries, revisions, disputes |
| `/api/v1/courses` | Course CRUD, lessons, enrollments, course player |
| `/api/v1/subscriptions` | Buyer subscription management |
| `/api/v1/seller-subscription` | Seller plan subscriptions (R399 Pro) |
| `/api/v1/conversations` | Messaging, custom offers, CRM pipeline, labels |
| `/api/v1/payments` | PayFast & OZOW payment initiation |
| `/api/v1/uploads` | Image and file uploads |
| `/api/v1/admin` | Dashboard stats, user management, KYC, analytics, inbox, payouts, disputes |
| `/webhooks` | PayFast and OZOW payment notifications (no auth) |
| `/health` | Health check endpoint |

## Key Features

### For Buyers
- Browse and search services and courses
- Service PDP with package comparison, reviews, and seller profiles
- Course PDP with curriculum preview and enrollment
- Order management with milestone tracking and delivery approval
- Real-time messaging with sellers
- Subscription management
- Payment via PayFast (cards, recurring) or OZOW (instant EFT)

### For Sellers
- **Become a Seller** wizard with R399 Pro plan payment and KYC submission
- Service creation with multi-package pricing (Basic/Standard/Premium)
- Course creation with lessons and curriculum builder
- **CRM Pipeline** with Kanban board, lead scoring, labels, and auto-triggers
- **Custom Offers** in chat (one-time or monthly subscription with buyer fee calculation)
- **Seller Analytics** dashboard with revenue trends, service/course performance, and KPIs
- **BioLink Builder** for personalized seller landing pages
- **Earnings** dashboard with payout requests and KYC withdrawal notices

### For Admins
- **Dashboard** with real-time platform KPIs (users, orders, revenue, disputes, payouts)
- **User Management** with search, filtering, suspend/unsuspend
- **KYC Verification** for approving or rejecting seller identity documents
- **Service Management** to activate/deactivate services platform-wide
- **Course Management** to publish/archive courses
- **Platform Analytics** with monthly revenue/order/user charts, order breakdowns, top services/courses
- **Inbox Management** to review all conversations, flag off-platform contact attempts, manage disputes
- **Fee Configuration** for buyer processing fees and seller platform fees
- **Payment Processor Setup** for PayFast and OZOW credentials
- **Payout Processing** for manual bank transfers to sellers

### Platform Policies
- **Off-platform communication warning**: All conversations show a prominent banner reminding users to keep communication on Zomieks. Disputes involving off-platform conversations cannot be resolved or refunded.
- **Escrow protection**: All funds are held in escrow until order completion.
- **KYC requirement**: Sellers must complete identity verification before withdrawing earnings.

## Payment Gateways

The platform supports two South African payment gateways:

| Gateway | Use Cases |
|---------|-----------|
| **PayFast** | Card payments, recurring subscriptions, seller plan payments |
| **OZOW** | Instant EFT (one-time payments only) |

Both gateways use webhook-based payment confirmation with signature/hash verification.

## Fee Structure

- **Buyer Processing Fee**: 3% added to the order total
- **Seller Platform Fee**: 8% deducted from seller earnings
- All funds are held in escrow until order completion
- Fee percentages are configurable via the admin Fee Configuration page

## License

Private – All rights reserved.