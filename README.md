# VSPHERE

VSPHERE is a Next.js app wired for Supabase Auth, Supabase Postgres, a protected dashboard, and a contact API route.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Run the SQL in `supabase/schema.sql` inside the Supabase SQL Editor.
4. In Supabase Auth providers, enable GitHub and Google.
5. Add this redirect URL in Supabase Auth URL settings:

```text
http://localhost:3000/auth/callback
```

For production, add the deployed domain callback too:

```text
https://your-domain.com/auth/callback
```

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
