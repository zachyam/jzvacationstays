# JZ Vacation Stays — Project Conventions

## Tech Stack
- React 19 + TypeScript + TanStack Start (Router + Query) + Tailwind CSS
- PostgreSQL + Drizzle ORM
- Stripe for payments, Resend for email, Temporal for async workflows
- Deployed on Railway

## Commands
- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:migrate` — Run migrations
- `pnpm db:seed` — Seed database

## Code Style
- Use `createServerFn` for all server-side logic (not REST endpoints)
- Only use HTTP server routes for iCal export and Stripe webhooks
- All monetary amounts stored in cents (integer)
- Use Zod for all form/input validation (`src/lib/validators.ts`)
- Use `cn()` from `src/lib/utils.ts` for conditional classnames

## Database
- Drizzle ORM with `pgTable` definitions in `src/db/schema/`
- UUID primary keys (`defaultRandom`)
- Timestamps: `created_at`, `updated_at` with `defaultNow`
- Schema barrel export: `src/db/schema.ts`

## Routing
- File-based routing via TanStack Router (`src/routes/`)
- Public routes at root level, admin routes under `admin/` nested routes
- Auth guard in `admin/route.tsx`, session loaded in `__root.tsx` loader

### TanStack Router Patterns & Lessons Learned

#### Route Structure Patterns
**Pathless Routes (`_folder/`)**:
- Purpose: Layout wrapper without adding URL segments
- Example: `_admin/dashboard.tsx` → Creates route `/dashboard`
- Use Case: When you want layout/auth guards but no URL prefix

**Regular Nested Routes (`folder/`)**:
- Purpose: Standard nested routing with URL segments
- Example: `admin/dashboard.tsx` → Creates route `/admin/dashboard`
- Use Case: When you want URL structure to match file structure

#### Common Issues & Solutions
1. **Route Conflicts**: Multiple routes handling same path (e.g., conflicting index routes)
2. **Redirect Loops**: Broad redirects intercepting child routes
3. **URL Mismatch**: Using pathless when you need URL segments

#### Best Practices
- Choose pattern based on desired URLs: `/admin/dashboard` = use `admin/dashboard.tsx`
- Use `folder/index.tsx` for folder redirects
- File structure = URL structure (for regular routes)

## Styling
- Tailwind CSS with Outfit font family
- Color palette: `stone` (neutrals), `sky` (accents), `emerald` (success)
- Icons: Iconify Solar icon set
- Rounded cards, glassmorphism, backdrop blur aesthetic

## Auth
- Passwordless OTP via email (Resend)
- Session cookie (HTTP-only), sessions in PostgreSQL
- Roles: "guest" (default), "admin"

## Properties
- 2 properties: "the-blue-oasis" and "surfers-serenity" (slugs)
- Pricing is dynamic (fetched from platforms), cleaning fee is fixed
- Calendar synced via iCal with Airbnb, VRBO, Hospitable
