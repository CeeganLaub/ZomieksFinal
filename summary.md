# Zomieks Platform — Complete Summary

> Zomieks is a South African freelance marketplace platform connecting buyers with sellers for services and courses. It features escrow payments, real-time messaging, a CRM pipeline, seller analytics, BioLink pages, course hosting, KYC verification, and a comprehensive admin panel.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Architecture](#project-architecture)
3. [All Pages & Features](#all-pages--features)
   - [Public Pages](#public-pages)
   - [Authentication Pages](#authentication-pages)
   - [Buyer Dashboard Pages](#buyer-dashboard-pages)
   - [Seller Pages](#seller-pages)
   - [Admin Pages](#admin-pages)
4. [Fee Structure](#fee-structure)
5. [Payment System](#payment-system)
6. [Escrow & Payout System](#escrow--payout-system)
7. [Seller Subscription (Zomieks Pro)](#seller-subscription-zomieks-pro)
8. [Course Platform](#course-platform)
9. [CRM System](#crm-system)
10. [Real-Time Messaging](#real-time-messaging)
11. [Admin Capabilities](#admin-capabilities)
12. [Security & Infrastructure](#security--infrastructure)

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 6, TypeScript 5, TailwindCSS 3, Radix UI, TanStack Query 5, Zustand 5, React Router 6, Socket.io Client, Framer Motion, React Hook Form, Zod, @dnd-kit, PWA |
| **Backend** | Node.js 20+, Express 4, TypeScript 5, Prisma 6, PostgreSQL 15, Redis 7, Socket.io 4, BullMQ 5, JWT (access + refresh tokens), Helmet, Winston logging |
| **Edge Worker** | Cloudflare Workers, Hono framework, Drizzle ORM, D1 database, Durable Objects |
| **Payments** | PayFast (cards + recurring), Ozow (instant EFT) — both South African gateways |
| **Deployment** | Cloudflare Workers (API), Cloudflare Pages (frontend), D1, R2, KV |

---

## Project Architecture

Monorepo managed by Turborepo with npm workspaces:

```
apps/
  api/          → Express backend (Port 3000) — Prisma + PostgreSQL + Redis
  api-worker/   → Cloudflare Workers edge API (Hono + D1 + Durable Objects)
  web/          → React frontend (Port 5173) — Vite + TailwindCSS
packages/
  db/           → Drizzle ORM schema + migrations (for edge worker)
  shared/       → Shared types, Zod schemas, constants, fee utilities
```

The database schema contains **50+ models** covering users, services, orders, subscriptions, payments, conversations/CRM, courses, reviews, analytics, and more.

---

## All Pages & Features

### Public Pages

#### 1. Home Page (`/`)
- Hero section with service search bar
- Trust badges (secure payments, money-back guarantee, fast delivery, verified sellers)
- Featured category links with emoji icons
- Top-rated services grid (8 services, sorted by rating)
- Featured courses section (4 courses, sorted by popularity)
- Platform statistics (total services, sellers, categories)
- Call-to-action for buyers and sellers

#### 2. Explore Page (`/explore`)
- Unified search across services, courses, and freelancers
- Quick category navigation (top 7 categories)
- Featured services (8 cards) and featured courses (8 cards)
- Animated background with visual effects

#### 3. Services Listing (`/services`)
- Advanced search bar
- Filter sidebar: category, price range (min/max), delivery time, sort order
- Active filter badges with clear buttons
- Services grid with pagination (20 per page)
- Sort options: popular, newest, price low→high, price high→low, rating

#### 4. Service Detail (`/services/:username/:slug`)
- Service image gallery and full description
- Package/tier selector (Basic, Standard, Premium) with pricing
- Subscription tiers (if available)
- Requirements modal (project details + payment gateway selection)
- Fee breakdown showing 3% buyer service fee
- Seller info card (avatar, name, rating, member since)
- "Contact Seller" and "Save to Favorites" buttons
- Customer reviews section
- Trust badges with supported payment methods

#### 5. Seller Profile (`/sellers/:username`)
- **Two display modes:**
  - **Standard Profile** — services grid, courses grid, reviews, seller stats
  - **BioLink Storefront** — customized page with theme colors, fonts, social links
- Seller header: avatar, name, rating, verification badge, country, member since
- Services & Courses tabs, recent reviews, "Send Message" text area
- Social media links (Twitter, Instagram, LinkedIn, Facebook, YouTube, TikTok, website)

#### 6. Courses Listing (`/courses`)
- Search bar, level filter (Beginner/Intermediate/Advanced/All)
- Category dropdown, sort options (newest, popular, rating, price)
- Trust strip (money-back guarantee, lifetime access, expert sellers)
- Course grid with cards (thumbnail, title, instructor, rating, price)
- Bestseller/New badges, pagination

#### 7. Course Detail (`/courses/:slug`)
- Course hero section (title, subtitle, rating, student count, instructor)
- Sticky pricing card with enroll/buy button
- Free or paid enrollment; "Continue Learning" if enrolled
- Expandable curriculum (sections → lessons)
- "What you'll learn" and requirements sections
- Student reviews, refund policy info (24-hour window, max 30% progress)

#### 8. Course Player (`/courses/:slug/learn`)
- Full-screen video player with controls
- Top bar with course title and progress percentage
- "Mark Complete" / "Completed" toggle button
- Previous/Next lesson navigation
- Sidebar course content tree with progress indicators

#### 9. Vanity URL (`/:username`)
- Renders either the seller's **PublicWebsitePage** (if website builder configured) or their **BioLinkPage**
- Multiple BioLink templates: Services Showcase, Portfolio Gallery, Course Academy, Chat First, Classic Funnel

#### 10. Static Pages
- About (`/about`), Careers (`/careers`), Press (`/press`), Partnerships (`/partnerships`)
- Help Center (`/help`), Trust & Safety (`/trust`)
- Terms of Service (`/terms`), Privacy Policy (`/privacy`), Cookie Policy (`/cookies`)

---

### Authentication Pages

#### 11. Login (`/login`)
- Email and password form with validation
- Toast notifications for success/error
- Links to Forgot Password and Register
- Redirects to Dashboard on success

#### 12. Register (`/register`)
- Multi-field form: username, email, password, confirm password, first name, last name, country
- Validation: username (3–20 chars, alphanumeric), password (8+ chars, uppercase, number)
- Benefits sidebar, country preset to South Africa
- Terms of Service agreement required

#### 13. Forgot Password (`/forgot-password`)
- Email input form for password reset request
- Two-state UI: input form → success confirmation
- "Check your spam folder" guidance

#### 14. Reset Password (`/reset-password`)
- Token validation from URL query parameter
- New password + confirmation fields
- Password requirements: 8+ chars, uppercase, number

---

### Buyer Dashboard Pages

#### 15. Dashboard (`/dashboard`)
- Welcome message with user's first name
- Stats cards: Active Orders, Unread Messages, Active Subscriptions
- Recent orders preview (last 5)
- "Become a Seller" CTA (if not already a seller)

#### 16. Orders (`/orders`)
- Order list with status filter tabs (All, Pending, Active, Delivered, Completed)
- Stats cards: total, pending, active, completed order counts
- Order cards with seller info, service items, price, status badges
- Payment button for pending-payment orders

#### 17. Order Detail (`/orders/:id`)
- Full order details: items, seller info, timeline
- Payment section with gateway selection (PayFast / Ozow)
- Delivery files display
- Order summary with fee breakdown
- **Actions:** Accept delivery (releases escrow), Request revision, Submit review (star rating + comment), Open dispute, Cancel and refund

#### 18. Messages (`/messages`)
- Inbox with all conversations
- Search by username, name, or message content
- Filter tabs: All, Buying, Selling
- Conversation cards with avatar, name, role badge, last message, timestamp, unread count

#### 19. Conversation (`/messages/:id`)
- Real-time messaging (Socket.io)
- Message types: text, system, order updates, custom offers
- **Custom Offer System (seller only):** set price, delivery days, revisions; one-time or monthly
- **Offer Actions (buyer):** Accept → select payment gateway; Decline
- Off-platform transaction warning banner
- Order link for accepted offers

#### 20. My Courses (`/my-courses`)
- List of enrolled courses with progress tracking

#### 21. Subscriptions (`/subscriptions`)
- Active subscription management (placeholder — "Coming soon")

#### 22. Settings (`/settings`)
- User profile and account settings (placeholder — "Coming soon")

#### 23. Become a Seller (`/become-seller`)
- 4-step onboarding wizard:
  1. Welcome — overview of seller benefits
  2. Professional Profile — display name, professional title, description, skills
  3. Payment Setup — payment method selection
  4. KYC & Banking — SA ID verification, bank account details (name, account number, branch code, account type)
- Progress bar for steps

---

### Seller Pages

#### 24. Seller Dashboard (`/seller`)
- Key stats: total earnings, active orders, unread messages, average rating
- Recent orders list with buyer info and status
- Quick action links, performance metrics (response rate, completion rate, rating)

#### 25. Seller Services (`/seller/services`)
- Service card grid with thumbnails
- Status filter (Active, Pending Review, Paused)
- Service cards show: title, image, status badge, views, clicks, orders, starting price
- Actions: Edit, View public page, Delete

#### 26. Create Service (`/seller/services/new`)
- 3-step wizard:
  1. Basic Info — title, category, description, tags (up to 5), images
  2. Packages — Basic/Standard/Premium tiers with pricing, delivery days, features
  3. Review — preview and publish
- Category dropdown from platform categories

#### 27. Edit Service (`/seller/services/:id/edit`)
- Update all service fields and packages
- Toggle service status: Active, Paused, Draft

#### 28. Seller Orders (`/seller/orders`)
- Order list with status badges (Paid, In Progress, Delivered, Completed, Disputed)
- Quick stats: Active, Completed, Disputed counts
- Actions: Message buyer, Start working, Submit delivery, View details
- Net earnings display (after platform fee)

#### 29. Seller Inbox (`/seller/inbox`) / CRM (`/seller/crm`)
- CRM Pipeline (Kanban board) with 7 stages: New Leads → Contacted → Qualified → Proposal → Negotiation → Won → Lost
- Drag-and-drop conversation cards between stages
- Lead scoring system
- Unread message counts per conversation
- Custom labels, filters (All, Unread, High Score)

#### 30. Earnings (`/seller/earnings`)
- Balance cards: Available, Pending Clearance, This Month, Total Earned
- KYC verification status banner (required for payouts)
- Fee breakdown info (8% platform fee, 14-day clearance period)
- Payout history table with status (Pending/Processing/Completed/Failed)
- "Request Payout" modal (minimum R50)

#### 31. Seller Courses (`/seller/courses`)
- Course card grid with thumbnails, status badges, student count, rating, price
- Fee gate: requires R399/month Zomieks Pro subscription
- Actions: Edit, Publish/Unpublish, Delete

#### 32. Create Course (`/seller/courses/new`)
- 3-step wizard:
  1. Course Details — title, subtitle, description, category, level, price, thumbnail, promo video, learning outcomes, requirements
  2. Curriculum — add sections and lessons (with video URLs, resources)
  3. Review & Publish — preview and submit

#### 33. Seller Analytics (`/seller/analytics`)
- 6 overview KPIs: Revenue, Views, Completed Orders, Enrollments, Average Rating, Seller Level
- Monthly earnings chart (last 6 months)
- Order status breakdown with percentages
- Service performance table: views, orders, conversion rate, rating per service
- Course performance table: students, rating, revenue per course
- BioLink status summary

#### 34. BioLink Builder (`/seller/biolink`)
- **Subscription gate:** requires Zomieks Pro (R399/month)
- Design section: headline, CTA button text, theme color, background color, text color, button style, font, template selection
- 5 templates: Services Showcase, Portfolio Gallery, Course Academy, Chat First, Classic Funnel
- Social links (7 platforms), phone mockup preview
- Enable/Disable toggle, "View Live" button

#### 35. Website Builder (`/seller/website`)
- Full website builder for seller storefronts
- Accessible at the vanity URL (`/:username`)

#### 36. Project Submissions (`/seller/projects`)
- Portfolio/project submission management

---

### Admin Pages

#### 37. Admin Dashboard (`/admin`)
- Platform KPIs: Total Users, Active Sellers, Services, Total Orders
- Revenue overview: Today, Total, This Month
- Pending action counts: Disputes, Payouts, KYC
- System status indicators, quick action links

#### 38. Admin Users (`/admin/users`)
- User list with search (name, email, username)
- Filter buttons: All, Sellers, Buyers Only
- User table: avatar, name, email, role badges, order count, status, join date
- Actions: Suspend (with reason), Unsuspend

#### 39. Seller Management (`/admin/seller-management`)
- **Seller List Sidebar** — searchable list of admin-created sellers with plan badge
- **Create Seller Modal** — form with name, email, username, password, display name, title, description, skills, plan selection (Free or Pro)
- **Plan Switcher** — toggle managed sellers between Free and Pro
- **7 Management Tabs:**
  - Overview — stats cards, profile description, skills
  - Orders — all orders for that seller
  - Conversations — all buyer conversations
  - Services — manage seller's services
  - Reviews — all reviews received
  - Analytics — full seller analytics with metric override
  - Users — admin-created buyer accounts (for review seeding)
- **Add Review Modal** — select buyer, select service, set ratings, write comment; creates simulated completed order
- **Edit Stats Modal** — override rating, review count, completed orders, response time, level
- **Edit Metrics Modal** — set daily metrics (orders, revenue, delivery times, reviews)

#### 40. Admin KYC (`/admin/kyc`)
- List of pending KYC verification requests
- Verify or reject seller identity documents

#### 41. Admin Services (`/admin/services`)
- List all services across the platform
- Toggle active/inactive/rejected status
- Create services for managed sellers

#### 42. Admin Courses (`/admin/courses`)
- List all courses, change status (Published/Draft/Archived)
- Toggle featured flag

#### 43. Admin Analytics (`/admin/analytics`)
- 6-month revenue/order/user trends
- GMV (Gross Merchandise Volume)
- Order status breakdown
- Top services, top courses, conversion rate

#### 44. Admin Inbox (`/admin/inbox`)
- View all platform conversations
- Full message history access
- Flag/unflag conversations for review
- Monitor for off-platform contact attempts

#### 45. Admin Payouts (`/admin/payouts`)
- List all payout requests
- Process payouts (mark completed with bank reference)
- Reject payouts with reason

#### 46. Admin Orders (`/admin/orders`)
- List all orders with status and date filters

#### 47. Admin Disputes (`/admin/disputes`)
- List disputed orders
- Resolve by refunding buyer or releasing to seller

#### 48. Fees Page (`/admin/fees`)
- View and configure buyer processing fees and seller platform fees
- Fee breakdown calculator

#### 49. Configuration (`/admin/configuration`)
- Payment processor setup (PayFast and Ozow credentials)
- Platform settings

---

## Fee Structure

### Service/Order Fees

| Fee | Rate | Applied To | Who Pays |
|-----|------|-----------|----------|
| **Buyer Fee** | 3% of base price | Added to total | Buyer |
| **Seller Fee** | 8% of base price | Deducted from earnings | Seller |
| **Platform Revenue** | 3% + 8% = **11%** effective | Sum of both fees | Kept by Zomieks |

**Example:** A R1,000 service:
- Buyer pays: R1,000 + R30 (3% buyer fee) = **R1,030**
- Seller receives: R1,000 − R80 (8% seller fee) = **R920**
- Platform earns: R30 + R80 = **R110**

### Course Fees (Udemy-style)

| Fee | Rate |
|-----|------|
| **Platform cut** | 20% of course price |
| **Seller payout** | 80% of course price |
| **Escrow hold** | 24 hours before release |

**Example:** A R500 course:
- Buyer pays: **R500** (no additional buyer fee)
- Seller receives: R500 × 80% = **R400**
- Platform earns: R500 × 20% = **R100**

### Refund Fees — Services

| Deduction | Rate |
|-----------|------|
| Buyer fee | Non-refundable (3%) |
| Processing fee | 5% of base price |
| Refund method | Credited to buyer's on-platform credit balance |

### Refund Fees — Courses

| Condition | Must be within 24 hours AND less than 30% course progress |
|-----------|----------------------------------------------------------|
| Processing fee | 5% of course price |
| Gateway fee estimate | 3.5% + R2 (if paid via gateway; none if credit) |
| Refund method | Credited to buyer's on-platform credit balance |

### Seller Subscription Fee

| Item | Cost |
|------|------|
| **Zomieks Pro** | R399/month (recurring via PayFast) |

### Payout Configuration

| Setting | Value |
|---------|-------|
| Minimum withdrawal | R50 |
| Currency | ZAR (South African Rand) |

---

## Payment System

### Supported Payment Gateways

| Gateway | Use Cases | Type |
|---------|-----------|------|
| **PayFast** | Card payments, recurring subscriptions, seller plan payments | Cards + EFT + recurring |
| **Ozow** | Instant bank-to-bank EFT (one-time only) | Instant EFT |
| **Credit** | Internal balance (from refunds) — used for course purchases | On-platform |

### Payment Flow (Services)

1. **Buyer creates order** → `POST /api/v1/orders` — order created with `PENDING_PAYMENT` status, all fees pre-calculated
2. **Payment initiation** → `GET /api/v1/payments/initiate?orderId=X&gateway=PAYFAST|OZOW` — generates redirect URL to payment gateway
3. **Buyer completes payment** on gateway site → redirected back to Zomieks
4. **Webhook received** → `POST /webhooks/payfast` or `POST /webhooks/ozow`
   - Validates signature/hash (timing-safe comparison)
   - Verifies IP whitelist (PayFast, production only)
   - Verifies amount matches order total
   - Idempotency guard (skips if already processed)
   - In a database transaction: updates order → `IN_PROGRESS`, creates Transaction record, creates EscrowHold, notifies seller
5. **Conversation auto-created** between buyer and seller with order details

### Payment Flow (Courses)

1. `POST /api/v1/courses/:courseId/enroll`
   - **Free course:** instant enrollment
   - **Credit balance sufficient:** deducts from balance, creates enrollment + 24h escrow hold
   - **Gateway payment:** creates pending enrollment, generates PayFast/Ozow payment URL
2. Webhook confirms payment → marks enrollment as paid, creates 24h escrow hold
3. After 24 hours, escrow auto-releases to seller

### Custom Offers (In-Chat)

Sellers can send custom offers directly in conversations:
- Set price, delivery days, revisions
- One-time or monthly subscription type
- Buyer can accept (choose gateway) or decline
- Accepted offers create orders automatically

---

## Escrow & Payout System

### How Escrow Works

1. **Payment confirmed** → EscrowHold created with status `HELD`, holding the seller's payout amount
2. **Auto-release scheduled** via BullMQ queue (delay = delivery days × 24 hours for services, 24 hours for courses)
3. **Release triggers:**
   - Buyer accepts delivery → `POST /api/v1/orders/:id/accept` → immediate escrow release
   - Auto-release after delivery period expires
4. **On release:** seller amount added to a pending SellerPayout record; SellerMetrics updated

### Payout Flow

1. **Seller requests withdrawal** → `POST /api/v1/payments/withdraw` (minimum R50)
2. **Admin processes payout** → `POST /api/v1/admin/payouts/:id/process` with bank reference
3. Payout marked `COMPLETED`, seller notified

### Dispute Flow

1. Buyer or seller raises dispute → `POST /api/v1/orders/:id/dispute` → order becomes `DISPUTED`, escrow holds marked `DISPUTED`
2. Admin resolves → `POST /api/v1/admin/disputes/:orderId/resolve`:
   - **Refund buyer:** escrow refunded with fee deductions, credited to buyer's on-platform balance
   - **Release to seller:** escrow released, order marked `COMPLETED`

---

## Seller Subscription (Zomieks Pro)

| Property | Value |
|----------|-------|
| **Plan Name** | Zomieks Pro |
| **Price** | R399/month |
| **Currency** | ZAR |
| **Gateway** | PayFast (recurring, frequency code 3 = monthly) |
| **Billing** | Auto-renew indefinitely |

### What Pro Unlocks

- Ability to sell services on the platform
- Course creation and publishing
- BioLink customization and templates
- Website builder access
- CRM pipeline with lead scoring

### Subscription Lifecycle

1. **Subscribe:** `POST /api/v1/seller-subscription/subscribe` → creates pending subscription, generates PayFast recurring payment URL
2. **Activation:** Webhook confirms first payment → status = `ACTIVE`, seller fee marked as paid
3. **Renewal:** Webhook extends billing period by 1 month, records payment
4. **Cancel:** `POST /api/v1/seller-subscription/cancel` → sets `cancelAtPeriodEnd = true`, access continues until period ends
5. **Reactivate:** `POST /api/v1/seller-subscription/reactivate` → undoes pending cancellation
6. **Statuses:** `PENDING` → `ACTIVE` → `PAST_DUE` (failed payment) → `CANCELLED` / `EXPIRED`

Admin-created sellers bypass this with `sellerFeePaid: true` and a 10-year subscription.

---

## Course Platform

### Course Structure

- **Course** → **Sections** → **Lessons** (each ordered)
- Metadata: title, slug, subtitle, description, thumbnail, promo video, price, level, tags, requirements, learning outcomes
- Statuses: `DRAFT` → `PUBLISHED` → `ARCHIVED`
- Stats: enrollCount, rating, reviewCount, totalDuration

### Seller Course Management

- Requires Zomieks Pro subscription (R399/month)
- Create courses with 3-step wizard (details → curriculum → review)
- Add sections and lessons with video URLs and downloadable resources
- Publish/unpublish (requires at least 1 lesson)
- Delete (archives if enrollments exist)

### Buyer Course Experience

- Browse courses with filters (category, search, level, price, sort)
- View course detail with curriculum preview
- Enroll (free, credit balance, or gateway payment)
- Full lesson player with video, progress tracking, "Mark Complete" button
- Review courses after enrollment
- Refund within 24 hours and <30% progress

### Course Fee Split

- **80%** to seller, **20%** to platform
- 24-hour escrow hold, then auto-released
- Refund: 5% processing fee + 3.5%+R2 gateway fee estimate deducted

---

## CRM System

### Pipeline Stages (Default)

7-stage Kanban board:
1. **New Leads** → 2. **Contacted** → 3. **Qualified** → 4. **Proposal** → 5. **Negotiation** → 6. **Won** → 7. **Lost**

### CRM Features

- **Drag-and-drop** conversation cards between pipeline stages
- **Lead scoring** based on conversation activity and order history
- **Custom labels** on conversations for categorization
- **Filters:** All, Unread, High Score
- **Conversation notes** — internal notes attached to conversations
- **Saved replies** with `/shortcut` quick access
- **Auto-triggers:** automatic responses on new conversations, keyword detection, inactivity follow-ups, stage changes
- **Activity timeline** tracking all CRM actions
- **CRM analytics:** response time, conversion rates, deal pipeline value

---

## Real-Time Messaging

- **Protocol:** Socket.io (WebSocket with fallback)
- **Server namespaces:** `/chat`, `/crm`, `/notifications`, `/presence`
- **Horizontal scaling:** Redis adapter for pub/sub across instances
- **Features:**
  - Real-time text/file/image messaging
  - Typing indicators
  - Read receipts
  - System messages for order updates
  - Custom offers (Quick Offers) with accept/decline flow
  - Online/offline presence indicators
  - Unread message counts
  - Off-platform communication warning banner on all conversations

---

## Admin Capabilities

| Capability | Description |
|------------|-------------|
| **Dashboard** | Platform KPIs, revenue overview, pending actions, system status |
| **User Management** | Search, filter, create buyer accounts, suspend/unsuspend users |
| **Seller Management** | Create managed sellers (with Free or Pro plan), switch plans, override stats/metrics, view full seller data, seed reviews with simulated orders |
| **KYC Verification** | Approve or reject seller identity documents |
| **Order Management** | View all orders with filters |
| **Dispute Resolution** | Resolve by refunding buyer or releasing to seller |
| **Payout Processing** | Process seller withdrawals via bank transfer, reject with reason |
| **Service Management** | Activate/deactivate/reject services, create services for managed sellers |
| **Course Management** | Publish/archive courses, toggle featured |
| **Category Management** | CRUD for service categories with hierarchy |
| **Conversation Inbox** | View all conversations, flag for off-platform communication |
| **Platform Analytics** | 6-month trends (revenue, orders, users), GMV, top services/courses |
| **Review Seeding** | Create reviews with simulated completed orders for marketing |
| **Fee Configuration** | Configure buyer and seller fee percentages |
| **Platform Configuration** | Payment gateway credentials, general settings |

---

## Security & Infrastructure

### Authentication & Authorization

- **JWT tokens:** 15-minute access tokens, 7-day refresh tokens
- **RBAC roles:** BUYER, SELLER, ADMIN, MODERATOR, SUPPORT, FINANCE, SUPER_ADMIN
- **Session management** with Redis for logout-all functionality
- **Password hashing** with bcrypt

### Security Middleware

- **Helmet** — security headers with CSP
- **express-rate-limit** — tiered sliding window rate limiting backed by Redis
- **CORS** — origin-restricted with credentials
- **Zod validation** — all request inputs validated via shared schemas
- **Webhook signature verification:** PayFast ITN signature validation + IP whitelisting; Ozow SHA512 hash verification

### Background Jobs (BullMQ)

- **Escrow release** — delayed release after delivery period
- **Notifications** — in-app and email notifications
- **CRM inactivity check** — hourly check for auto-trigger follow-ups
- **Token cleanup** — daily expired refresh token purging
- **Payout processing** — scheduled seller payouts

### Platform Policies

- **Off-platform communication warning:** All conversations display a prominent banner reminding users to keep communication on Zomieks. Disputes involving off-platform conversations cannot be resolved or refunded.
- **Escrow protection:** All funds held in escrow until order completion or delivery acceptance.
- **KYC requirement:** Sellers must complete identity verification before withdrawing earnings.

### Deployment

- **Production:** Cloudflare Workers (API) + Cloudflare Pages (frontend) + D1 (database) + R2 (file storage) + KV (cache/sessions)
- **Local development:** PostgreSQL + Redis + Express + Vite dev servers
- **Estimated cost:** ~$50–150/month for 100k users on Cloudflare Workers Paid Plan ($5/month base)

---

## API Route Summary

All API routes prefixed with `/api/v1/`:

| Route | Description |
|-------|-------------|
| `/auth` | Register, login, refresh tokens, password reset |
| `/users` | Profile management, seller onboarding, seller analytics, BioLink |
| `/services` | Service CRUD, packages, reviews, favorites, categories |
| `/orders` | Order lifecycle, deliveries, revisions, disputes, accept |
| `/courses` | Course CRUD, sections, lessons, enrollments, progress, reviews, refunds |
| `/subscriptions` | Buyer subscription management |
| `/seller-subscription` | Seller Pro plan (R399/month) subscription management |
| `/conversations` | Messaging, custom offers, CRM pipeline stages, labels |
| `/payments` | PayFast & Ozow payment initiation, earnings, balance, withdrawals |
| `/uploads` | Image and file uploads |
| `/admin` | Dashboard stats, user/seller/service/course/order/dispute/payout management, analytics, inbox, KYC, fees, configuration |
| `/webhooks` | PayFast ITN, Ozow callback, subscription webhooks (no auth — signature-verified) |
| `/health` | Health check endpoint |
