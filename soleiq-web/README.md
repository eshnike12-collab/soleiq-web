# SoleIQ Web

SoleIQ Web is the unified clinical screening experience for diabetic-foot monitoring. It includes a guided patient intake and scan flow, risk results, a clinic dashboard, an administrative console, and a small blog CMS.

Built with Next.js, TypeScript, Tailwind CSS, Supabase, Zustand, and React Three Fiber.

## Features

- Guided patient screening flow with conditional health-history questions
- Camera-assisted foot capture, 3D reconstruction previews, and risk results
- Local-first state with optional Supabase persistence
- Anonymous patient sessions plus role-based staff access
- Clinic dashboard, super-admin console, and blog management
- Bluetooth device test page for compatible hardware

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Patient clinical screening flow |
| `/clinical` | Clinical summary view |
| `/dashboard` | Clinic dashboard |
| `/admin` | Super-admin console |
| `/admin/blog` | Blog management |
| `/login` | Staff authentication |
| `/bt` | Bluetooth device test page |

## Requirements

- Node.js 22 or later
- npm 10 or later
- A Supabase project for persistence, authentication, and role-based access

## Get started

From this directory:

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app can run without Supabase configuration in a local demo mode. In that mode, data is held in memory and browser session storage only.

## Environment variables

Add these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for legacy projects. The publishable key is intended for client use; access is enforced by Supabase Row Level Security policies. Never add a Supabase service-role key to a `NEXT_PUBLIC_` variable.

## Supabase setup

Run these SQL files in the Supabase SQL Editor, in order:

1. [`supabase/schema.sql`](./supabase/schema.sql)
2. [`supabase/2026-05-roles-and-orgs.sql`](./supabase/2026-05-roles-and-orgs.sql)
3. [`supabase/2026-05-blog-posts.sql`](./supabase/2026-05-blog-posts.sql)
4. [`supabase/2026-05-product-updates.sql`](./supabase/2026-05-product-updates.sql)

The schema provides patient, visit, capture, mesh, and analysis tables. The follow-up scripts add organizations, user profiles, RBAC policies, blog posts, and later product fields. The scripts are designed to be safe to re-run.

To bootstrap a super-admin account after that user has signed up, run:

```sql
select public.promote_to_super_admin('you@example.com');
```

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Run the production build
npm run lint     # Run Next.js linting
```

## Project structure

```text
app/                  Next.js routes and layouts
components/screens/   Guided screening-flow screens
components/flow/      Shared phone-frame flow layout and navigation
components/capture/   Camera capture and scan UI
components/three/     3D foot rendering and scan animation
lib/                  State, Supabase access, types, and domain logic
supabase/             Database schema and migrations
utils/supabase/       Browser, server, and middleware Supabase clients
```

## Authentication and sessions

The app uses Supabase SSR clients in `utils/supabase/`. Middleware refreshes auth sessions, while the browser client supports patient-facing interactions. New anonymous sessions are created when patient data needs to be persisted; staff accounts use email/password authentication and roles from the `profiles` table.

## Related projects

The repository root contains the wider SoleIQ platform, including the marketing site and legacy standalone dashboard/admin applications. See the [workspace README](../README.md) for the monorepo overview.
