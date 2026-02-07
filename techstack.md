## Frontend Stack

| Technology           | Version | Purpose                                          |
| -------------------- | ------- | ------------------------------------------------ |
| **React**            | 18.2+   | UI Framework with Suspense & Concurrent Features |
| **Vite**             | 6.x     | Build tool & development server (Port 5173)      |
| **TypeScript**       | 5.x     | Type safety throughout application               |
| **TailwindCSS**      | 3.4+    | Utility-first CSS framework                      |
| **CVA**              | 0.7+    | Class Variance Authority for component variants  |
| **React Router**     | 6.x     | Client-side routing                              |
| **Zustand**          | 5.x     | Lightweight state management                     |
| **TanStack Query**   | 5.x     | Server state caching & synchronization           |
| **Axios**            | 1.x     | HTTP client with interceptors                    |
| **Socket.io Client** | 4.x     | Real-time WebSocket connections                  |
| **Framer Motion**    | 11.x    | Animation library                                |
| **Radix UI**         | Latest  | Accessible component primitives (15+ packages)   |
| **React Hook Form**  | 7.x     | Form handling & validation                       |
| **Zod**              | 3.x     | Schema validation                                |
| **@dnd-kit**         | 6.x     | Drag and drop (CRM Kanban boards)                |
| **date-fns**         | 3.x     | Date manipulation utilities                      |
| **Sonner**           | Latest  | Toast notification system                        |
| **@heroicons/react** | 2.x     | Icon library                                     |

### Frontend Features

- **Progressive Web App (PWA)** – Offline support via vite-plugin-pwa
- **Dark Mode** – System preference detection + manual toggle
- **Responsive Design** – Mobile-first with breakpoint system
- **Lazy Loading** – Route-based code splitting
- **Real-time Updates** – WebSocket-powered messaging and notifications
- **Off-platform Warning** – Conversation banner reminding users to stay on-platform

### Frontend Pages

| Area | Pages |
|------|-------|
| **Public** | Home, Explore, Services, Service PDP, Courses, Course PDP, Seller Profile |
| **Auth** | Login, Register, Forgot Password, Reset Password |
| **Buyer** | Dashboard, Orders, Order Detail, Messages, Conversations, Subscriptions, Settings, Become Seller |
| **Seller** | Dashboard, Services, Create/Edit Service, Courses, Create Course, Orders, CRM Pipeline, Earnings, Analytics, BioLink Builder |
| **Admin** | Dashboard, Users, KYC Verifications, Services, Courses, Analytics, Inbox, Fees, Configuration |

---

## Backend Stack

| Technology             | Version | Purpose                                          |
| ---------------------- | ------- | ------------------------------------------------ |
| **Node.js**            | 20+     | Runtime environment (LTS)                        |
| **Express**            | 4.21    | Web framework (Port 3000)                        |
| **TypeScript**         | 5.x     | Type-safe server code                            |
| **Prisma**             | 6.x     | Type-safe ORM with 50+ models                    |
| **PostgreSQL**         | 15      | Primary relational database                      |
| **Redis**              | 7       | Caching, sessions, rate limiting, pub/sub        |
| **Socket.io**          | 4.x     | Real-time bidirectional communication            |
| **JWT**                | -       | Authentication tokens (15min access, 7d refresh) |
| **Sharp**              | 0.33+   | Image processing & optimization                  |
| **BullMQ**             | 5.x     | Job queues, retries, scheduling                  |
| **node-cron**          | 3.x     | Scheduled tasks                                  |
| **Helmet**             | 8.x     | Security headers with CSP                        |
| **express-rate-limit** | 7.x     | API rate limiting                                |
| **Zod**                | 3.x     | Request validation                               |
| **Winston**            | 3.x     | Structured logging                               |

### Backend Features

- **RBAC** – Role-based access control (Buyer, Seller, Admin, Moderator, Support, Finance, Super Admin)
- **API Versioning** – `/api/v1/` prefix for all endpoints
- **Rate Limiting** – Tiered sliding window with Redis backend
- **Escrow System** – Fund holding with milestone-based release via BullMQ
- **Payment Gateways** – PayFast (cards + recurring) and OZOW (instant EFT) with webhook verification
- **Custom Offers** – Sellers send one-time or monthly subscription offers in chat with fee calculation
- **KYC Verification** – Identity verification flow with admin approval/rejection
- **Seller Analytics** – Revenue trends, service/course performance, conversion rates
- **Admin Analytics** – Platform-wide KPIs, monthly revenue/order/user charts, top services/courses
- **Admin Inbox** – Conversation review and flagging for off-platform communication monitoring
- **Job Queues** – BullMQ for escrow release, notifications, and payout processing
- **WebSocket Namespaces** – Redis adapter for horizontal scaling
- **Request Validation** – Zod schemas with shared types from `packages/shared`

### Backend Routes

| Route File | Prefix | Description |
|------------|--------|-------------|
| `auth.routes.ts` | `/api/v1/auth` | Register, login, tokens, password reset |
| `user.routes.ts` | `/api/v1/users` | Profiles, seller onboarding, seller analytics |
| `service.routes.ts` | `/api/v1/services` | Service CRUD, packages, reviews, favorites |
| `order.routes.ts` | `/api/v1/orders` | Order lifecycle, deliveries, disputes |
| `course.routes.ts` | `/api/v1/courses` | Course CRUD, lessons, enrollments |
| `conversation.routes.ts` | `/api/v1/conversations` | Messaging, custom offers, CRM pipeline |
| `payment.routes.ts` | `/api/v1/payments` | PayFast & OZOW payment initiation |
| `subscription.routes.ts` | `/api/v1/subscriptions` | Buyer subscription management |
| `seller-subscription.routes.ts` | `/api/v1/seller-subscription` | Seller plan subscriptions |
| `upload.routes.ts` | `/api/v1/uploads` | File and image uploads |
| `admin.routes.ts` | `/api/v1/admin` | Stats, users, KYC, analytics, inbox, disputes, payouts |
| `webhook.routes.ts` | `/webhooks` | PayFast & OZOW payment notifications |

### Backend Services

| Service | Purpose |
|---------|---------|
| `auth.service.ts` | JWT token generation, password hashing, session management |
| `payment.service.ts` | PayFast & OZOW integration, payment initiation, signature verification |
| `escrow.service.ts` | Fund holding, milestone release, refund processing |
| `payout.service.ts` | Seller payout calculations, bank transfer processing |
| `crm.service.ts` | Lead scoring, pipeline automation, auto-trigger management |
| `notification.service.ts` | In-app notifications, email dispatching |
