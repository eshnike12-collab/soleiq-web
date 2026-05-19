-- Blog posts: super-admin authored, anyone-readable when published.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body_markdown text not null default '',
  category text,
  cover_gradient text,         -- e.g. 'from-[#3b82f6] to-[#06b6d4]'
  read_min int not null default 5,
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_idx
  on public.blog_posts(published, published_at desc);

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

-- Anyone (anon + authenticated) can read published posts.
drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  for select to anon, authenticated
  using (published = true);

-- Super admins see drafts too.
drop policy if exists blog_posts_admin_read on public.blog_posts;
create policy blog_posts_admin_read on public.blog_posts
  for select to authenticated
  using (public.has_role('super_admin'));

-- Only super admins can write.
drop policy if exists blog_posts_admin_write on public.blog_posts;
create policy blog_posts_admin_write on public.blog_posts
  for all to authenticated
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));
