# JZ Vacation Stays — Route Map

## Public Routes

| Route File | URL | Description |
|-----------|-----|-------------|
| `routes/index.tsx` | `/` | Landing page (hero, property cards, CTA) |
| `routes/properties/index.tsx` | `/properties` | Both properties listed |
| `routes/properties/$propertyId.tsx` | `/properties/:slug` | Property detail (photos, amenities, reviews, calendar) |
| `routes/booking/$propertyId.tsx` | `/booking/:slug` | Booking flow (dates → guest info → payment) |
| `routes/booking/confirmation.$bookingId.tsx` | `/booking/confirmation/:id` | Post-booking confirmation |
| `routes/auth/login.tsx` | `/auth/login` | Email input for OTP |
| `routes/auth/verify.tsx` | `/auth/verify` | OTP entry / magic link callback |

## Admin Routes

All behind `_admin/route.tsx` pathless layout with auth + admin role guard.

| Route File | URL | Description |
|-----------|-----|-------------|
| `routes/_admin/route.tsx` | (layout) | Admin layout + sidebar + role check |
| `routes/_admin/dashboard.tsx` | `/dashboard` | Overview: upcoming bookings, revenue, occupancy |
| `routes/_admin/bookings.tsx` | `/bookings` | Bookings table with filters + status management |
| `routes/_admin/reviews.tsx` | `/reviews` | Review moderation (show/hide) |
| `routes/_admin/calendar-sync.tsx` | `/calendar-sync` | Manage iCal feed URLs + manual sync |
| `routes/_admin/checklists/index.tsx` | `/checklists` | Checklists list + create |
| `routes/_admin/checklists/$checklistId.tsx` | `/checklists/:id` | Checklist detail with items |
| `routes/_admin/thermostat.tsx` | `/thermostat` | Thermostat control per property |

## Server Routes (HTTP endpoints)

| Route File | Method | URL | Description |
|-----------|--------|-----|-------------|
| `server/api/calendar-export.$propertyId.ts` | GET | `/api/calendar-export/:propertyId?token=...` | Serves `.ics` file for external platforms |
| `server/api/stripe-webhook.ts` | POST | `/api/stripe-webhook` | Stripe payment event webhook |

## Server Functions (RPC, not HTTP)

Called via TanStack Start `createServerFn` — type-safe, no REST needed.

| Module | Functions |
|--------|----------|
| `server/functions/auth.ts` | sendOtp, verifyOtp, getSession, logout |
| `server/functions/properties.ts` | getProperties, getPropertyById |
| `server/functions/bookings.ts` | createBooking, getBookings, getBookingById, updateBookingStatus |
| `server/functions/reviews.ts` | getReviewsByProperty, createReview, toggleReviewVisibility |
| `server/functions/payments.ts` | createPaymentIntent, confirmPayment, refund |
| `server/functions/calendar-sync.ts` | syncCalendar, getAvailability, addCalendarSync |
| `server/functions/checklists.ts` | CRUD for checklists and items |
| `server/functions/thermostat.ts` | getThermostatStatus, setTemperature |
