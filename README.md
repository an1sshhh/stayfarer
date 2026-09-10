# Web (Guest App)

Next.js app for guests: browsing/booking hotels and signing in. Part of the [hotel-booking](../README.md) platform.

## Setup

```bash
npm install
cp .env.local.example .env.local   # point at the backend if it's not on localhost:4000
npm run dev                         # http://localhost:3000
```

Requires the [`server`](./server) app running (defaults to `http://localhost:4000`).

```bash
cd server
npm install
cp .env.example .env
npx knex migrate:latest
npx knex seed:run
npm run dev   # http://localhost:4000
```

## What's implemented

### Public (no auth required)
- `/` — homepage: hero search, popular destinations, featured hotels grid pulled live from API
- `/hotels` — search results: filter by city/search query, grid layout
- `/hotels/:id` — hotel detail: images, amenities, description, room types with pricing + inline "Book Now" + date/guest picker

### Auth flow
- `/register` — guest signup form → `POST /api/auth/register` → stores JWT with `customerId` in `localStorage`
- `/login` — sign in form → `POST /api/auth/login` → returns to `?next` param (defaults to home)

### Booking (gated by auth)
- `/hotels/:id/book?roomTypeId=X&ratePlanId=Y&checkIn=...&checkOut=...&guests=N` — 
  - If logged out: shows "Sign in to book" modal with Log in / Create account buttons
  - If logged in: confirm order summary → `POST /api/bookings` → shows success page with booking ID

## Structure

```
app/
  page.tsx                     # homepage
  login/page.tsx               # login form with register link
  register/page.tsx            # signup form with login link
  hotels/
    page.tsx                   # search results
    [id]/page.tsx              # hotel detail
    [id]/book/page.tsx         # booking confirmation (gated)
  components/
    Header.tsx                 # sticky nav: Stayfarer logo, Hotels link, sign in/out
    SearchBar.tsx              # city/check-in/check-out/guests, submits to /hotels
    RoomBookingCard.tsx        # per-room card with date/guest input + "Book Now" button
```

## Key features

- **Stateless auth**: JWT in `localStorage`, attached to all API calls via `Authorization: Bearer` header
- **Server-computed pricing**: room price → taxes → discount → total, all calculated on backend (never trust frontend prices)
- **Inventory atomicity**: bookings reserve inventory transactionally (prevents double-booking under concurrent requests)
- **Responsive design**: mobile-first with Tailwind, works on phones/tablets/desktop
- **Live data**: all listings pull fresh from API (no static content)

## Next steps

- Payment gateway integration
- Wishlist / saved properties
- Guest reviews UI
- Coupon code input field on booking confirm
- Booking history + cancellations
- Email notifications
