# JZ Vacation Stays — Architecture

## Overview

Vacation booking website for 2 family-owned short-term rental properties in Florida (Seaglass Villa, Coral Retreat). Guests can browse properties, view photos/reviews, check availability, and book with Stripe payments. Calendars sync with Airbnb, VRBO, and Hospitable via iCal. Admin tools include booking management, handyman checklists, and thermostat control.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19, TypeScript, Tailwind CSS | Modern, type-safe, utility-first styling |
| Routing | TanStack Router | File-based, type-safe routing with loaders |
| Fullstack | TanStack Start | SSR, server functions (RPC), Vite-based |
| Data fetching | TanStack Query | Caching, mutations, optimistic updates |
| Database | PostgreSQL + Drizzle ORM | Relational data, type-safe schema, easy migrations |
| Payments | Stripe (Payment Intents + React Stripe.js) | Industry standard, deposits/refunds |
| Email | Resend API | Simple transactional email |
| Calendar sync | node-ical + ical-generator | iCal standard for platform interop |
| Async workflows | Conductor | Durable workflows for reminders, post-stay emails |
| Deployment | Railway | App + Postgres |

## Directory Structure

```
jzvacationstays/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── CLAUDE.md
├── docs/
│   ├── architecture.md         # This file
│   ├── database-schema.md      # Table definitions
│   └── routes.md               # Route map
├── public/
│   └── images/
│       ├── seaglass-villa/
│       └── coral-retreat/
├── drizzle/                    # Auto-generated migrations
├── legacy/
│   └── index.html              # Original landing page for reference
├── src/
│   ├── styles/
│   │   └── global.css          # Tailwind directives + Outfit font
│   ├── router.tsx              # TanStack Router config
│   ├── routeTree.gen.ts        # Auto-generated route tree
│   ├── db/
│   │   ├── index.ts            # Drizzle client (DATABASE_URL)
│   │   ├── schema.ts           # Barrel export of all schema modules
│   │   ├── schema/             # Individual table definitions
│   │   └── seed.ts             # Seed data for properties
│   ├── server/
│   │   ├── middleware/
│   │   │   ├── auth.ts         # Session validation middleware
│   │   │   └── admin.ts        # Admin role check middleware
│   │   ├── functions/          # TanStack Start server functions (RPC)
│   │   │   ├── auth.ts
│   │   │   ├── properties.ts
│   │   │   ├── bookings.ts
│   │   │   ├── reviews.ts
│   │   │   ├── calendar-sync.ts
│   │   │   ├── payments.ts
│   │   │   ├── checklists.ts
│   │   │   └── thermostat.ts
│   │   ├── services/           # External service wrappers
│   │   │   ├── email.ts        # Resend
│   │   │   ├── stripe.ts       # Stripe SDK
│   │   │   ├── ical.ts         # iCal parser/generator
│   │   │   └── thermostat.ts   # Generic adapter interface
│   │   └── api/                # HTTP server routes
│   │       ├── calendar-export.$propertyId.ts
│   │       └── stripe-webhook.ts
│   ├── routes/
│   │   ├── __root.tsx          # Root layout (html, head, nav, footer)
│   │   ├── index.tsx           # Landing page
│   │   ├── properties/
│   │   │   ├── index.tsx       # Property listing
│   │   │   └── $propertyId.tsx # Property detail
│   │   ├── booking/
│   │   │   ├── $propertyId.tsx # Booking flow
│   │   │   └── confirmation.$bookingId.tsx
│   │   ├── auth/
│   │   │   ├── login.tsx       # Email input
│   │   │   └── verify.tsx      # OTP verification
│   │   └── _admin/             # Pathless layout (auth guard)
│   │       ├── route.tsx       # Admin layout + sidebar
│   │       ├── dashboard.tsx
│   │       ├── bookings.tsx
│   │       ├── reviews.tsx
│   │       ├── calendar-sync.tsx
│   │       ├── checklists/
│   │       │   ├── index.tsx
│   │       │   └── $checklistId.tsx
│   │       └── thermostat.tsx
│   ├── components/
│   │   ├── ui/                 # Primitives (Button, Input, Card, etc.)
│   │   ├── layout/             # Header, Footer, AdminSidebar
│   │   ├── property/           # PropertyCard, Gallery, Amenities, Reviews
│   │   ├── booking/            # BookingForm, Summary, StripePayment, Calendar
│   │   └── admin/              # StatsCard, ChecklistItem, ThermostatControl
│   ├── workflows/
│   │   ├── definitions/        # Conductor workflow definitions (JSON)
│   │   ├── tasks/              # Conductor task definitions (JSON)
│   │   ├── workers/            # Conductor worker implementations (TypeScript)
│   │   └── client.ts           # Conductor client configuration
│   ├── lib/
│   │   ├── utils.ts            # cn(), formatCurrency, formatDate
│   │   ├── constants.ts        # Property slugs, date formats
│   │   └── validators.ts       # Zod schemas for forms
│   └── hooks/
│       ├── use-auth.ts         # Auth context hook
│       └── use-availability.ts # Calendar availability hook
```

## Key Architectural Decisions

### Server Functions over REST
TanStack Start `createServerFn` provides end-to-end type safety without a separate REST API. Only two true HTTP endpoints exist: iCal export (must be plain GET) and Stripe webhook (raw POST for signature verification).

### Custom Auth (no library)
Simple OTP flow: email → 6-digit code → session cookie. No need for a heavy auth library. Sessions stored in PostgreSQL.

### iCal for Calendar Sync
Industry standard. Import from platforms via feed URLs, export via our own `.ics` endpoint. 30-min sync interval.

### Adapter Pattern for Thermostat
Generic `ThermostatAdapter` interface with `MockThermostatAdapter` until brand is chosen. Easy to swap in Ecobee/Nest/Honeywell later.

### Conductor for Async Workflows
Durable workflows handle booking lifecycle (confirmation → reminders → review requests), calendar sync, and checklist reminders. Conductor runs locally via Docker for orchestration.

## Design Language

- **Font:** Outfit (300-600 weights)
- **Colors:** `stone` neutrals, `sky` accents, `emerald` success
- **Style:** Rounded cards, glassmorphism, backdrop blur, warm coastal aesthetic
- **Icons:** Iconify (Solar icon set)
