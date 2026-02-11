This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Stripe (Payments)

Checkout uses Stripe. Set these in `.env.local` (and in Vercel for production):

- `STRIPE_SECRET_KEY` – Stripe secret key (test or live)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – Publishable key (optional for hosted Checkout)
- `STRIPE_PRICE_MONTHLY` – Price ID for the monthly plan (e.g. `price_xxx`)
- `STRIPE_PRICE_ANNUAL` – Price ID for the annual plan (e.g. `price_yyy`)

Get the **Price IDs** from Stripe Dashboard → Products → open each product → copy the Price ID.

**Webhook (required for marking users as paid):**

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://your-domain.com/api/stripe/webhook`
3. Events: `checkout.session.completed`
4. Copy the **Signing secret** and set `STRIPE_WEBHOOK_SECRET` in your env.

For local testing use [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the printed signing secret.

Optional: `NEXT_PUBLIC_APP_URL` for correct success/cancel redirect URLs in production (e.g. `https://yoursite.com`).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
