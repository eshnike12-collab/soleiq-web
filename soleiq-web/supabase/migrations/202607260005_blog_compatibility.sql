-- Preserve the non-clinical blog on fresh canonical databases.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body_markdown text not null default '',
  category text,
  cover_gradient text,
  read_min integer not null default 5 check (read_min > 0),
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published_idx
  on public.blog_posts(published, published_at desc);
drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;
alter table public.blog_posts force row level security;
drop policy if exists blog_posts_public_read on public.blog_posts;
drop policy if exists blog_posts_admin_read on public.blog_posts;
drop policy if exists blog_posts_admin_write on public.blog_posts;
drop policy if exists blog_posts_platform_admin_read on public.blog_posts;
drop policy if exists blog_posts_platform_admin_write on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  for select to anon, authenticated using (published = true);
create policy blog_posts_platform_admin_read on public.blog_posts
  for select to authenticated using (public.is_platform_admin());
create policy blog_posts_platform_admin_write on public.blog_posts
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

