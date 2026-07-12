# SoleIQ Web

SoleIQ Web is a foot-health photo screening experience for patients and caregivers. It includes guided intake, four-view foot photography, plain-language screening results, private history, a clinic dashboard, an administrative console, and a small blog CMS.

Built with Next.js, TypeScript, Tailwind CSS, Supabase, Zustand, and React Three Fiber.

## Features

- Guided patient screening flow with conditional health-history questions
- Upload or camera capture for the top and sole of both feet, including HEIC/HEIF conversion
- Local blur, lighting, and resolution checks before submission
- Server-side multimodal photo analysis with structured, safety-wrapped results
- Private Supabase image storage, history, signed image URLs, and deletion
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
- A Supabase project for private photo storage, authentication, and history
- An Anthropic API key for multimodal photo analysis

## Get started

From this directory:

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The intake and photo UI can run without Supabase, but saved photo history requires Supabase. Photo analysis requires `ANTHROPIC_API_KEY`. Foot-photo data URLs stay in memory until the user explicitly saves a completed check.

## Environment variables

Add these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
ANTHROPIC_API_KEY=YOUR-ANTHROPIC-API-KEY
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for legacy projects. The publishable key is intended for client use; access is enforced by Supabase Row Level Security policies. Never add a Supabase service-role key to a `NEXT_PUBLIC_` variable.

`ANTHROPIC_API_KEY` is server-only and must never use the `NEXT_PUBLIC_` prefix. `ANTHROPIC_VISION_MODEL` can optionally override the default Claude model (`claude-sonnet-4-6`).

## Supabase setup

Run these SQL files in the Supabase SQL Editor, in order:

1. [`supabase/schema.sql`](./supabase/schema.sql)
2. [`supabase/2026-05-roles-and-orgs.sql`](./supabase/2026-05-roles-and-orgs.sql)
3. [`supabase/2026-05-blog-posts.sql`](./supabase/2026-05-blog-posts.sql)
4. [`supabase/2026-05-product-updates.sql`](./supabase/2026-05-product-updates.sql)
5. [`supabase/2026-07-photo-screening.sql`](./supabase/2026-07-photo-screening.sql)

The schema provides patient, visit, capture, mesh, and analysis tables. The follow-up scripts add organizations, user profiles, RBAC policies, blog posts, a private foot-photo bucket, and structured photo-screening results. The scripts are designed to be safe to re-run.

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
components/capture/   Four-photo upload/camera UI and previews
lib/                  State, Supabase access, types, and domain logic
supabase/             Database schema and migrations
utils/supabase/       Browser, server, and middleware Supabase clients
```

## Authentication and sessions

The app uses Supabase SSR clients in `utils/supabase/`. Middleware refreshes auth sessions, while the browser client supports patient-facing interactions. New anonymous sessions are created when patient data needs to be persisted; staff accounts use email/password authentication and roles from the `profiles` table.

## Safety boundary

The screening uses ordinary color photos. It can flag visible surface concerns, but it cannot see beneath the skin, detect early inflammation, predict future ulcers, or provide a diagnosis. Unusable photos are rejected instead of scored, urgent visible signs are escalated, and every result includes the photo limitations and a not-a-diagnosis notice.

## Related projects

The repository root contains the wider SoleIQ platform, including the marketing site and legacy standalone dashboard/admin applications. See the [workspace README](../README.md) for the monorepo overview.
