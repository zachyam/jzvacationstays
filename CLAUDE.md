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
- Public routes at root level, admin routes under `_admin/` pathless layout
- Auth guard in `_admin/route.tsx`, session loaded in `__root.tsx` loader

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
- 2 properties: "seaglass-villa" and "coral-retreat" (slugs)
- Pricing is dynamic (fetched from platforms), cleaning fee is fixed
- Calendar synced via iCal with Airbnb, VRBO, Hospitable
