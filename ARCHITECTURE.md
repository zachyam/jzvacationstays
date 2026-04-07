# JZ Vacation Stays — Codebase Architecture Guide

This document explains **how data moves and where logic lives** in the codebase.
UI components are intentionally glossed over.

---

## 1. High-Level Mental Model

```
Browser (React)
    │
    │  createServerFn() calls (RPC-style, not REST)
    ▼
TanStack Start Server Layer
    │
    ├── server/middleware/     ← auth checks
    ├── server/functions/      ← all business logic
    └── server/services/       ← Stripe, Resend, iCal wrappers
            │
            ▼
    ┌───────────────┐
    │  PostgreSQL    │  ← Drizzle ORM
    │  (via db/)     │
    └───────────────┘
            │
    ┌───────┴────────┐
    │  External APIs  │
    ├─ Stripe         │
    ├─ Resend (email) │
    ├─ S3 / R2        │
    ├─ Temporal        │
    └─ iCal feeds     │
    └─────────────────┘
```

**Key idea:** There are no REST API endpoints (except two special cases: Stripe
webhooks and iCal export). Everything else uses TanStack's `createServerFn()`,
which is an RPC mechanism — the browser calls a function, TanStack serializes
the arguments, sends them to the server, executes the function, and returns the
result. Think of it like tRPC or Next.js server actions.

---

## 2. Directory Map (src/)

```
src/
├── db/                        # Database connection + schema
│   ├── index.ts               # Creates the Drizzle client (connects to Postgres)
│   ├── schema.ts              # Barrel export of all tables
│   └── schema/                # One file per table group
│       ├── users.ts
│       ├── sessions.ts        # sessions + otpCodes tables
│       ├── properties.ts
│       ├── property-photos.ts
│       ├── bookings.ts
│       ├── reviews.ts
│       ├── checklists.ts      # checklists + checklistItems
│       ├── checklist-media.ts # checklistItemMedia
│       ├── inspections.ts     # inspections + inspectionItems + inspectionMedia
│       └── calendar-sync.ts   # calendarSync + blockedDates
│
├── server/                    # ALL server-side logic lives here
│   ├── middleware/
│   │   ├── auth.ts            # requireAuth() — validates session cookie
│   │   └── admin.ts           # requireAdmin() — auth + role check
│   │
│   ├── functions/             # Business logic (createServerFn handlers)
│   │   ├── auth.ts            # Login/OTP/session management
│   │   ├── bookings.ts        # Guest booking creation & retrieval
│   │   ├── payments.ts        # Stripe payment intent creation
│   │   ├── properties.ts      # Public property listing
│   │   ├── reviews.ts         # Public review retrieval
│   │   ├── calendar-sync.ts   # iCal import/export + availability
│   │   ├── uploads.ts         # S3 presigned URL generation
│   │   ├── inspections.ts     # Inspection CRUD + token-based access
│   │   ├── handyman-checklists.ts  # Token-based checklist access
│   │   ├── admin-dashboard.ts      # Dashboard stats
│   │   ├── admin-bookings.ts       # Admin booking management
│   │   ├── admin-calendar.ts       # Admin calendar view data
│   │   ├── admin-properties.ts     # Property CRUD
│   │   ├── admin-reviews.ts        # Review moderation
│   │   ├── admin-checklists.ts     # Checklist template management
│   │   ├── file-upload.ts          # Local file upload handling
│   │   ├── media-upload.ts         # (if present) media helpers
│   │   └── subdomain.ts            # Hostname detection
│   │
│   └── services/              # Thin wrappers around external APIs
│       ├── stripe.ts          # Stripe client singleton
│       ├── email.ts           # Resend: sendOtpEmail(), sendRawEmail()
│       └── ical.ts            # parseIcalFeed(), generateIcalFeed()
│
├── temporal/                  # Async workflow orchestration
│   ├── client.ts              # Temporal client singleton
│   ├── worker.ts              # Temporal worker process
│   ├── workflows/
│   │   └── index.ts           # bookingLifecycle workflow
│   └── activities/
│       └── index.ts           # sendEmail, getBookingDetails activities
│
├── lib/                       # Shared utilities (used by both client & server)
│   ├── constants.ts           # Enums: BOOKING_STATUS, USER_ROLES, etc.
│   ├── validators.ts          # Zod schemas for all inputs
│   ├── utils.ts               # cn(), formatCurrency(), formatDate()
│   ├── s3.ts                  # S3/R2 client, presigned URLs, delete ops
│   ├── subdomain.ts           # Subdomain parsing for multi-tenant routing
│   ├── inspection-url.ts      # Builds inspection links from tokens
│   └── media-upload.ts        # Local file save to disk (checklist media)
│
├── routes/                    # TanStack file-based routing (see section 7)
├── components/                # React UI (out of scope)
├── hooks/                     # React hooks (out of scope)
├── types/                     # TypeScript type definitions
└── router.tsx                 # TanStack Router + React Query setup
```

---

## 3. How `createServerFn` Works (The Core Pattern)

Every server function in `src/server/functions/` follows this pattern:

```typescript
import { createServerFn } from "@tanstack/react-start";

// Define a function that runs on the server
export const getProperties = createServerFn({ method: "GET" })
  .handler(async () => {
    // This code ONLY runs on the server — it can access the DB directly
    const results = await db.select().from(properties).where(...);
    return results;
  });

// With auth middleware:
export const createBooking = createServerFn({ method: "POST" })
  .validator(bookingSchema)        // Zod validates the input
  .handler(async ({ data }) => {   // data is typed & validated
    const user = await requireAuth();  // check session cookie
    // ... insert into database
  });
```

**On the client side**, you call it like a normal async function:

```typescript
const props = await getProperties();
const booking = await createBooking({ data: { ... } });
```

TanStack handles serialization, HTTP transport, and error propagation
automatically. There's no fetch/axios/API URL to manage.

---

## 4. Database Layer (src/db/)

### Connection (`src/db/index.ts`)
Creates a Drizzle ORM client connected to PostgreSQL via `DATABASE_URL`.

### Schema Overview

| Table | What It Stores |
|-------|---------------|
| **users** | Email, name, role ("guest" or "admin"). UUID PKs. |
| **sessions** | Auth sessions: token (in cookie) + expiry. FK → users. |
| **otpCodes** | One-time passwords: email, 6-digit code, expiry, used flag. |
| **properties** | The two vacation rentals. Slug, pricing (in cents), amenities (JSONB), location, rules. |
| **propertyPhotos** | Photo URLs with sort order and cover flag. FK → properties. |
| **bookings** | Reservations: guest info, dates, amount (cents), status, Stripe intent ID. FK → properties, users. |
| **reviews** | Guest reviews: rating, comment, source. FK → properties, bookings. |
| **checklists** | Maintenance/turnover templates. FK → properties. |
| **checklistItems** | Individual tasks within a checklist, grouped by room. FK → checklists. |
| **checklistItemMedia** | Files attached to checklist template items (stored on local disk). |
| **inspections** | An instance of a checklist being executed. Has a unique **token** for handyman access. FK → checklists, properties. |
| **inspectionItems** | Snapshot of checklist items for this inspection run. Tracks completion, status, comments. |
| **inspectionMedia** | Photos/videos uploaded during inspection (stored in S3). |
| **calendarSync** | iCal feed configurations per property per platform (Airbnb, VRBO, etc.). |
| **blockedDates** | Individual dates when a property is unavailable. One row per date. Unique on (propertyId, date). |

### Key Design Decisions
- **All money is in cents** (integers, not floats) — `totalAmount: 15000` means $150.00
- **UUID primary keys** everywhere — no auto-increment integers
- **JSONB columns** for flexible arrays: `beds`, `amenities`, `roomOrder`
- **Soft relationships**: bookings link to properties by FK, but guest info is denormalized (guestName, guestEmail stored directly on booking)

---

## 5. Authentication Flow (src/server/functions/auth.ts)

This is a **passwordless OTP** system:

```
Step 1: User enters email on /auth/login
        │
        ▼
  sendOtp(email, name?)
        │
        ├─ Is this an admin email?
        │   YES → Skip OTP entirely, create session immediately, redirect
        │   NO  ▼
        ├─ Generate random 6-digit code
        ├─ Store in otpCodes table (expires in 10 minutes)
        └─ Send code via Resend email (sendOtpEmail)

Step 2: User enters code on /auth/verify
        │
        ▼
  verifyOtp(email, code, name?)
        │
        ├─ Look up unexpired, unused OTP matching email + code
        ├─ Mark OTP as used
        ├─ Find or create user by email
        ├─ Create session (random token, 30-day expiry)
        ├─ Set httpOnly cookie: "session_token"
        └─ Return user data

Subsequent requests:
        │
        ▼
  requireAuth()  (middleware)
        │
        ├─ Read "session_token" from cookie
        ├─ Look up session in DB, check expiry
        └─ Return { id, email, name, role } or throw 401
```

**Admin shortcut:** Admin users bypass OTP entirely — `sendOtp` detects their
role and creates a session directly. This is a dev convenience.

---

## 6. Core Business Flows

### 6a. Guest Booking Flow

```
Guest browses /properties/:slug
        │
        ▼
  getPropertyBySlug()  →  property + photos from DB
  getAvailability()    →  blocked dates for calendar widget
        │
        ▼
Guest fills booking form on /booking/:propertyId
        │
        ▼
  createBooking({ propertySlug, checkIn, checkOut, guests, amount, ... })
        │
        ├─ Validates with bookingSchema (Zod)
        ├─ INSERT into bookings (status: "pending")
        └─ Returns booking ID
        │
        ▼
  createPaymentIntent({ bookingId, amount })
        │
        ├─ Calls Stripe API to create PaymentIntent
        ├─ Stores stripePaymentIntentId on the booking row
        └─ Returns clientSecret (for Stripe.js on frontend)
        │
        ▼
Frontend Stripe.js completes payment
        │
        ▼
Stripe sends webhook → server/routes/api/stripe-webhook.post.ts
        │
        ├─ Verifies webhook signature
        ├─ payment_intent.succeeded → UPDATE booking SET status = "confirmed"
        ├─ payment_intent.payment_failed → UPDATE booking SET status = "cancelled"
        └─ (This is one of only 2 actual HTTP endpoints in the app)
        │
        ▼
Temporal workflow kicks off (bookingLifecycle)
        ├─ Immediately: send confirmation email
        ├─ 1 day before check-in: send reminder email
        └─ 1 day after check-out: send review request email
```

### 6b. Calendar Sync Flow

The system syncs availability with Airbnb/VRBO via the iCal standard:

```
IMPORT (other platforms → this app):
  Admin adds iCal URL for a platform via addCalendarSync()
        │
        ▼
  syncCalendar(syncId)  [triggered manually or on schedule]
        │
        ├─ Fetch remote .ics file from Airbnb/VRBO
        ├─ Parse with node-ical → extract VEVENT date ranges
        ├─ expandDateRange() → individual dates
        ├─ Upsert into blockedDates table (one row per blocked date)
        └─ Update lastSyncedAt timestamp

EXPORT (this app → other platforms):
  GET /api/calendar-export/[propertyId]?token=xxx
        │
        ├─ Validate token against calendarSync table
        ├─ Fetch confirmed bookings + blocked dates
        ├─ generateIcalFeed() → .ics file content
        └─ Return as text/calendar
        (This is the 2nd actual HTTP endpoint)
```

### 6c. Inspection Flow (Token-Based, No Auth Required)

```
Admin creates inspection:
  createInspection(checklistId, propertyId)
        │
        ├─ Generate random token (crypto.randomBytes)
        ├─ Copy checklist items into inspectionItems
        └─ Return inspection with token
        │
        ▼
Admin shares link: /inspect/{token}
        │
        ▼
Handyman opens link (no login needed):
  getInspectionByToken(token)
        │
        ├─ Look up inspection by token
        ├─ Load all inspection items grouped by room
        └─ Return data for the checklist UI
        │
        ▼
Handyman works through rooms:
  startInspection(token)           → status = "in_progress"
  updateInspectionItem(itemId, {   → mark items done, add comments
    isCompleted, status, comment
  })
  addInspectionMedia(itemId, url)  → attach photos/videos
  completeInspection(token)        → status = "completed"
```

### 6d. Temporal Workflows (src/temporal/)

Temporal is a **durable workflow engine**. It guarantees that even if the server
crashes, the workflow will resume where it left off.

```
bookingLifecycle(bookingId):
  │
  ├─ getBookingDetails(bookingId)     ← activity (DB query)
  ├─ sendEmail(confirmation)           ← activity (Resend API)
  ├─ sleep(until 1 day before checkIn) ← Temporal handles this durably
  ├─ sendEmail(reminder)
  ├─ sleep(until 1 day after checkOut)
  └─ sendEmail(reviewRequest)
```

**Why Temporal?** A naive approach (setTimeout or cron) would lose state on
server restart. Temporal persists the workflow state externally, so a "sleep 14
days" actually works reliably.

---

## 7. Routing (src/routes/)

TanStack Router uses **file-based routing** — the file path becomes the URL:

```
src/routes/
├── __root.tsx              # Root layout: loads session, sets up subdomain routing
├── index.tsx               # / (homepage)
├── account.tsx             # /account (user profile)
├── dashboard.tsx           # /dashboard (user's bookings)
│
├── auth/
│   ├── login.tsx           # /auth/login
│   └── verify.tsx          # /auth/verify
│
├── properties/
│   ├── index.tsx           # /properties (listing)
│   └── $propertyId.tsx     # /properties/:propertyId (detail)
│
├── booking/
│   ├── $propertyId.tsx     # /booking/:propertyId (booking form)
│   └── confirmation.$bookingId.tsx  # /booking/confirmation/:bookingId
│
├── admin/
│   ├── route.tsx           # Auth guard — redirects non-admins
│   ├── dashboard.tsx       # /admin/dashboard
│   ├── bookings.tsx        # /admin/bookings
│   ├── reviews.tsx         # /admin/reviews
│   ├── calendar.tsx        # /admin/calendar
│   ├── calendar-sync.tsx   # /admin/calendar-sync
│   ├── listings/           # /admin/listings (property CRUD)
│   ├── checklists/         # /admin/checklists (template management)
│   └── inspections/        # /admin/inspections (inspection tracking)
│
├── inspect/
│   ├── $token/
│   │   ├── index.tsx       # /inspect/:token (room list)
│   │   └── $room.tsx       # /inspect/:token/:room (room checklist)
│   └── complete.$token.tsx # /inspect/complete/:token (done page)
│
└── api/
    └── debug.ts            # /api/debug
```

**Key concepts:**
- `$param` in filename = dynamic URL segment (like `:param` in Express)
- `admin/route.tsx` = layout file that wraps all `/admin/*` routes with an auth guard
- `__root.tsx` = wraps the entire app, loads the user session on every page

### Subdomain Routing

The app runs on **two subdomains**:
- `www.jzvacationstays.com` — public site + guest booking
- `admin.jzvacationstays.com` — admin dashboard

In local dev, this is simulated with ports:
- `localhost:3000` = www
- `localhost:3001` = admin

The `__root.tsx` loader detects the subdomain and redirects accordingly.

---

## 8. External Services Summary

| Service | What It Does | Where It's Configured |
|---------|-------------|----------------------|
| **PostgreSQL** | All persistent data | `DATABASE_URL` env var → `src/db/index.ts` |
| **Stripe** | Payment processing | `STRIPE_SECRET_KEY` → `src/server/services/stripe.ts` |
| **Resend** | Transactional email (OTP, confirmations) | `RESEND_API_KEY` → `src/server/services/email.ts` |
| **Cloudflare R2 / S3** | File storage (inspection media) | `S3_*` env vars → `src/lib/s3.ts` |
| **Temporal** | Durable async workflows | `TEMPORAL_ADDRESS` → `src/temporal/client.ts` |
| **node-ical / ical-generator** | Calendar sync (Airbnb, VRBO) | `src/server/services/ical.ts` |

---

## 9. How Data Gets Validated

All user input passes through **Zod schemas** defined in `src/lib/validators.ts`:

```typescript
// Example: booking input validation
export const bookingSchema = z.object({
  propertySlug: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // YYYY-MM-DD
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestsCount: z.number().int().positive(),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  totalAmount: z.number().int().positive(),             // cents!
  // ...
});
```

These schemas are used in two places:
1. **Server functions** — `.validator(bookingSchema)` on `createServerFn`
2. **React forms** — form libraries use the same schema for client-side validation

---

## 10. File Storage Strategy

The app uses **two different storage backends**:

| What | Where | Why |
|------|-------|-----|
| Checklist template media | **Local disk** (`public/uploads/checklist-media/`) | Small files, simple admin uploads, served statically |
| Inspection media | **S3 / Cloudflare R2** | Large files (up to 100MB), uploaded by handymen in the field, needs CDN |

**S3 upload flow** (for inspections):
1. Client requests presigned URL via `getUploadUrl()`
2. Server generates a signed S3 PUT URL (valid 5 min)
3. Client uploads directly to S3 (bypasses server)
4. Client saves the resulting public URL to the inspection via `addInspectionMedia()`

---

## 11. The Two "Real" HTTP Endpoints

Everything uses `createServerFn` except:

1. **Stripe Webhook** (`server/routes/api/stripe-webhook.post.ts`)
   - Stripe POSTs payment events here
   - Verifies webhook signature
   - Updates booking status

2. **iCal Export** (`server/routes/api/calendar-export/[propertyId].get.ts`)
   - Airbnb/VRBO fetch this URL to import your calendar
   - Returns `.ics` file format
   - Protected by a token (not session auth, since platforms can't log in)

---

## 12. Quick Reference: "Where do I find...?"

| I want to... | Look in... |
|--------------|-----------|
| Change how login works | `src/server/functions/auth.ts` |
| Modify booking creation | `src/server/functions/bookings.ts` |
| Change payment logic | `src/server/functions/payments.ts` |
| Add/edit a database table | `src/db/schema/` then run `pnpm db:generate && pnpm db:migrate` |
| Add input validation | `src/lib/validators.ts` |
| Change email templates | `src/server/services/email.ts` |
| Modify post-booking automation | `src/temporal/workflows/index.ts` |
| Change what the admin sees | `src/server/functions/admin-*.ts` (data) + `src/routes/admin/` (UI) |
| Fix calendar sync issues | `src/server/functions/calendar-sync.ts` + `src/server/services/ical.ts` |
| Change inspection logic | `src/server/functions/inspections.ts` |
| Modify S3 upload behavior | `src/lib/s3.ts` + `src/server/functions/uploads.ts` |
| Change subdomain routing | `src/lib/subdomain.ts` + `src/routes/__root.tsx` |
