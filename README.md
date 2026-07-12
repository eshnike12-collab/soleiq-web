# SoleIQ

Monorepo for the SoleIQ platform — AI-assisted diabetic foot screening for primary care and podiatry, plus the public marketing site.

## Apps

| Folder | Stack | Role |
|---|---|---|
| [`soleiq-web/`](./soleiq-web) | Next.js 14 + TypeScript + Tailwind + Supabase | Unified platform: patient clinical-screening flow at `/`, clinic dashboard at `/dashboard`, super-admin console at `/admin`, blog CMS at `/admin/blog`, BLE test page at `/bt`. |
| [`soleiq-foot-ai/`](./soleiq-foot-ai) | Python 3.11 + FastAPI + PyTorch + FAISS | Foot-image AI service: quality gate, calibrated DFU classifier, similar-case retrieval, Grad-CAM, and the Claude vision judge producing the dual patient/clinician reading. `soleiq-web` proxies to it via `/api/analyze` (`AI_BASE_URL`, default `localhost:8000`). |
| [`soleiq-website/`](./soleiq-website) | Vite + React + Tailwind + Supabase | Public marketing site with live blog reads. |
| [`soleiq-admin/`](./soleiq-admin) | Vite + React | Legacy standalone admin (now superseded by `soleiq-web/app/admin`). Kept for reference. |
| [`soleiq-dashboard/`](./soleiq-dashboard) | Vite + React | Legacy standalone clinic dashboard (now superseded by `soleiq-web/app/dashboard`). Kept for reference. |
| [`soleiq-insole-demo/`](./soleiq-insole-demo) | — | Hardware/insole demo assets. |
| [`SoleIQ-app/`](./SoleIQ-app) | — | Earlier app prototype. |
| [`RadiantCure/`](./RadiantCure) | — | Related project assets. |

## Backend

Single shared Supabase project. Schema lives in [`soleiq-web/supabase/`](./soleiq-web/supabase):

1. `schema.sql` — patients, visits, captured_images, foot_meshes, analysis_results + base RLS
2. `2026-05-roles-and-orgs.sql` — organizations, profiles, RBAC, role-aware RLS
3. `2026-05-blog-posts.sql` — blog_posts + public-read RLS
4. `2026-05-product-updates.sql` — adds `patients.pad` and `foot_meshes.heightmap` columns

Run them in order in the Supabase SQL Editor. Each is idempotent.

## Local dev

Each app has its own `package.json`. Pick one:

```bash
cd soleiq-web && npm install && npm run dev      # → localhost:3000
cd soleiq-website && npm install && npm run dev  # → localhost:5173

# AI service (required for real analyses in soleiq-web)
cd soleiq-foot-ai && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/serve.py --config config.quick.yaml   # → localhost:8000
```

Both apps read Supabase creds from a local `.env.local` (template at `*/. env.local.example`).

## Roles

- `super_admin` — sees all organizations, all patients, all visits
- `clinic_admin` — sees only their organization's patients
- `patient` — sees only their own data (anonymous auth)

Bootstrap a super admin in Supabase SQL:

```sql
select public.promote_to_super_admin('you@email.com');
```
