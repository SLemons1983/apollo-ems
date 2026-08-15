# ApolloEMS

ApolloEMS is a Next.js operations platform backed by Supabase. Version 0.2.8 stabilizes MDT status synchronization and adds driver-oriented vector navigation with 3D tilt, heading-up GPS tracking, route continuity, maneuver instructions, step distance, ETA, and remaining distance.

## MDT deployment requirements

1. Apply `supabase/migrations/202608150001_create_mdt_operations.sql` and `supabase/migrations/202608150002_create_mdt_messages.sql` to the production Supabase project.
2. Configure these Vercel environment variables:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `APOLLO_CAD_BASE_URL` (normally `https://apollo-cad-simulator.vercel.app`)
   - `APOLLO_INTEGRATION_SECRET` (the exact same secret configured in CAD)
   - `SUPABASE_SERVICE_ROLE_KEY` (already used by other ApolloEMS server routes)
3. Set the CAD deployment's `APOLLO_MDT_BASE_URL` to `https://apolloems.org`.
4. Deploy ApolloEMS, then open `https://apolloems.org/MDT` while signed into an active ApolloEMS account.

Only active supervisors can log a vehicle on, change its crew, or log it off. Regular authenticated users can operate an already assigned MDT. Out of Service is displayed by the MDT but remains controlled exclusively by CAD.

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
