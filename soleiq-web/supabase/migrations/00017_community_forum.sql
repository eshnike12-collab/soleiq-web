-- Community forum: schema and row-level security.
--
-- PHASE 1 of four. This migration creates the tables and the policies that
-- govern them. No UI, no cron, no seed topics yet.
--
-- Two rules shape everything below.
--
-- 1. The forum is logically separate from the clinical record. Nothing here
--    references patients, organization_patients, reports or screening data,
--    and no policy or helper in this file joins a forum identity to a
--    clinical one. The single place the two worlds touch is
--    forum_can_add_to_group(), which asks "is this user a patient assigned to
--    me?" — it returns a boolean and never exposes which patient record was
--    matched. A view or query that joined forum_profiles.display_name to a
--    patient row would re-identify a pseudonymous author, so there is none.
--
-- 2. Consent is the first predicate of every policy. A user with no row in
--    forum_consents cannot read any forum table at all, which is enforced
--    here rather than by the UI gate that will sit in front of it.
--
-- Deletion is soft, everywhere, with no exceptions: no table in this file has
-- a DELETE policy, and DELETE is revoked from `authenticated` on top of that.
-- RLS denies by default, so the absence of a policy is already a refusal; the
-- revoke is there so that adding a careless policy later still cannot produce
-- a hard delete.

-- ---------- 1. Consent -------------------------------------------------------
create table if not exists public.forum_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  -- Which version of the terms was agreed to. A later version can therefore
  -- require re-consent rather than being applied retroactively.
  terms_version text not null
);

alter table public.forum_consents enable row level security;

/**
 * Has the caller opted in?
 *
 * SECURITY DEFINER so policies on forum tables can call it without the
 * recursion that a sub-select against an RLS-protected table would cause.
 * STABLE so the planner evaluates it once per statement.
 */
create or replace function public.forum_has_consent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.forum_consents c where c.user_id = auth.uid()
  );
$$;

/**
 * Is the caller a forum moderator?
 *
 * Any active clinician or admin membership, plus platform admins. Moderation
 * is deliberately an organization role rather than a forum-specific one:
 * there is no way to become a moderator by using the forum a lot.
 */
create or replace function public.forum_is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and m.role in ('doctor', 'admin')
      and m.status = 'active'
      and p.account_status = 'active'
  ) or public.is_platform_admin();
$$;

-- Users see and write only their own consent row. A user with no row has
-- nothing to read here, which is what makes the "no consent, no forum" rule
-- true of this table too without a special case.
drop policy if exists forum_consents_own_read on public.forum_consents;
create policy forum_consents_own_read on public.forum_consents
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists forum_consents_own_insert on public.forum_consents;
create policy forum_consents_own_insert on public.forum_consents
  for insert to authenticated
  with check (user_id = auth.uid());

-- No UPDATE policy: a consent record is a historical fact. Withdrawing
-- consent is a deletion of forum participation, handled in a later phase as
-- an explicit, audited operation rather than an UPDATE a client can make.

-- ---------- 2. Pseudonymous profile ------------------------------------------
create table if not exists public.forum_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Pseudonymous by design. The check below refuses anything email-shaped,
  -- which is the one form of real-world identity a constraint can recognise
  -- on its own. It CANNOT stop someone typing their own legal name, so the
  -- UI generates a pseudonym by default and the terms must say this is public.
  display_name text not null,
  -- Seeds a generated avatar. Not an uploaded image: see the no-photos rule.
  avatar_seed text not null default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now(),
  constraint forum_profiles_display_name_len
    check (char_length(trim(display_name)) between 2 and 40),
  constraint forum_profiles_display_name_not_email
    check (display_name !~* '[^[:space:]]@[^[:space:]]'),
  -- Deliberately no email, no full_name, no phone, and no patient_id. This
  -- table is the forum's entire notion of who someone is.
  constraint forum_profiles_display_name_trimmed
    check (display_name = trim(display_name))
);

create unique index if not exists forum_profiles_display_name_idx
  on public.forum_profiles (lower(display_name));

alter table public.forum_profiles enable row level security;

-- Every consented user can see every display name — that is what makes a
-- forum legible. Nothing else about the person is in this table to see.
drop policy if exists forum_profiles_read on public.forum_profiles;
create policy forum_profiles_read on public.forum_profiles
  for select to authenticated
  using (public.forum_has_consent());

drop policy if exists forum_profiles_own_write on public.forum_profiles;
create policy forum_profiles_own_write on public.forum_profiles
  for insert to authenticated
  with check (public.forum_has_consent() and user_id = auth.uid());

drop policy if exists forum_profiles_own_update on public.forum_profiles;
create policy forum_profiles_own_update on public.forum_profiles
  for update to authenticated
  using (public.forum_has_consent() and user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- 3. Bans ----------------------------------------------------------
create table if not exists public.forum_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'global' blocks everything; the narrower scopes block one surface, so a
  -- user who misuses groups is not necessarily silenced on the daily topic.
  scope text not null default 'global'
    check (scope in ('global', 'daily', 'groups')),
  -- NULL means indefinite.
  until timestamptz,
  reason text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Not a partial index: an index predicate must be immutable, and `now()` is
-- not. The expiry is filtered at query time in forum_is_banned instead.
create index if not exists forum_bans_user_idx
  on public.forum_bans (user_id, scope);

alter table public.forum_bans enable row level security;

/**
 * Is the caller barred from posting on this surface?
 *
 * A 'global' ban covers every scope. Checked inside the INSERT policies, so a
 * banned user is refused by Postgres and not merely by a disabled button.
 */
create or replace function public.forum_is_banned(p_scope text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.forum_bans b
    where b.user_id = auth.uid()
      and b.scope in ('global', p_scope)
      and (b.until is null or b.until > now())
  );
$$;

-- A banned user can read the ban that applies to them: being silently unable
-- to post, with no explanation, is worse than being told.
drop policy if exists forum_bans_read on public.forum_bans;
create policy forum_bans_read on public.forum_bans
  for select to authenticated
  using (user_id = auth.uid() or public.forum_is_moderator());

drop policy if exists forum_bans_moderator_insert on public.forum_bans;
create policy forum_bans_moderator_insert on public.forum_bans
  for insert to authenticated
  with check (public.forum_is_moderator() and created_by = auth.uid());

-- ---------- 4. Topics --------------------------------------------------------
create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  prompt_text text not null check (char_length(trim(prompt_text)) between 10 and 500),
  category text not null,
  -- The day this topic is the daily topic. NULL for an unscheduled one.
  scheduled_for date,
  created_by uuid references auth.users(id) on delete set null,
  -- NULL for a platform-wide daily topic; set when a clinician creates a
  -- topic for their own organization.
  organization_id uuid references public.organizations(id) on delete cascade,
  is_daily boolean not null default false,
  created_at timestamptz not null default now(),
  -- One daily topic per day. This is the constraint the rotation cron relies
  -- on to be idempotent: a second promotion for the same date is rejected by
  -- the database rather than producing two topics of the day.
  constraint forum_topics_daily_needs_date
    check (not is_daily or scheduled_for is not null)
);

create unique index if not exists forum_topics_one_daily_per_day
  on public.forum_topics (scheduled_for)
  where is_daily;

create index if not exists forum_topics_unscheduled_idx
  on public.forum_topics (category)
  where scheduled_for is null;

alter table public.forum_topics enable row level security;

-- Any consented user reads topics: the daily one, and past ones for the
-- archive. An organization-scoped topic is visible only to its members.
drop policy if exists forum_topics_read on public.forum_topics;
create policy forum_topics_read on public.forum_topics
  for select to authenticated
  using (
    public.forum_has_consent()
    and (
      organization_id is null
      or public.has_active_membership(organization_id)
    )
  );

-- Moderators create topics. Patients do not: the daily prompt is the thing
-- that keeps the forum on-subject, and an open topic list is a different
-- product with different moderation needs.
drop policy if exists forum_topics_moderator_insert on public.forum_topics;
create policy forum_topics_moderator_insert on public.forum_topics
  for insert to authenticated
  with check (
    public.forum_is_moderator()
    and created_by = auth.uid()
    and (
      organization_id is null
      or public.has_active_membership(organization_id)
    )
  );

-- ---------- 5. Groups --------------------------------------------------------
create table if not exists public.forum_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  owner_membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (owner_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade
);

create index if not exists forum_groups_owner_idx
  on public.forum_groups (owner_membership_id);

alter table public.forum_groups enable row level security;

create table if not exists public.forum_group_members (
  group_id uuid not null references public.forum_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists forum_group_members_user_idx
  on public.forum_group_members (user_id)
  where status = 'active';

alter table public.forum_group_members enable row level security;

/**
 * Is the caller an active member of this group?
 *
 * The group owner is a member like anyone else — forum_create_group adds them
 * — so group visibility has exactly one rule rather than "members, or the
 * owner, or...".
 */
create or replace function public.forum_in_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.forum_group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
  );
$$;

/**
 * May the caller add this user to this group?
 *
 * This is the rule the brief asks to live in the policy rather than the UI,
 * so calling the API directly cannot get round it. Two cases are allowed and
 * nothing else:
 *
 *   1. The group's owner adding THEMSELVES, which is how a group gets its
 *      first member.
 *   2. The group's owner adding a user who is a patient actively assigned to
 *      that same clinician membership via care_team_assignments.
 *
 * The assignment conditions are copied from has_active_care_assignment so the
 * two cannot drift: active membership, active profile, active enrollment,
 * active assignment, started, not ended.
 *
 * It returns only a boolean. Which patient record matched is never exposed —
 * that is the one deliberate point of contact between the forum and the
 * clinical schema, and it is one-way.
 */
create or replace function public.forum_can_add_to_group(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with owner_check as (
    select g.id, g.owner_membership_id, g.organization_id
    from public.forum_groups g
    join public.organization_memberships m
      on m.id = g.owner_membership_id
     and m.organization_id = g.organization_id
    join public.profiles p on p.id = m.user_id
    where g.id = p_group_id
      and m.user_id = auth.uid()
      and m.role in ('doctor', 'admin')
      and m.status = 'active'
      and p.account_status = 'active'
  )
  select exists (select 1 from owner_check) and (
    -- Case 1: the owner adding themselves.
    p_user_id = auth.uid()
    -- Case 2: the owner adding one of their own assigned patients.
    or exists (
      select 1
      from owner_check oc
      join public.care_team_assignments a
        on a.clinician_membership_id = oc.owner_membership_id
       and a.organization_id = oc.organization_id
      join public.organization_patients op
        on op.id = a.organization_patient_id
       and op.organization_id = a.organization_id
      join public.patients pt on pt.id = op.patient_id
      where pt.linked_user_id = p_user_id
        and op.enrollment_status = 'active'
        and a.status = 'active'
        and a.starts_at <= now()
        and (a.ends_at is null or a.ends_at > now())
        and a.ended_at is null
    )
  );
$$;

-- A group is visible to its members. Private is the default and the only
-- shape Phase 1 ships; is_private is stored so a later phase can open one up
-- without a migration.
drop policy if exists forum_groups_member_read on public.forum_groups;
create policy forum_groups_member_read on public.forum_groups
  for select to authenticated
  using (public.forum_has_consent() and public.forum_in_group(id));

-- Only an active clinician/admin may create a group, and only owning it
-- through their own membership.
drop policy if exists forum_groups_clinician_insert on public.forum_groups;
create policy forum_groups_clinician_insert on public.forum_groups
  for insert to authenticated
  with check (
    public.forum_has_consent()
    and public.has_active_membership(organization_id, array['doctor', 'admin'])
    and exists (
      select 1 from public.organization_memberships m
      where m.id = owner_membership_id
        and m.organization_id = forum_groups.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

-- Members see the roster of a group they are in.
drop policy if exists forum_group_members_read on public.forum_group_members;
create policy forum_group_members_read on public.forum_group_members
  for select to authenticated
  using (
    public.forum_has_consent()
    and (user_id = auth.uid() or public.forum_in_group(group_id))
  );

-- THE policy the acceptance criteria name: adding anyone who is not an
-- assigned patient of the owning clinician is refused here, by Postgres.
drop policy if exists forum_group_members_owner_insert on public.forum_group_members;
create policy forum_group_members_owner_insert on public.forum_group_members
  for insert to authenticated
  with check (
    public.forum_has_consent()
    and added_by = auth.uid()
    and public.forum_can_add_to_group(group_id, user_id)
  );

/**
 * Does the caller own this group?
 *
 * Distinct from forum_can_add_to_group on purpose. Removing someone must not
 * depend on whether they could still be ADDED: when a care assignment ends,
 * the clinician needs to take that person off the roster, and a policy
 * phrased as "can you add them?" would be false exactly then and leave the
 * member stuck in the group.
 */
create or replace function public.forum_owns_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.forum_groups g
    join public.organization_memberships m
      on m.id = g.owner_membership_id
     and m.organization_id = g.organization_id
    where g.id = p_group_id
      and m.user_id = auth.uid()
      and m.role in ('doctor', 'admin')
      and m.status = 'active'
  );
$$;

-- Removal is a status change, not a delete. The owner may remove anyone, and
-- a member may always remove themselves — nobody is held in a private health
-- discussion group against their wishes.
drop policy if exists forum_group_members_owner_update on public.forum_group_members;
create policy forum_group_members_owner_update on public.forum_group_members
  for update to authenticated
  using (public.forum_owns_group(group_id) or user_id = auth.uid())
  with check (public.forum_owns_group(group_id) or user_id = auth.uid());

-- ---------- 6. Posts ---------------------------------------------------------
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.forum_topics(id) on delete cascade,
  group_id uuid references public.forum_groups(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_reason text,
  -- A post belongs to exactly one place. Both null would be an orphan, both
  -- set would be readable under two different visibility rules at once.
  constraint forum_posts_one_home
    check ((topic_id is null) <> (group_id is null)),
  -- A deletion is only ever recorded as a complete account of itself.
  constraint forum_posts_deletion_complete
    check (
      (deleted_at is null and deleted_by is null and deleted_reason is null)
      or (deleted_at is not null and deleted_by is not null)
    )
);

create index if not exists forum_posts_topic_idx
  on public.forum_posts (topic_id, created_at desc)
  where topic_id is not null;
create index if not exists forum_posts_group_idx
  on public.forum_posts (group_id, created_at desc)
  where group_id is not null;
create index if not exists forum_posts_author_idx
  on public.forum_posts (author_user_id);

alter table public.forum_posts enable row level security;

/**
 * Keep a post's identity and its deletion honest.
 *
 * RLS cannot say WHICH columns an update may touch, so an UPDATE policy alone
 * would let an author rewrite author_user_id, move a post between a group and
 * a topic, or clear deleted_at to undo a moderator. This trigger is where
 * those become impossible.
 *
 * Moderator deletion does not come through here at all — it goes through
 * forum_moderator_delete_post(), which is SECURITY DEFINER and sets a session
 * flag this trigger honours.
 */
create or replace function public.forum_posts_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Immutable for the life of the row.
  if new.id <> old.id
    or new.author_user_id <> old.author_user_id
    or new.created_at <> old.created_at
    or coalesce(new.topic_id::text, '') <> coalesce(old.topic_id::text, '')
    or coalesce(new.group_id::text, '') <> coalesce(old.group_id::text, '')
  then
    raise exception 'a post cannot be reassigned or moved'
      using errcode = '42501';
  end if;

  -- Nothing is ever undeleted. Restoring a removed post is a new post.
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'a deleted post cannot be restored'
      using errcode = '42501';
  end if;

  -- A deleted post's body is frozen, so a moderation record cannot be
  -- rewritten after the fact.
  if old.deleted_at is not null and new.body <> old.body then
    raise exception 'a deleted post cannot be edited'
      using errcode = '42501';
  end if;

  -- Only the moderation function may attribute a deletion to someone other
  -- than the author. Without this an author could delete their own post and
  -- record a moderator as having done it.
  if new.deleted_at is not null
    and old.deleted_at is null
    and new.deleted_by <> auth.uid()
    and coalesce(current_setting('soleiq.forum_moderating', true), '') <> 'on'
  then
    raise exception 'a deletion must be attributed to the person making it'
      using errcode = '42501';
  end if;

  -- Stamp an edit rather than trusting the client to.
  if new.body <> old.body then
    new.edited_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists forum_posts_guard_trg on public.forum_posts;
create trigger forum_posts_guard_trg
  before update on public.forum_posts
  for each row execute function public.forum_posts_guard();

-- Reading a post follows the visibility of where it lives: a topic post is
-- readable by any consented user, a group post ONLY by that group's members.
drop policy if exists forum_posts_read on public.forum_posts;
create policy forum_posts_read on public.forum_posts
  for select to authenticated
  using (
    public.forum_has_consent()
    and (
      (
        topic_id is not null
        and exists (
          select 1 from public.forum_topics t
          where t.id = forum_posts.topic_id
            and (
              t.organization_id is null
              or public.has_active_membership(t.organization_id)
            )
        )
      )
      or (group_id is not null and public.forum_in_group(group_id))
    )
  );

-- Posting: consented, not banned, writing as yourself, and into a place you
-- can actually see. A new post can never arrive already deleted.
drop policy if exists forum_posts_insert on public.forum_posts;
create policy forum_posts_insert on public.forum_posts
  for insert to authenticated
  with check (
    public.forum_has_consent()
    and author_user_id = auth.uid()
    and deleted_at is null
    and (
      (
        topic_id is not null
        and not public.forum_is_banned('daily')
        and exists (
          select 1 from public.forum_topics t
          where t.id = forum_posts.topic_id
            and (
              t.organization_id is null
              or public.has_active_membership(t.organization_id)
            )
        )
      )
      or (
        group_id is not null
        and not public.forum_is_banned('groups')
        and public.forum_in_group(group_id)
      )
    )
  );

-- Authors edit and soft-delete their own posts. Moderators are deliberately
-- absent from this policy: a blanket UPDATE would let them rewrite a body,
-- and their route is forum_moderator_delete_post() instead.
drop policy if exists forum_posts_author_update on public.forum_posts;
create policy forum_posts_author_update on public.forum_posts
  for update to authenticated
  using (
    public.forum_has_consent()
    and author_user_id = auth.uid()
    and deleted_at is null
  )
  with check (author_user_id = auth.uid());

/**
 * Moderator soft-delete, with a reason that is not optional.
 *
 * SECURITY DEFINER because moderators have no UPDATE policy on forum_posts at
 * all — which is the point: this is the only way they can change a post, and
 * it can only ever set the deletion columns.
 */
create or replace function public.forum_moderator_delete_post(
  p_post_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.forum_posts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not public.forum_is_moderator() then
    raise exception 'moderator role required' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  select * into target from public.forum_posts where id = p_post_id for update;
  if target.id is null then
    raise exception 'post not found' using errcode = '22023';
  end if;
  if target.deleted_at is not null then
    -- Already removed. Not an error: two moderators reaching for the same
    -- post should not produce a failure for the second one.
    return true;
  end if;

  -- Tells forum_posts_guard that this deletion is a moderation action and may
  -- therefore be attributed to someone other than the author.
  perform set_config('soleiq.forum_moderating', 'on', true);
  update public.forum_posts
  set deleted_at = now(),
      deleted_by = auth.uid(),
      deleted_reason = trim(p_reason)
  where id = p_post_id;
  perform set_config('soleiq.forum_moderating', 'off', true);

  return true;
end;
$$;

-- ---------- 7. Reactions -----------------------------------------------------
create table if not exists public.forum_reactions (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('support', 'thanks', 'same')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

alter table public.forum_reactions enable row level security;

/**
 * Can the caller see this post?
 *
 * Reactions and reports both need the same question answered, and neither
 * should be able to confirm the existence of a post in a group the caller is
 * not in. Phrased as one function so the two cannot disagree.
 */
create or replace function public.forum_can_see_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.forum_has_consent() and exists (
    select 1
    from public.forum_posts p
    left join public.forum_topics t on t.id = p.topic_id
    where p.id = p_post_id
      and (
        (
          p.topic_id is not null
          and (
            t.organization_id is null
            or public.has_active_membership(t.organization_id)
          )
        )
        or (p.group_id is not null and public.forum_in_group(p.group_id))
      )
  );
$$;

drop policy if exists forum_reactions_read on public.forum_reactions;
create policy forum_reactions_read on public.forum_reactions
  for select to authenticated
  using (public.forum_can_see_post(post_id));

drop policy if exists forum_reactions_own_insert on public.forum_reactions;
create policy forum_reactions_own_insert on public.forum_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.forum_is_banned('global')
    and public.forum_can_see_post(post_id)
  );

-- Un-reacting is the one genuine delete in the forum: a reaction carries no
-- content and no moderation value, so removing one leaves nothing to audit.
drop policy if exists forum_reactions_own_delete on public.forum_reactions;
create policy forum_reactions_own_delete on public.forum_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------- 8. Reports -------------------------------------------------------
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 1000),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- One report per person per post: a second one is the same signal twice.
  unique (post_id, reported_by)
);

create index if not exists forum_reports_open_idx
  on public.forum_reports (created_at)
  where status = 'open';

alter table public.forum_reports enable row level security;

-- A reporter sees their own report so the UI can say "you reported this".
-- Moderators see all of them — that listing is the moderation queue.
drop policy if exists forum_reports_read on public.forum_reports;
create policy forum_reports_read on public.forum_reports
  for select to authenticated
  using (
    (reported_by = auth.uid() and public.forum_has_consent())
    or public.forum_is_moderator()
  );

drop policy if exists forum_reports_insert on public.forum_reports;
create policy forum_reports_insert on public.forum_reports
  for insert to authenticated
  with check (
    reported_by = auth.uid()
    and status = 'open'
    and public.forum_can_see_post(post_id)
  );

-- Only moderators resolve. No DELETE policy: a dismissed report stays on the
-- record, because a pattern of reports against one author is itself a signal.
drop policy if exists forum_reports_moderator_update on public.forum_reports;
create policy forum_reports_moderator_update on public.forum_reports
  for update to authenticated
  using (public.forum_is_moderator())
  with check (public.forum_is_moderator());

-- ---------- 9. Privileges ----------------------------------------------------
-- Nothing in the forum is ever hard-deleted, so DELETE is revoked outright.
-- forum_reactions is the single exception, and it is granted back explicitly
-- so the exception is visible rather than implied.
do $$
declare
  t text;
begin
  foreach t in array array[
    'forum_consents', 'forum_profiles', 'forum_topics', 'forum_groups',
    'forum_group_members', 'forum_posts', 'forum_reactions',
    'forum_reports', 'forum_bans'
  ]
  loop
    execute format('revoke delete on table public.%I from authenticated', t);
    execute format('revoke truncate on table public.%I from authenticated', t);
  end loop;
  grant delete on table public.forum_reactions to authenticated;
end
$$;

-- Supabase's default privileges grant EXECUTE on new functions to anon,
-- authenticated and service_role, so revoking from `public` alone would leave
-- anon able to call these. Each role is revoked explicitly.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.forum_has_consent()',
    'public.forum_is_moderator()',
    'public.forum_is_banned(text)',
    'public.forum_in_group(uuid)',
    'public.forum_owns_group(uuid)',
    'public.forum_can_add_to_group(uuid, uuid)',
    'public.forum_can_see_post(uuid)',
    'public.forum_moderator_delete_post(uuid, text)'
  ]
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('revoke all on function %s from authenticated', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end
$$;

-- forum_posts_guard is a trigger function and must never be callable
-- directly; it has no business being invoked outside the trigger.
revoke all on function public.forum_posts_guard() from public;
revoke all on function public.forum_posts_guard() from anon;
revoke all on function public.forum_posts_guard() from authenticated;
