# Zomieks Platform — Pages, Features & Connections

> This document maps every page in the Zomieks platform, the features available on each page, the backend API endpoints each page connects to, and how pages link to one another.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Page Inventory](#page-inventory)
3. [Public Pages](#1-public-pages)
4. [Authentication Pages](#2-authentication-pages)
5. [Buyer Dashboard Pages](#3-buyer-dashboard-pages)
6. [Seller Pages](#4-seller-pages)
7. [Admin Pages](#5-admin-pages)
8. [Navigation Structure](#navigation-structure)
9. [Feature-to-Page Matrix](#feature-to-page-matrix)
10. [API Endpoint Map](#api-endpoint-map)

---

## Platform Overview

Zomieks is a full-stack freelance marketplace platform built with:

- **Frontend**: React + Vite + TailwindCSS + TanStack Query + Zustand
- **Backend**: Express + Prisma + PostgreSQL + Redis + BullMQ
- **Real-time**: Socket.io for messaging
- **Payments**: PayFast + Ozow (South African gateways)

The platform has **41 pages** organized into 5 groups, backed by **12 API route files** with **100+ endpoints**.

---

## Page Inventory

| # | Page | Route | Auth Required | Role |
|---|------|-------|---------------|------|
| **Public Pages** | | | | |
| 1 | Home Page | `/` | No | Any |
| 2 | Explore Page | `/explore` | No | Any |
| 3 | Services Listing | `/services` | No | Any |
| 4 | Service Detail | `/services/:username/:slug` | No (Yes to order) | Any |
| 5 | Seller Profile | `/sellers/:username` | No | Any |
| 6 | Courses Listing | `/courses` | No | Any |
| 7 | Course Detail | `/courses/:slug` | No (Yes to enroll) | Any |
| 8 | Course Player | `/courses/:slug/learn` | Yes | Enrolled user |
| **Auth Pages** | | | | |
| 9 | Login | `/login` | No | Any |
| 10 | Register | `/register` | No | Any |
| 11 | Forgot Password | `/forgot-password` | No | Any |
| 12 | Reset Password | `/reset-password` | No | Any |
| **Buyer Dashboard** | | | | |
| 13 | Dashboard | `/dashboard` | Yes | Buyer |
| 14 | Orders | `/orders` | Yes | Buyer |
| 15 | Order Detail | `/orders/:id` | Yes | Buyer |
| 16 | Messages | `/messages` | Yes | Buyer |
| 17 | Conversation | `/messages/:id` | Yes | Buyer |
| 18 | Subscriptions | `/subscriptions` | Yes | Buyer |
| 19 | Settings | `/settings` | Yes | Buyer |
| 20 | Become a Seller | `/become-seller` | Yes | Buyer |
| **Seller Pages** | | | | |
| 21 | Seller Dashboard | `/seller` | Yes | Seller |
| 22 | Seller Services | `/seller/services` | Yes | Seller |
| 23 | Create Service | `/seller/services/new` | Yes | Seller |
| 24 | Edit Service | `/seller/services/:id/edit` | Yes | Seller |
| 25 | Seller Orders | `/seller/orders` | Yes | Seller |
| 26 | CRM (Pipeline) | `/seller/crm` | Yes | Seller |
| 27 | Earnings | `/seller/earnings` | Yes | Seller |
| 28 | Seller Courses | `/seller/courses` | Yes | Seller |
| 29 | Create Course | `/seller/courses/new` | Yes | Seller |
| 30 | Seller Analytics | `/seller/analytics` | Yes | Seller |
| 31 | BioLink Builder | `/seller/biolink` | Yes | Seller |
| **Admin Pages** | | | | |
| 32 | Admin Dashboard | `/admin` | Yes | Admin |
| 33 | Seller Management | `/admin/seller-management` | Yes | Admin |
| 34 | Admin Users | `/admin/users` | Yes | Admin |
| 35 | Admin KYC | `/admin/kyc` | Yes | Admin |
| 36 | Admin Services | `/admin/services` | Yes | Admin |
| 37 | Admin Courses | `/admin/courses` | Yes | Admin |
| 38 | Admin Analytics | `/admin/analytics` | Yes | Admin |
| 39 | Admin Inbox | `/admin/inbox` | Yes | Admin |
| 40 | Fees & Calculations | `/admin/fees` | Yes | Admin |
| 41 | Configuration | `/admin/configuration` | Yes | Admin |

---

## 1. Public Pages

### 1.1 Home Page (`/`)

**Features:**
- Hero section with service search bar
- Trust badges (secure payments, money-back guarantee, fast delivery, verified sellers)
- Featured category links with emoji icons
- Top-rated services grid (8 services, sorted by rating)
- Featured courses section (4 courses, sorted by popularity)
- Platform statistics (total services, sellers, categories)
- Call-to-action for buyers and sellers

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services/meta/categories` | Load category list |
| GET | `/services?limit=8&sortBy=rating` | Load featured services |
| GET | `/courses?limit=4&sort=popular` | Load featured courses |
| GET | `/services/meta/stats` | Load platform statistics |

**Connects To:**
- → **Services Listing** (`/services`) — "View all services" link
- → **Courses Listing** (`/courses`) — "View all courses" link
- → **Service Detail** (`/services/:username/:slug`) — clicking a service card
- → **Course Detail** (`/courses/:slug`) — clicking a course card
- → **Services Listing** (`/services?category=:slug`) — clicking a category
- → **Register** (`/register`) — CTA buttons

---

### 1.2 Explore Page (`/explore`)

**Features:**
- Hero section with unified search (services, courses, freelancers)
- Quick category navigation (top 7 categories)
- Featured services section (8 cards, sorted by rating)
- Featured courses section (8 cards, sorted by popularity)
- Animated background with visual effects

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services?limit=8&sortBy=rating` | Load featured services |
| GET | `/courses?limit=8&sort=popular` | Load featured courses |
| GET | `/services/meta/categories` | Load categories |

**Connects To:**
- → **Services Listing** (`/services?search=:query`) — search submission
- → **Services Listing** (`/services?category=:slug`) — category click
- → **Service Detail** (`/services/:username/:slug`) — service card click
- → **Course Detail** (`/courses/:slug`) — course card click
- → **Services Listing** (`/services`) — "View all services"
- → **Courses Listing** (`/courses`) — "View all courses"

---

### 1.3 Services Listing (`/services`)

**Features:**
- Advanced search bar
- Filter sidebar: category, price range (min/max), delivery time, sort order
- Active filter badges with clear buttons
- Services grid with pagination (20 per page)
- Sort options: popular, newest, price low→high, price high→low, rating
- Loading skeleton cards
- Result count display

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services?category&search&minPrice&maxPrice&sortBy&page&limit` | Load services with filters |
| GET | `/services/meta/categories` | Load category list |

**Connects To:**
- → **Service Detail** (`/services/:username/:slug`) — clicking a service card

---

### 1.4 Service Detail (`/services/:username/:slug`)

**Features:**
- Service image gallery
- Full service description with rich text
- Package/tier selector (Basic, Standard, Premium) with pricing
- Subscription tiers (if available)
- Requirements modal (project details + payment gateway selection)
- Fee breakdown (3% buyer service fee)
- Seller info card (avatar, display name, rating, member since)
- "Contact Seller" button
- "Save to Favorites" button
- Customer reviews section
- Trust badges (secure payment, supported payment methods)

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services/:username/:slug` | Load service details |
| POST | `/orders` | Create order with requirements |
| POST | `/conversations/start` | Start conversation with seller |

**Connects To:**
- → **Seller Profile** (`/sellers/:username`) — clicking seller name
- → **Conversation** (`/messages/:id`) — after contacting seller
- → **Order Detail** (`/orders/:id?payment=pending`) — after placing order
- → **Login** (`/login`) — if not authenticated

---

### 1.5 Seller Profile (`/sellers/:username`)

**Features:**
- Two display modes:
  - **Standard Profile**: services grid, courses grid, reviews, seller stats
  - **BioLink Storefront**: customized page with theme colors, fonts, social links
- Seller header: avatar, name, rating, verification badge, country, member since
- Services & Courses tabs
- Recent reviews section
- "Send Message" text area
- Social media links (Twitter, Instagram, LinkedIn, Facebook, YouTube, TikTok, website)

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/:username` | Load seller profile |
| POST | `/conversations/start` | Start conversation |

**Connects To:**
- → **Service Detail** (`/services/:username/:slug`) — clicking a service
- → **Course Detail** (`/courses/:slug`) — clicking a course
- → **Conversation** (`/messages/:id`) — after sending message
- → **Explore** (`/explore`) — if seller not found

---

### 1.6 Courses Listing (`/courses`)

**Features:**
- Search bar for courses
- Level filter (All Levels, Beginner, Intermediate, Advanced)
- Category dropdown
- Sort options (newest, popular, rating, price low→high, price high→low)
- Trust strip (money-back guarantee, lifetime access, expert sellers)
- Course grid with cards (thumbnail, title, instructor, rating, price)
- Bestseller/New badges
- Pagination

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/courses?category&search&level&sort&page&limit` | Load courses with filters |
| GET | `/services/meta/categories` | Load categories |

**Connects To:**
- → **Course Detail** (`/courses/:slug`) — clicking a course card

---

### 1.7 Course Detail (`/courses/:slug`)

**Features:**
- Course hero section (title, subtitle, rating, student count, instructor info)
- Sticky pricing card with enroll/buy button
- Free or paid enrollment
- "Continue Learning" button (if already enrolled)
- "Message Instructor" button
- Expandable sections/lessons curriculum list
- "What you'll learn" section
- Requirements section
- Course description
- Student reviews
- Refund policy (24-hour window, max progress threshold, fee breakdown)
- Refund confirmation modal

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/courses/:slug` | Load course details |
| POST | `/courses/:courseId/enroll` | Enroll in course |
| POST | `/courses/:courseId/refund` | Request course refund |
| POST | `/conversations/start` | Message instructor |

**Connects To:**
- → **Course Player** (`/courses/:slug/learn`) — "Start Learning" / "Continue Learning"
- → **Conversation** (`/messages/:id`) — after messaging instructor
- → **Login** (`/login`) — if not authenticated

---

### 1.8 Course Player (`/courses/:slug/learn`)

**Features:**
- Full-screen video player with controls
- Top bar with course title and progress percentage
- Lesson info bar (section name, lesson title)
- "Mark Complete" / "Completed" button
- Previous/Next lesson navigation
- Sidebar with course content tree (sections → lessons)
- Progress bar with completed lessons count
- Lesson resources/downloads
- Auto-selects first incomplete lesson
- Completed lessons checkmark indicators

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/courses/:slug` | Load course to get ID |
| GET | `/courses/:courseId/learn` | Load course content & enrollment |
| POST | `/courses/:courseId/lessons/:lessonId/complete` | Mark lesson complete |

**Connects To:**
- → **Course Detail** (`/courses/:slug`) — back button

---

## 2. Authentication Pages

### 2.1 Login (`/login`)

**Features:**
- Email and password form with validation
- Loading state during submission
- Toast notifications for success/error
- Animated form transitions

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Authenticate user |

**Connects To:**
- → **Forgot Password** (`/forgot-password`) — "Forgot password?" link
- → **Register** (`/register`) — "Join now" link
- → **Dashboard** (`/dashboard`) — on successful login

---

### 2.2 Register (`/register`)

**Features:**
- Multi-field form: username, email, password, confirm password, first name, last name, country
- Validation: username (3–20 chars, alphanumeric), password (8+ chars, uppercase, number)
- Benefits sidebar: "Access to 1000+ freelancers", "Secure escrow payments", "Money-back guarantee"
- Country preset to South Africa
- Terms of Service & Privacy Policy agreement
- Animated form fields

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register` | Create user account |

**Connects To:**
- → **Login** (`/login`) — "Sign in" link
- → **Services Listing** (`/services`) — on successful registration

---

### 2.3 Forgot Password (`/forgot-password`)

**Features:**
- Email input form for password reset request
- Two-state UI: input form → success confirmation
- "Check your spam folder" guidance

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/forgot-password` | Send password reset email |

**Connects To:**
- → **Login** (`/login`) — "Back to sign in" link

---

### 2.4 Reset Password (`/reset-password`)

**Features:**
- Token validation from URL query parameters (`?token=...`)
- New password + confirmation fields
- Password requirements: 8+ chars, uppercase, number
- Invalid token error card

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/reset-password` | Reset password with token |

**Connects To:**
- → **Forgot Password** (`/forgot-password`) — "Request new link" (if token invalid)
- → **Login** (`/login`) — on successful reset

---

## 3. Buyer Dashboard Pages

### 3.1 Dashboard (`/dashboard`)

**Features:**
- Welcome message with user's first name
- Stats cards: Active Orders, Unread Messages, Active Subscriptions
- Recent orders preview (last 5 orders)
- "Become a Seller" CTA (if user is not already a seller)

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/orders/buying?limit=5` | Load recent orders |

**Connects To:**
- → **Become a Seller** (`/become-seller`) — CTA button
- → **Orders** (`/orders`) — "View all orders"
- → **Services Listing** (`/services`) — "Browse services"

---

### 3.2 Orders (`/orders`)

**Features:**
- Order list with status filter tabs (All, Pending, Active, Delivered, Completed)
- Stats cards: total, pending, active, completed order counts
- Order cards with seller info, service items, price, status badges
- Payment button for pending-payment orders
- Empty state with CTA to browse services

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/orders/buying` | Load all buyer orders |

**Connects To:**
- → **Order Detail** (`/orders/:id`) — clicking an order
- → **Services Listing** (`/services`) — "Browse services" (empty state)

---

### 3.3 Order Detail (`/orders/:id`)

**Features:**
- Full order details: items, seller info, timeline
- Payment section with gateway selection (PayFast / Ozow)
- Delivery files display
- Order summary with fee breakdown
- **Actions:**
  - Accept delivery (releases escrow)
  - Request revision (with reason)
  - Open dispute
  - Cancel & refund (with confirmation and fee breakdown)
  - Submit review (star rating + comment, after acceptance)

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/orders/:id` | Load order details |
| GET | `/payments/initiate?orderId=:id&gateway=:gw` | Get payment URL |
| POST | `/orders/:id/accept` | Accept delivery |
| POST | `/orders/:id/revision` | Request revision |
| POST | `/orders/:id/review` | Submit review |
| POST | `/orders/:id/dispute` | Open dispute |
| POST | `/orders/:id/cancel` | Cancel and refund |

**Connects To:**
- → **Orders** (`/orders`) — back link
- → **Service Detail** (`/services/:username/:slug`) — service link
- → **Seller Profile** (`/sellers/:username`) — seller link
- → **Conversation** (`/messages/:sellerId`) — "Message Seller"

---

### 3.4 Messages (`/messages`)

**Features:**
- Inbox with all conversations
- Search by username, name, or message content
- Filter tabs: All, Buying, Selling (sellers only see selling tab)
- Conversation cards: avatar, name, role badge, last message, timestamp, unread count
- Empty state

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/conversations` | Load conversations (via chat store) |

**Connects To:**
- → **Conversation** (`/messages/:id`) — clicking a conversation

---

### 3.5 Conversation (`/messages/:id`)

**Features:**
- Real-time messaging interface (Socket.io)
- Message types: text, system, order updates, custom offers
- **Custom Offer System (seller only):**
  - Set price, delivery days, revisions
  - One-time or monthly offer type
- **Offer Actions (buyer):**
  - Accept offer → select payment gateway (PayFast/Ozow/PayFast-only for monthly)
  - Decline offer
- Off-platform transaction warning banner
- Order link for accepted offers

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/conversations/:id` | Load conversation & messages (via chat store) |
| POST | `/conversations/:id/messages` | Send message (via chat store) |
| POST | `/conversations/:id/offer` | Send custom offer (seller) |
| POST | `/conversations/:id/offer/:messageId/accept` | Accept offer (buyer) |
| POST | `/conversations/:id/offer/:messageId/decline` | Decline offer (buyer) |

**Connects To:**
- → **Messages** (`/messages`) — back button
- → **Order Detail** (`/orders/:orderId`) — accepted offer order link

---

### 3.6 Subscriptions (`/subscriptions`)

**Features:**
- Placeholder — "Coming soon" message

**Connects To:** None currently

---

### 3.7 Settings (`/settings`)

**Features:**
- Placeholder — "Coming soon" message

**Connects To:** None currently

---

### 3.8 Become a Seller (`/become-seller`)

**Features:**
- 4-step onboarding wizard:
  1. **Welcome** — overview of seller benefits
  2. **Plan Selection** — Free Plan vs. Pro Plan (R399/month)
  3. **Profile Info** — display name, professional title, skills, languages
  4. **KYC & Banking** — SA ID verification, bank account details (name, account number, branch code, account type)
- Progress bar for steps

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/users/become-seller` | Submit seller onboarding |
| POST | `/users/seller/pay-fee` | Pay seller fee |

**Connects To:**
- → **Seller Dashboard** (`/seller`) — on successful onboarding
- → **Settings** (`/settings`) — to update country to ZA first

---

## 4. Seller Pages

### 4.1 Seller Dashboard (`/seller`)

**Features:**
- Key stats overview: total earnings, active orders, unread messages, average rating
- Recent orders list with buyer info and status
- Quick action links to seller sections
- Performance metrics: response rate, order completion rate, customer rating

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/payments/earnings` | Load earnings data |
| GET | `/orders/selling` | Load seller orders |

**Connects To:**
- → **Seller Services** (`/seller/services`) — quick action
- → **Seller Orders** (`/seller/orders`) — quick action
- → **CRM** (`/seller/crm`) — quick action
- → **Earnings** (`/seller/earnings`) — quick action
- → **BioLink Builder** (`/seller/biolink`) — quick action
- → **Create Service** (`/seller/services/new`) — CTA

---

### 4.2 Seller Services (`/seller/services`)

**Features:**
- Service card grid with thumbnails
- Status filter (Active, Pending Review, Paused)
- Service cards show: title, image, status badge, views, clicks, orders, starting price
- Actions per service: Edit, View public page, Delete
- Empty state with "Create your first service" CTA

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services` (seller's own) | Load seller's services |
| DELETE | `/services/:id` | Delete a service |

**Connects To:**
- → **Create Service** (`/seller/services/new`) — "Create New" button
- → **Edit Service** (`/seller/services/:id/edit`) — edit button
- → **Service Detail** (`/services/:username/:slug`) — view public link

---

### 4.3 Create Service (`/seller/services/new`)

**Features:**
- 3-step creation wizard:
  1. **Basic Info** — title, category, description, tags (up to 5), images
  2. **Pricing** — packages (Basic/Standard/Premium) with name, description, price, delivery days, revisions, features
  3. **Review** — preview and publish
- Category dropdown from platform categories
- Rich text description

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services/meta/categories` | Load category list |
| POST | `/services` | Create service |
| POST | `/services/:id/packages` | Add package to service |

**Connects To:**
- → **Seller Services** (`/seller/services`) — back link, after creation

---

### 4.4 Edit Service (`/seller/services/:id/edit`)

**Features:**
- Update all service fields (title, category, description, tags, images)
- Update or add packages (Basic/Standard/Premium)
- Toggle service status: Active, Paused, Draft

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services/:id` | Load service for editing |
| PATCH | `/services/:id` | Update service |
| PATCH | `/services/:id/packages/:packageId` | Update package |
| POST | `/services/:id/packages` | Add new package |

**Connects To:**
- → **Seller Services** (`/seller/services`) — back link

---

### 4.5 Seller Orders (`/seller/orders`)

**Features:**
- Order list with status badges (Paid, In Progress, Delivered, Completed, Disputed)
- Quick stats: Active, Completed, Disputed counts
- **Actions per order:**
  - Message buyer
  - Start order (move from Paid → In Progress)
  - Mark as delivered (upload deliverables)
  - View details
- Net earnings display (after platform fee)

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/orders/selling` | Load seller orders |
| PATCH | `/orders/:id/start` | Start working on order |
| POST | `/orders/:id/deliver` | Submit delivery |

**Connects To:**
- → **Conversation** (`/messages/:buyerId`) — "Message Buyer"
- → **Order Detail** (`/orders/:id`) — "View Details"

---

### 4.6 CRM Pipeline (`/seller/crm`)

**Features:**
- Kanban board with 7 pipeline stages:
  - New Leads → Contacted → Qualified → Proposal → Negotiation → Won → Lost
- Drag-and-drop conversation cards between stages
- Lead scoring system
- Unread message counts per conversation
- Custom labels on conversations
- Filter by: All, Unread, High Score

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/conversations` | Load conversations |
| PATCH | `/conversations/:id` | Move conversation to stage |

**Connects To:**
- → **Conversation** (`/messages/:id`) — clicking a conversation card

---

### 4.7 Earnings (`/seller/earnings`)

**Features:**
- Balance cards: Available, Pending Clearance, This Month, Total Earned
- KYC verification status banner (required for payouts)
- Fee breakdown info (8% platform fee, 14-day clearance period)
- Payout history table with status (Pending/Processing/Completed/Failed)
- "Request Payout" modal (minimum R100)

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/payments/balance` | Load balance info |
| GET | `/payments/payouts` | Load payout history |
| GET | `/payments/earnings` | Load earnings summary |
| GET | `/users/seller/fee-status` | Load KYC status |
| POST | `/payments/withdraw` | Request payout |

**Connects To:** Standalone page (no direct links to other pages)

---

### 4.8 Seller Courses (`/seller/courses`)

**Features:**
- Course card grid with thumbnails
- Course status badges (Published, Draft, Archived)
- Student count, rating, and price per course
- **Fee gate:** Requires R399 one-time payment to unlock course creation
- Actions: Edit, Publish/Unpublish, Delete

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/seller/fee-status` | Check if fee is paid |
| POST | `/users/seller/pay-fee` | Pay course access fee |
| GET | `/courses/seller/my` | Load seller's courses |
| POST | `/courses/seller/:courseId/publish` | Publish/unpublish course |
| DELETE | `/courses/seller/:courseId` | Delete course |

**Connects To:**
- → **Create Course** (`/seller/courses/new`) — "Create Course" button
- → **Edit Course** (inline editing or detail view)

---

### 4.9 Create Course (`/seller/courses/new`)

**Features:**
- 3-step creation wizard:
  1. **Course Details** — title, subtitle, description, category, level, price, thumbnail URL, promo video URL, learning outcomes, requirements
  2. **Content** — add sections with lessons (title, video URL, duration, free preview toggle)
  3. **Review & Publish** — preview and submit
- Category and level dropdowns

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services/meta/categories` | Load categories |
| POST | `/courses/seller/create` | Create course |
| POST | `/courses/seller/:courseId/sections` | Add section |
| POST | `/courses/seller/sections/:sectionId/lessons` | Add lesson |
| POST | `/courses/seller/:courseId/publish` | Publish course |

**Connects To:**
- → **Seller Courses** (`/seller/courses`) — back link, after creation

---

### 4.10 Seller Analytics (`/seller/analytics`)

**Features:**
- 6 overview KPIs: Revenue, Views, Completed Orders, Enrollments, Average Rating, Seller Level
- Monthly earnings chart (last 6 months)
- Order status breakdown with percentages
- Service performance table: views, orders, conversion rate, rating per service
- Course performance table: students, rating, estimated revenue per course
- BioLink status summary

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/seller/analytics` | Load all analytics data |

**Connects To:**
- → **Seller Services** (`/seller/services`) — "Manage Services"
- → **Create Service** (`/seller/services/new`) — "Create Service"
- → **Seller Courses** (`/seller/courses`) — "Manage Courses"
- → **Create Course** (`/seller/courses/new`) — "Create Course"
- → **BioLink Builder** (`/seller/biolink`) — "Edit BioLink"

---

### 4.11 BioLink Builder (`/seller/biolink`)

**Features:**
- **Subscription gate:** Requires Zomieks Pro subscription (R399/month)
- **Design Section:**
  - Headline & CTA button text
  - 6 theme presets (Emerald Dark, Neon Rose, Gold Night, Clean Blue, Purple Light, Ocean)
  - Custom color pickers (background, text, accent)
  - Font selection (Inter, Poppins, Roboto, Playfair Display, Space Grotesk, DM Sans)
  - Button style selector (Rounded, Pill, Square, Outline)
  - Mini live preview
- **Social Links Section:** Add/remove links for 7 platforms (Twitter, Instagram, LinkedIn, Facebook, YouTube, TikTok, Website)
- **Preview Section:** Phone-style mockup of BioLink storefront
- Enable/Disable toggle
- "View Live" button

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/seller-subscription/status` | Check subscription |
| POST | `/seller-subscription/subscribe` | Subscribe to Pro |
| GET | `/users/seller/biolink` | Load BioLink settings |
| PUT | `/users/seller/biolink` | Save BioLink settings |
| POST | `/users/seller/biolink/toggle` | Enable/disable BioLink |

**Connects To:**
- → **Seller Profile** (`/sellers/:username`) — "View Live" link

---

## 5. Admin Pages

### 5.1 Admin Dashboard (`/admin`)

**Features:**
- Platform KPIs: Total Users, Active Sellers, Services, Total Orders
- Revenue overview: Today, Total, This Month
- Pending action counts: Disputes, Payouts, KYC
- System status indicators
- Quick action links to all admin sections

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/stats` | Load dashboard statistics |
| GET | `/admin/sellers/pending-kyc` | Load pending KYC count |

**Connects To:**
- → **Admin Users** (`/admin/users`)
- → **Seller Management** (`/admin/seller-management`)
- → **Admin KYC** (`/admin/kyc`)
- → **Admin Services** (`/admin/services`)
- → **Fees** (`/admin/fees`)
- → **Configuration** (`/admin/configuration`)

---

### 5.2 Seller Management (`/admin/seller-management`)

**Features:**
- **Seller List Sidebar** – Searchable list of admin-created sellers with plan badge (Pro/Free), service count, order count, and rating
- **Seller Switcher** – Click any seller to load their full dashboard data (orders, conversations, services, reviews, analytics)
- **Create Seller Modal** – Form with name, email, username, password, display name, professional title, description, skills, and plan selection (Free or Pro R399/mo)
- **Plan Switcher** – Toggle managed sellers between Free and Pro plans
- **7 Management Tabs:**
  - **Overview** – Stats cards (completed orders, rating, reviews, services, level, on-time rate), profile description and skills
  - **Orders** – Table of seller's orders (order number, buyer, service, status, amount, date)
  - **Inbox** – Seller's conversations (buyer avatar, last message, message count)
  - **Services** – Grid of seller's services (title, category, order count, review count, price)
  - **Reviews** – List of received reviews (author, rating stars, comment, service, date)
  - **Analytics** – Metrics table (date, orders received/completed, gross/net revenue, avg rating) with Add/Edit Metrics modal
  - **Users** – Admin-created buyer accounts table (for review seeding)
- **Add Review Modal** – Select user (from admin-created buyers), select service, set overall + sub-ratings (communication, quality, value), write comment; creates a simulated completed order
- **Edit Stats Modal** – Override seller profile stats: rating, review count, completed orders, response time, on-time rate, level
- **Edit Metrics Modal** – Set daily seller metrics: orders, revenue, delivery times, reviews for analytics display

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/admin/sellers/create` | Create seller account with plan |
| GET | `/admin/sellers/managed` | List admin-created sellers |
| GET | `/admin/sellers/managed/:id` | Get seller full detail (orders, conversations, reviews, metrics) |
| PATCH | `/admin/sellers/managed/:id/plan` | Switch seller plan (free/pro) |
| PATCH | `/admin/sellers/managed/:id/profile` | Update seller profile |
| PATCH | `/admin/sellers/managed/:id/stats` | Override seller stats (rating, level, etc.) |
| POST | `/admin/sellers/managed/:id/metrics` | Upsert daily seller metrics |
| GET | `/admin/sellers/managed/:id/metrics` | Get seller metrics history |
| POST | `/admin/users/create` | Create buyer user (for reviews) |
| GET | `/admin/users/managed` | List admin-created buyers |
| POST | `/admin/reviews/create` | Create review with simulated order |

**Connects To:**
- Uses admin-created users from **Users tab** to seed reviews
- Seller data feeds into public **Service PDP** and **Seller Profile** pages

---

### 5.3 Admin Users (`/admin/users`)

**Features:**
- User list with search (name, email, username)
- Filter buttons: All, Sellers, Buyers Only
- User table: avatar, name, email, role badges, order count, status, join date
- Pagination (20 per page)
- **Actions:** Suspend user (with reason prompt), Unsuspend user

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/users?page&limit&search&isSeller` | Load users |
| POST | `/admin/users/:id/suspend` | Suspend user |
| POST | `/admin/users/:id/unsuspend` | Unsuspend user |

**Connects To:** Standalone page

---

### 5.4 Admin KYC (`/admin/kyc`)

**Features:**
- List of sellers pending KYC verification
- Seller details: name, email, country, ID number (masked), bank details (masked)
- **Actions:** Approve KYC, Reject KYC

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/sellers/pending-kyc` | Load pending sellers |
| POST | `/admin/sellers/:userId/verify-kyc` | Approve or reject |

**Connects To:** Standalone page

---

### 5.5 Admin Services (`/admin/services`)

**Features:**
- Service list with search and status filter (All, Active, Inactive)
- Service table: title, seller, category, price range, rating, status
- Pagination (20 per page)
- **Actions:** Activate/Deactivate service, View service public page

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/services?page&limit&search&status` | Load services |
| PATCH | `/admin/services/:id` | Toggle active status |

**Connects To:**
- → **Service Detail** (`/services/:username/:slug`) — "View" link (external)

---

### 5.6 Admin Courses (`/admin/courses`)

**Features:**
- Course list with search and status filter (All, Published, Draft, Archived)
- Course table: title, instructor, price, students, rating, status
- Pagination (20 per page)
- **Actions:** Publish/Archive course, View course public page

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/courses?page&limit&search&status` | Load courses |
| PATCH | `/admin/courses/:id` | Update course status |

**Connects To:**
- → **Course Detail** (`/courses/:slug`) — "View" link (external)

---

### 5.7 Admin Analytics (`/admin/analytics`)

**Features:**
- Platform KPIs: Users, Sellers, Orders, GMV, Platform Revenue, Seller Payouts, Services, Courses, Enrollments, Conversations, Conversion Rate
- Monthly data charts: revenue, orders, new users (last 6 months)
- Order status breakdown with amounts
- Top 10 services by orders (with conversion metrics)
- Top 10 courses by enrollments
- Revenue breakdown: GMV vs. Platform Revenue vs. Seller Payouts

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/analytics` | Load all platform analytics |

**Connects To:** Standalone analytics view

---

### 5.8 Admin Inbox (`/admin/inbox`)

**Features:**
- Conversation list with search and flagged filter
- Conversation cards: participants, order association, message count, flag status
- Conversation detail viewer with full message thread
- System vs. user message distinction
- **Actions:** Flag conversation for review, Unflag conversation

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/conversations?page&limit&search&flagged` | Load conversations |
| GET | `/admin/conversations/:id` | Load conversation detail |
| POST | `/admin/conversations/:id/flag` | Flag conversation |
| POST | `/admin/conversations/:id/unflag` | Unflag conversation |

**Connects To:** Standalone review page

---

### 5.9 Fees & Calculations (`/admin/fees`)

**Features:**
- Active fee policy display (buyer %, seller %, course %, gateway fees)
- Fee calculator with live preview (buyer pays, seller receives, platform revenue)
- Fee policy CRUD (create, update, activate, delete policies)
- Seller tier management (tier names, fee overrides)
- Reserve period and payout minimum configuration

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/settings/fees` | Load all fee policies |
| GET | `/admin/settings/fees/active` | Load active policy |
| POST | `/admin/settings/fees` | Create fee policy |
| PATCH | `/admin/settings/fees/:id` | Update fee policy |
| POST | `/admin/settings/fees/:id/activate` | Activate policy |
| DELETE | `/admin/settings/fees/:id` | Delete policy |
| POST | `/admin/settings/fees/preview` | Preview fee calculation |

**Connects To:**
- → **Admin Dashboard** (`/admin`) — navigation link

---

### 5.10 Configuration (`/admin/configuration`)

**Features:**
- Configuration categories:
  - SMTP (email host, port, user, password, from address)
  - PayFast (merchant ID, key, passphrase, sandbox mode)
  - Ozow (site code, private key, API key, sandbox mode)
  - Cloudflare (account ID, API token, zone ID)
  - SMS (provider, API key, sender ID)
  - Platform (name, URL, support email, max upload size, maintenance mode)
  - Banking (default bank, branch code, account type)
- Custom configuration key/value support
- Secret value masking
- Individual and bulk save
- Expandable category sections

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/settings/config` | Load all config |
| PATCH | `/admin/settings/config/:category/:key` | Update setting |
| POST | `/admin/settings/config` | Create custom config |
| POST | `/admin/settings/config/bulk` | Bulk save config |
| DELETE | `/admin/settings/config/:category/:key` | Delete custom config |

**Connects To:**
- → **Admin Dashboard** (`/admin`) — navigation link

---

## Navigation Structure

### Main Header (Public)
```
Logo → Home
├── Explore → /explore
├── Services → /services
├── Courses → /courses
├── Search → /services?search=...
├── Sign In → /login
└── Join Free → /register
```

### Authenticated Header
```
Logo → Home
├── Explore → /explore
├── Services → /services
├── Courses → /courses
├── Dashboard → /dashboard
├── Messages → /messages
├── Orders → /orders
├── [Seller Dashboard] → /seller (if seller)
├── [Become a Seller] → /become-seller (if not seller)
└── Profile Dropdown
    ├── Settings → /settings
    └── Logout
```

### Buyer Sidebar
```
├── Dashboard → /dashboard
├── Orders → /orders
├── Messages → /messages
├── Subscriptions → /subscriptions
└── Settings → /settings
```

### Seller Sidebar
```
├── Dashboard → /seller
├── Services → /seller/services
├── Orders → /seller/orders
├── CRM → /seller/crm
├── Earnings → /seller/earnings
├── Courses → /seller/courses
├── Analytics → /seller/analytics
├── BioLink → /seller/biolink
└── Settings → /settings
```

### Admin Sidebar
```
├── Dashboard → /admin
├── Users → /admin/users
├── KYC Verifications → /admin/kyc
├── Services → /admin/services
├── Courses → /admin/courses
├── Analytics → /admin/analytics
├── Inbox → /admin/inbox
├── ─── divider ───
├── Fees & Calculations → /admin/fees
├── Configuration → /admin/configuration
└── View Site → / (external)
```

---

## Feature-to-Page Matrix

This matrix shows which features are accessible from which pages.

### Core Features

| Feature | Pages That Use It |
|---------|------------------|
| **Service Browsing** | Home, Explore, Services Listing, Seller Profile |
| **Service Detail View** | Service Detail |
| **Service Ordering** | Service Detail → Order Detail |
| **Course Browsing** | Home, Explore, Courses Listing, Seller Profile |
| **Course Enrollment** | Course Detail |
| **Course Learning** | Course Player |
| **User Registration** | Register |
| **User Login** | Login |
| **Password Reset** | Forgot Password, Reset Password |

### Buyer Features

| Feature | Pages That Use It |
|---------|------------------|
| **Order Management** | Dashboard, Orders, Order Detail |
| **Payment (PayFast/Ozow)** | Order Detail, Conversation (offer accept) |
| **Delivery Review** | Order Detail |
| **Dispute Filing** | Order Detail |
| **Refund Request** | Order Detail, Course Detail |
| **Review Submission** | Order Detail |
| **Messaging** | Messages, Conversation, Service Detail, Seller Profile, Course Detail |
| **Custom Offer Handling** | Conversation |
| **Favorites** | Service Detail |
| **Become a Seller** | Dashboard, Become a Seller |

### Seller Features

| Feature | Pages That Use It |
|---------|------------------|
| **Seller Onboarding** | Become a Seller |
| **Service CRUD** | Seller Services, Create Service, Edit Service |
| **Package Management** | Create Service, Edit Service |
| **Order Fulfillment** | Seller Orders |
| **Delivery Submission** | Seller Orders |
| **Earnings & Payouts** | Earnings |
| **CRM Pipeline** | CRM |
| **Custom Offers** | Conversation |
| **Course CRUD** | Seller Courses, Create Course |
| **Course Publishing** | Seller Courses, Create Course |
| **Analytics Dashboard** | Seller Analytics |
| **BioLink Storefront** | BioLink Builder, Seller Profile |
| **Seller Subscription** | BioLink Builder |

### Admin Features

| Feature | Pages That Use It |
|---------|------------------|
| **User Management** | Admin Users |
| **User Suspension** | Admin Users |
| **KYC Verification** | Admin KYC |
| **Service Moderation** | Admin Services |
| **Course Moderation** | Admin Courses |
| **Platform Analytics** | Admin Analytics, Admin Dashboard |
| **Conversation Review** | Admin Inbox |
| **Fee Management** | Fees & Calculations |
| **Platform Configuration** | Configuration |
| **Payout Processing** | Admin Dashboard (quick link) |
| **Dispute Resolution** | Admin Dashboard (quick link) |

---

## API Endpoint Map

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/register` | Register Page |
| POST | `/login` | Login Page |
| POST | `/refresh` | API client (auto) |
| POST | `/logout` | Header dropdown |
| POST | `/logout-all` | Settings |
| POST | `/forgot-password` | Forgot Password Page |
| POST | `/reset-password` | Reset Password Page |
| POST | `/change-password` | Settings |
| GET | `/me` | Auth store (init) |

### Users (`/api/v1/users`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/:username` | Seller Profile Page |
| PATCH | `/profile` | Settings Page |
| POST | `/become-seller` | Become a Seller Page |
| GET | `/favorites` | Favorites (service pages) |
| POST | `/favorites/:serviceId` | Service Detail Page |
| DELETE | `/favorites/:serviceId` | Service Detail Page |
| GET | `/seller/stats` | Seller Dashboard |
| GET | `/seller/fee-status` | Earnings, Seller Courses |
| POST | `/seller/pay-fee` | Become a Seller, Seller Courses |
| GET | `/seller/analytics` | Seller Analytics Page |
| GET | `/seller/biolink` | BioLink Builder |
| PUT | `/seller/biolink` | BioLink Builder |
| POST | `/seller/biolink/toggle` | BioLink Builder |

### Services (`/api/v1/services`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/` | Home, Explore, Services Listing, Seller Services |
| GET | `/meta/stats` | Home Page |
| GET | `/meta/categories` | Home, Explore, Services Listing, Create Service, Create Course |
| GET | `/:username/:slug` | Service Detail Page |
| POST | `/` | Create Service Page |
| POST | `/:id/packages` | Create Service, Edit Service |
| POST | `/:id/subscription-tiers` | Edit Service |

### Orders (`/api/v1/orders`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/buying` | Dashboard, Orders Page |
| GET | `/selling` | Seller Dashboard, Seller Orders |
| GET | `/:id` | Order Detail Page |
| POST | `/` | Service Detail Page |
| POST | `/:id/deliver` | Seller Orders Page |
| POST | `/:id/revision` | Order Detail Page |
| POST | `/:id/accept` | Order Detail Page |
| POST | `/:id/cancel` | Order Detail Page |
| POST | `/:id/dispute` | Order Detail Page |
| GET | `/:id/dispute` | Order Detail Page |

### Courses (`/api/v1/courses`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/` | Home, Explore, Courses Listing |
| GET | `/:slug` | Course Detail, Course Player |
| POST | `/:courseId/enroll` | Course Detail Page |
| POST | `/:courseId/refund` | Course Detail Page |
| GET | `/:courseId/learn` | Course Player |
| POST | `/:courseId/lessons/:lessonId/complete` | Course Player |
| POST | `/:courseId/reviews` | Course Detail Page |
| GET | `/seller/my` | Seller Courses Page |
| POST | `/seller/create` | Create Course Page |
| POST | `/seller/:courseId/publish` | Seller Courses, Create Course |
| DELETE | `/seller/:courseId` | Seller Courses Page |
| POST | `/seller/:courseId/sections` | Create Course Page |
| POST | `/seller/sections/:sectionId/lessons` | Create Course Page |

### Conversations (`/api/v1/conversations`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/` | Messages Page, CRM Page |
| GET | `/:id` | Conversation Page |
| POST | `/start` | Service Detail, Seller Profile, Course Detail |
| POST | `/` | Messaging system |
| PATCH | `/:id` | CRM Page |
| POST | `/:id/notes` | Conversation Page |
| POST | `/:id/offer` | Conversation Page (seller) |
| POST | `/:id/offer/:messageId/accept` | Conversation Page (buyer) |
| POST | `/:id/offer/:messageId/decline` | Conversation Page (buyer) |
| GET | `/crm/pipeline-stages` | CRM Page |
| POST | `/crm/pipeline-stages` | CRM Page |
| GET | `/crm/labels` | CRM Page |
| POST | `/crm/labels` | CRM Page |
| GET | `/crm/saved-replies` | CRM Page |
| POST | `/crm/saved-replies` | CRM Page |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/initiate` | Order Detail Page |
| GET | `/initiate-subscription` | Subscription flow |
| GET | `/credit-balance` | Order Detail Page |
| GET | `/balance` | Earnings Page |
| GET | `/earnings` | Seller Dashboard, Earnings Page |
| GET | `/payouts` | Earnings Page |
| POST | `/withdraw` | Earnings Page |

### Seller Subscription (`/api/v1/seller-subscription`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/status` | BioLink Builder |
| POST | `/subscribe` | BioLink Builder |
| POST | `/cancel` | BioLink Builder |
| POST | `/reactivate` | BioLink Builder |

### Uploads (`/api/v1/uploads`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/image` | Create/Edit Service |
| POST | `/avatar` | Settings, Become a Seller |
| POST | `/file` | Order Delivery |
| POST | `/images` | Create/Edit Service |
| POST | `/video` | Create Course |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/stats` | Admin Dashboard |
| GET | `/users` | Admin Users Page |
| POST | `/users/:id/suspend` | Admin Users Page |
| POST | `/users/:id/unsuspend` | Admin Users Page |
| GET | `/sellers/pending-kyc` | Admin KYC, Admin Dashboard |
| POST | `/sellers/:id/verify-kyc` | Admin KYC Page |
| GET | `/services` | Admin Services Page |
| PATCH | `/services/:id` | Admin Services Page |
| GET | `/courses` | Admin Courses Page |
| PATCH | `/courses/:id` | Admin Courses Page |
| GET | `/analytics` | Admin Analytics Page |
| GET | `/conversations` | Admin Inbox Page |
| GET | `/conversations/:id` | Admin Inbox Page |
| POST | `/conversations/:id/flag` | Admin Inbox Page |
| POST | `/conversations/:id/unflag` | Admin Inbox Page |

### Webhooks (`/webhooks`)
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/payfast` | PayFast payment notifications |
| POST | `/payfast/subscription` | PayFast subscription payments |
| POST | `/payfast/seller-subscription` | PayFast seller subscription |
| POST | `/ozow` | Ozow payment notifications |

---

*Document generated from source code analysis of the Zomieks platform repository.*
