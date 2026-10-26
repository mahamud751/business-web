# Tuhfa Mart

A responsive recreation of https://tuhfamart.com/ using Next.js App Router, React, TypeScript, Prisma, and PostgreSQL. The homepage preserves the reference's Bengali typography, images, layout, colors, category tiles, and product sections.

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

- Reference homepage with local images and fonts, responsive navigation, and interactive banner carousel.
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

`npm run test:browser` requires Chrome, a running app on port 3000, and a seeded **test** database. It creates a test order. Checks cover desktop/mobile, carousel, search, product details, cart persistence, quantity updates, checkout, invalid requests, and browser errors.

The implementation was verified using an isolated local PostgreSQL 17 instance available on the development machine. PostgreSQL 18 is configured for deployment but was not available locally to test.

## Source and launch notes

The reference HTML was converted to sanitized presentation templates in `lib/*-template.json`; React replaces interactive elements with local controls. `app/reference.css` retains reference styling; `app/globals.css` styles the additional shopping flows. Images and fonts are hosted locally. No original scripts, analytics pixels, or backend connections are executed.

Only the 16 distinct products visible on the reference homepage are bundled. Category counts and promotional copy retain the reference design; populate the complete catalog and update promotional copy before launch. Empty categories show an empty state. Policy pages explicitly contain draft placeholders. Payment logos mirror the reference, but only cash on delivery is implemented. Contact/social links retain the reference business details. Review these, asset permissions, policy content, and payment integrations for your own store before publishing.

This is a local Next.js project; it has not been published. Deploy to a Node.js-capable host with PostgreSQL, set `DATABASE_URL`, run `npm run db:deploy`, then `npm run build` and `npm start`. Production order operations should additionally use deployment-level request rate limiting and monitoring.
