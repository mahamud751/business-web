# আপন / Apon

A Bengali family-care storefront using Next.js App Router, React, TypeScript, Prisma, and PostgreSQL. Branded “আপন” with a clean warm-neutral, terracotta, and forest-green design system: sticky header, family-focused hero, need-based categories, curated toy and baby-care collections, and a slide-in cart with checkout.

## Run locally

Requires Node.js 24+ and Docker (or an existing PostgreSQL database).

```sh
nvm use
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000. For an existing PostgreSQL server, set `DATABASE_URL` in `.env` and skip Docker. `compose.yaml` targets PostgreSQL 18. Do not use the sample credentials in production.

Without `DATABASE_URL`, browsing uses the bundled 16-product catalog. Checkout returns a clear service-unavailable error instead of pretending to save an order.

## Included

- Original React homepage, local images and fonts, responsive navigation, and curated collections.
- Search, category pages, price sorting, product detail pages, empty states, and unknown-product 404s.
- Persistent cart, quantity controls, removal, and cash-on-delivery checkout.
- PostgreSQL products, orders, order items, migration, and idempotent product seed.
- Server-side validation, database-authoritative pricing, atomic stock decrement, and transaction rollback on unavailable stock.
- Delivery: ৳80 in Dhaka, ৳130 elsewhere, free for 4+ items or Dhaka orders of ৳2,000+.

## Validation

```sh
npm run build
npm run typecheck
```

`npm run test:browser` requires Chrome, a running app on port 3000, and a seeded **test** database. It creates a test order. Checks cover desktop/mobile, redesigned homepage, search, product details, cart persistence, quantity updates, checkout, invalid requests, and browser errors.

The implementation was verified using an isolated local PostgreSQL 17 instance available on the development machine. PostgreSQL 18 is configured for deployment but was not available locally to test.

## Source and launch notes

The current storefront uses native React components in `components/FamilyHome.tsx` and `components/Storefront.tsx`. `app/globals.css` holds the whole design system (tokens on `:root`, then components), `app/fonts.css` the local Hind Siliguri and Inter fonts, and `components/icons.tsx` the inline SVG icons. Legacy reference templates remain in `lib` as unused source artifacts; they are no longer rendered. The reference's countdown, reviews, payment logos, and business contact/social links have been removed from the live storefront.

The original 16-product catalog and local product images are retained. Some product images contain the original seller's branding; replace these with your own product photography before commercial launch. Empty categories show an empty state. Policy pages explicitly contain draft placeholders. Only cash on delivery is implemented.

This is a local Next.js project; it has not been published. Deploy to a Node.js-capable host with PostgreSQL, set `DATABASE_URL`, run `npm run db:deploy`, then `npm run build` and `npm start`. Production order operations should additionally use deployment-level request rate limiting and monitoring.

## Admin panel

Open **http://localhost:3000/admin**. All management APIs require an admin session; the storefront remains public.

After configuring `DATABASE_URL`:

```sh
npm run db:deploy
npm run db:generate
npm run admin:create
npm run dev
```

`admin:create` creates `admin@apon.local` with a randomly generated password and saves the credentials to `.admin-credentials` (Git-ignored, owner-readable only). It does not overwrite existing accounts. Optional `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables configure the initial account; custom passwords must be at least 12 characters. Keep the credentials file private.

Features:

- Overview: delivered revenue, order count, pending orders, active products, and low-stock count.
- Products: searchable, paginated list; create/edit product details, prices, category, image URL/path, and stock; remove products from the storefront.
- Product deletion is a soft delete so past order references remain intact. Deleted slugs remain reserved. Editing detects concurrent checkout/stock changes and asks you to reload instead of overwriting them.
- Orders: search by order ID, name, or phone; filter by status; view customer/shipping details, item quantities, original unit prices, and totals.
- Status workflow: Pending → Confirmed → Shipped → Delivered. Pending and Confirmed orders can be cancelled; cancellation restores stock transactionally once. Delivered/cancelled orders are terminal. Orders are retained for history rather than deleted.
- Order item names and prices are saved at purchase, so later product edits do not rewrite order history.
- Images currently use an HTTPS URL or an existing file path under `public/`; file uploads are not included.

Authentication uses scrypt password hashes, database-backed opaque sessions, HttpOnly/SameSite cookies (Secure in production), an eight-hour expiry, same-origin checks for mutations, and a 15-minute account lock after five failed passwords. There is no public admin registration.

`node scripts/verify-admin.mjs` runs Chrome integration checks against the running local development app and isolated database on port 55432. It reads the local credentials file, creates temporary products/orders, and cleans up those records. Do not point this script at production.
