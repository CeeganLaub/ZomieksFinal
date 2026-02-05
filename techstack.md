## Frontend Stack

| Technology           | Version | Purpose                                          |
| -------------------- | ------- | ------------------------------------------------ |
| **React**            | 18.2+   | UI Framework with Suspense & Concurrent Features |
| **Vite**             | 5.x     | Build tool & development server (Port 5173)      |
| **TypeScript**       | 5.x     | Type safety throughout application               |
| **TailwindCSS**      | 3.4+    | Utility-first CSS framework                      |
| **CVA**              | 0.7+    | Class Variance Authority for component variants  |
| **React Router**     | 6.x     | Client-side routing (100+ routes)                |
| **Zustand**          | 4.x     | Lightweight state management                     |
| **TanStack Query**   | 5.x     | Server state caching & synchronization           |
| **Axios**            | 1.x     | HTTP client with interceptors                    |
| **Socket.io Client** | 4.x     | Real-time WebSocket connections                  |
| **Framer Motion**    | 11.x    | Animation library                                |
| **Radix UI**         | Latest  | Accessible component primitives (15+ packages)   |
| **React Hook Form**  | 7.x     | Form handling & validation                       |
| **Zod**              | 3.x     | Schema validation                                |
| **@dnd-kit**         | 6.x     | Drag and drop (kanban boards)                    |
| **date-fns**         | 3.x     | Date manipulation utilities                      |

### Frontend Features

- **Progressive Web App (PWA)** - Offline support, push notifications
- **Dark Mode** - System preference detection + manual toggle
- **Responsive Design** - Mobile-first with breakpoint system
- **Lazy Loading** - Route-based code splitting
- **Real-time Updates** - WebSocket-powered messaging

---

## Backend Stack

| Technology             | Version | Purpose                                          |
| ---------------------- | ------- | ------------------------------------------------ |
| **Node.js**            | 20+     | Runtime environment (LTS)                        |
| **Express**            | 4.18    | Web framework (Port 3000)                        |
| **TypeScript**         | 5.x     | Type-safe server code                            |
| **Prisma**             | 6.x     | Type-safe ORM with 50+ models                    |
| **PostgreSQL**         | 15      | Primary relational database                      |
| **Redis**              | 7       | Caching, sessions, rate limiting, pub/sub        |
| **Socket.io**          | 4.x     | Real-time bidirectional communication            |
| **JWT**                | -       | Authentication tokens (15min access, 7d refresh) |
| **Sharp**              | 0.33+   | Image processing & optimization                  |
| **BullMQ**             | 5.x     | Job queues, retries, scheduling                  |
| **Sentry**             | 8.x     | Error tracking & APM                             |
| **node-cron**          | 3.x     | Simple scheduled tasks                           |
| **Helmet**             | 7.x     | Security headers with CSP                        |
| **express-rate-limit** | 7.x     | API rate limiting                                |
| **Zod**                | 3.x     | Request validation                               |
| **Winston**            | 3.x     | Structured logging                               |

### Backend Features

- **RBAC** - Role-based access control (7 roles)
- **API Versioning** - `/api/v1/` prefix
- **Rate Limiting** - Tiered sliding window with Redis
- **Escrow System** - Milestone-based fund holding
- **Job Queues** - BullMQ with retries & rate limiting
- **Error Tracking** - Sentry with Prisma integration
- **WebSocket Namespaces** - Redis adapter for scaling
- **Request Validation** - Zod schemas with async refinements
