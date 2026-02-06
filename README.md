# Zomieks – Freelance Marketplace Platform

A full-stack freelance marketplace platform built with a monorepo architecture using Turborepo. Features include service listings, order management, escrow payments, real-time messaging, and a CRM pipeline for sellers.

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

### Backend (`apps/api`)
- **Node.js 20+** with Express 4.x
- **TypeScript 5**
- **Prisma 6** ORM with PostgreSQL
- **Redis** (ioredis) for caching, sessions, and rate limiting
- **Socket.io 4** for real-time messaging
- **BullMQ** for job queues
- **JWT** authentication (access + refresh tokens)

### Edge Worker (`apps/api-worker`)
- **Cloudflare Workers** with Hono framework
- **Drizzle ORM** with D1 database
- Durable Objects for real-time features

### Shared Packages
- `packages/shared` – Shared types, Zod schemas, constants, and utility functions
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

Edit `apps/api/.env` with your database and Redis connection strings:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zomieks?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET=your-secret-at-least-32-characters
JWT_REFRESH_SECRET=another-secret-at-least-32-characters
```

### 3. Generate Prisma Client & Run Migrations

```bash
# Generate the Prisma client
npm run db:generate

# Run database migrations (requires PostgreSQL running)
npm run db:migrate

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
│   ├── api/             # Express backend (Port 3000)
│   │   ├── prisma/      # Prisma schema & migrations
│   │   └── src/
│   │       ├── config/  # Environment configuration
│   │       ├── lib/     # Prisma, Redis, Queue, Logger
│   │       ├── middleware/ # Auth, validation, rate limiting
│   │       ├── routes/  # API route handlers
│   │       ├── services/ # Business logic
│   │       └── socket/  # WebSocket handlers
│   ├── api-worker/      # Cloudflare Worker (edge)
│   └── web/             # React frontend (Port 5173)
│       └── src/
│           ├── components/ # Reusable UI components
│           ├── hooks/     # Custom React hooks
│           ├── layouts/   # Page layouts
│           ├── lib/       # API client, socket, utilities
│           ├── pages/     # Route pages
│           └── stores/    # Zustand stores
├── packages/
│   ├── db/              # Drizzle ORM schema (edge)
│   └── shared/          # Shared types, schemas, utilities
├── turbo.json           # Turborepo configuration
└── package.json         # Root workspace configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start web frontend only |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Prisma Studio |

## API Endpoints

All API routes are prefixed with `/api/v1/`:

- **Auth**: `/api/v1/auth` – Register, login, refresh tokens, password reset
- **Users**: `/api/v1/users` – Profile management, seller onboarding
- **Services**: `/api/v1/services` – Service CRUD, packages, subscription tiers
- **Orders**: `/api/v1/orders` – Order lifecycle, deliveries, revisions, disputes
- **Subscriptions**: `/api/v1/subscriptions` – Subscription management
- **Conversations**: `/api/v1/conversations` – Messaging, CRM pipeline, labels, auto-triggers
- **Payments**: `/api/v1/payments` – PayFast & OZOW payment initiation
- **Uploads**: `/api/v1/uploads` – Image and file uploads
- **Admin**: `/api/v1/admin` – Admin dashboard, user management, payouts
- **Webhooks**: `/webhooks` – PayFast and OZOW payment notifications
- **Health**: `/health` – Health check endpoint

## Payment Gateways

The platform supports two South African payment gateways:
- **PayFast** – One-time payments and recurring subscriptions
- **OZOW** – Instant EFT payments

## Fee Structure

- **Buyer Processing Fee**: 3% added to the order total
- **Seller Platform Fee**: 8% deducted from seller earnings
- All funds are held in escrow until order completion

## License

Private – All rights reserved.