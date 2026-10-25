import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Phase 1 of the forum is a migration, and there is no Postgres in this
 * environment to run it against. These tests therefore assert the invariants
 * that make the policies safe, read out of the SQL itself.
 *
 * They are a regression guard, not proof the migration applies. Each one
 * corresponds to a rule from the brief that would be silently lost in an edit
 * — "readable only by group members", "enforce it in the policy, not the UI",
 * "nothing is ever hard-deleted".
 */

const SQL = readFileSync(
  path.join(process.cwd(), "supabase/migrations/00017_community_forum.sql"),
  "utf8"
);

/** The file with comments stripped, so prose cannot satisfy an assertion. */
const CODE = SQL.replace(/\/\*\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.split("--")[0])
  .join("\n");

const TABLES = [
  "forum_consents",
  "forum_profiles",
  "forum_topics",
  "forum_groups",
  "forum_group_members",
  "forum_posts",
  "forum_reactions",
  "forum_reports",
  "forum_bans",
];

/** The text of one policy, so an assertion cannot accidentally match another. */
function policy(name: string): string {
  const match = CODE.match(
    new RegExp(`create policy ${name} on public\\.\\w+[\\s\\S]*?;`, "")
  );
  if (!match) throw new Error(`no policy named ${name}`);
  return match[0];
}

describe("tables and RLS", () => {
  it("creates every table the brief lists", () => {
    for (const table of TABLES) {
      expect(CODE, table).toContain(`create table if not exists public.${table}`);
    }
  });

  it("enables row level security on all of them", () => {
    for (const table of TABLES) {
      expect(CODE, table).toContain(
        `alter table public.${table} enable row level security`
      );
    }
  });

  it("gives each table at least a read policy, so none is RLS-locked by accident", () => {
    for (const table of TABLES) {
      const policies = CODE.match(
        new RegExp(`create policy \\w+ on public\\.${table}\\b`, "g")
      );
      expect(policies?.length ?? 0, table).toBeGreaterThan(0);
    }
  });
});

describe("the consent gate", () => {
  it("is a SECURITY DEFINER function, so policies can call it without recursion", () => {
    expect(CODE).toContain("create or replace function public.forum_has_consent()");
    const fn = CODE.slice(
      CODE.indexOf("function public.forum_has_consent()"),
      CODE.indexOf("function public.forum_is_moderator()")
    );
    expect(fn).toContain("security definer");
    expect(fn).toContain("stable");
  });

  it("gates reading content, profiles, topics, groups and posts", () => {
    for (const name of [
      "forum_profiles_read",
      "forum_topics_read",
      "forum_groups_member_read",
      "forum_group_members_read",
      "forum_posts_read",
    ]) {
      expect(policy(name), name).toContain("forum_has_consent()");
    }
  });

  it("gates posting as well as reading", () => {
    expect(policy("forum_posts_insert")).toContain("forum_has_consent()");
  });

  it("lets a user read only their own consent row", () => {
    // A user with no row has nothing to read, which is what makes "no
    // consent, no forum" true of this table without a special case.
    expect(policy("forum_consents_own_read")).toContain("user_id = auth.uid()");
  });

  it("has no UPDATE policy on consent — it is a historical fact", () => {
    expect(CODE).not.toMatch(
      /create policy \w+ on public\.forum_consents\s+for update/
    );
  });
});

describe("group posts are visible only to group members", () => {
  it("reads a group post through forum_in_group and nothing else", () => {
    const read = policy("forum_posts_read");
    expect(read).toMatch(/group_id is not null and public\.forum_in_group\(group_id\)/);
  });

  it("does not let an organization membership substitute for group membership", () => {
    // A clinician in the same hospital is not thereby in the group.
    const read = policy("forum_posts_read");
    const groupBranch = read.slice(read.indexOf("or (group_id is not null"));
    expect(groupBranch).not.toContain("has_active_membership");
  });

  it("makes the group itself visible only to its members", () => {
    expect(policy("forum_groups_member_read")).toContain("forum_in_group(id)");
  });
});

describe("a clinician may add only their own assigned patients", () => {
  it("puts the rule in the INSERT policy, not the UI", () => {
    const insert = policy("forum_group_members_owner_insert");
    expect(insert).toContain("forum_can_add_to_group(group_id, user_id)");
    expect(insert).toContain("added_by = auth.uid()");
  });

  it("requires an active care_team_assignments row for the owning membership", () => {
    const fn = CODE.slice(
      CODE.indexOf("function public.forum_can_add_to_group"),
      CODE.indexOf("drop policy if exists forum_groups_member_read")
    );
    expect(fn).toContain("public.care_team_assignments");
    expect(fn).toContain("a.clinician_membership_id = oc.owner_membership_id");
    // The same validity conditions has_active_care_assignment uses, so the
    // two cannot drift apart.
    expect(fn).toContain("a.status = 'active'");
    expect(fn).toContain("a.starts_at <= now()");
    expect(fn).toContain("(a.ends_at is null or a.ends_at > now())");
    expect(fn).toContain("a.ended_at is null");
    expect(fn).toContain("op.enrollment_status = 'active'");
    expect(fn).toContain("m.status = 'active'");
  });

  it("requires the caller to own the group before any add is considered", () => {
    const fn = CODE.slice(
      CODE.indexOf("function public.forum_can_add_to_group"),
      CODE.indexOf("drop policy if exists forum_groups_member_read")
    );
    expect(fn).toContain("m.user_id = auth.uid()");
    expect(fn).toContain("m.role in ('doctor', 'admin')");
    expect(fn).toContain("select exists (select 1 from owner_check) and (");
  });

  it("allows exactly two cases and no others", () => {
    const fn = CODE.slice(
      CODE.indexOf("function public.forum_can_add_to_group"),
      CODE.indexOf("drop policy if exists forum_groups_member_read")
    );
    // Self-add (bootstrapping the group) and assigned-patient. Nothing else.
    expect(fn).toContain("p_user_id = auth.uid()");
    expect(fn).toContain("pt.linked_user_id = p_user_id");
  });

  it("separates removal from adding, so an ended assignment is still removable", () => {
    // Phrasing removal as "can you add them?" would strand a member in the
    // group at exactly the moment their assignment ends.
    expect(CODE).toContain("create or replace function public.forum_owns_group");
    const update = policy("forum_group_members_owner_update");
    expect(update).toContain("forum_owns_group(group_id)");
    expect(update).not.toContain("forum_can_add_to_group");
  });

  it("lets a member remove themselves", () => {
    expect(policy("forum_group_members_owner_update")).toContain(
      "user_id = auth.uid()"
    );
  });
});

describe("nothing is ever hard-deleted", () => {
  it("has no DELETE policy on any content table", () => {
    for (const table of TABLES.filter((t) => t !== "forum_reactions")) {
      expect(
        CODE,
        `${table} must not allow DELETE`
      ).not.toMatch(new RegExp(`create policy \\w+ on public\\.${table}\\s+for delete`));
    }
  });

  it("revokes DELETE and TRUNCATE from authenticated as a second layer", () => {
    expect(CODE).toContain("revoke delete on table public.%I from authenticated");
    expect(CODE).toContain("revoke truncate on table public.%I from authenticated");
  });

  it("grants DELETE back only for reactions, visibly", () => {
    expect(CODE).toContain("grant delete on table public.forum_reactions to authenticated");
  });

  it("refuses to restore a deleted post", () => {
    expect(CODE).toContain("a deleted post cannot be restored");
  });

  it("freezes a deleted post's body", () => {
    expect(CODE).toContain("a deleted post cannot be edited");
  });
});

describe("moderation cannot rewrite content", () => {
  it("gives moderators no UPDATE policy on posts", () => {
    // RLS cannot restrict WHICH columns an update touches, so a blanket
    // moderator UPDATE would also permit rewriting the body.
    const update = policy("forum_posts_author_update");
    expect(update).toContain("author_user_id = auth.uid()");
    expect(update).not.toContain("forum_is_moderator");
  });

  it("routes moderator deletion through a function that demands a reason", () => {
    expect(CODE).toContain(
      "create or replace function public.forum_moderator_delete_post"
    );
    const fn = CODE.slice(CODE.indexOf("function public.forum_moderator_delete_post"));
    expect(fn).toContain("security definer");
    expect(fn).toContain("not public.forum_is_moderator()");
    expect(fn).toContain("a reason is required");
    // It may only ever set the deletion columns.
    const update = fn.slice(fn.indexOf("update public.forum_posts"));
    expect(update).toContain("deleted_at = now()");
    expect(update).not.toMatch(/set[\s\S]{0,200}\bbody\s*=/);
  });

  it("stops a deletion being attributed to someone who did not make it", () => {
    expect(CODE).toContain("a deletion must be attributed to the person making it");
    expect(CODE).toContain("soleiq.forum_moderating");
  });

  it("pins a post's author and home against tampering with a trigger", () => {
    const guard = CODE.slice(
      CODE.indexOf("function public.forum_posts_guard"),
      CODE.indexOf("drop trigger if exists forum_posts_guard_trg")
    );
    expect(guard).toContain("new.author_user_id <> old.author_user_id");
    expect(guard).toContain("new.created_at <> old.created_at");
    expect(guard).toContain("a post cannot be reassigned or moved");
    expect(CODE).toContain("create trigger forum_posts_guard_trg");
    expect(CODE).toContain("before update on public.forum_posts");
  });
});

describe("banned users cannot post", () => {
  it("checks the ban inside the INSERT policy, not the UI", () => {
    const insert = policy("forum_posts_insert");
    expect(insert).toContain("not public.forum_is_banned('daily')");
    expect(insert).toContain("not public.forum_is_banned('groups')");
  });

  it("treats a global ban as covering every scope", () => {
    const fn = CODE.slice(
      CODE.indexOf("function public.forum_is_banned"),
      CODE.indexOf("drop policy if exists forum_bans_read")
    );
    expect(fn).toContain("b.scope in ('global', p_scope)");
    expect(fn).toContain("(b.until is null or b.until > now())");
  });

  it("lets a banned user read the ban that applies to them", () => {
    expect(policy("forum_bans_read")).toContain("user_id = auth.uid()");
  });
});

describe("pseudonymity", () => {
  it("stores no legal name, email or phone on the forum profile", () => {
    const table = CODE.slice(
      CODE.indexOf("create table if not exists public.forum_profiles"),
      CODE.indexOf("create unique index if not exists forum_profiles_display_name_idx")
    );
    expect(table).not.toMatch(/\bfull_name\b/);
    expect(table).not.toMatch(/\bemail\b/);
    expect(table).not.toMatch(/\bphone\b/);
    expect(table).not.toMatch(/\bpatient_id\b/);
  });

  it("refuses an email-shaped display name at the database level", () => {
    expect(CODE).toContain("forum_profiles_display_name_not_email");
    expect(CODE).toContain("display_name !~* '[^[:space:]]@[^[:space:]]'");
  });

  it("seeds a generated avatar rather than accepting an upload", () => {
    expect(CODE).toContain("avatar_seed text not null default");
    expect(CODE).not.toMatch(/avatar_url|image_url|photo/i);
  });
});

describe("the forum stays separate from the clinical record", () => {
  it("has no forum table referencing a clinical table", () => {
    // forum_groups references organization_memberships (staff, not patients)
    // and organizations; no forum TABLE may reference patients or reports.
    const tableBlocks = CODE.split("create table if not exists public.")
      .slice(1)
      .map((block) => block.slice(0, block.indexOf(");")));
    for (const block of tableBlocks) {
      expect(block).not.toMatch(/references public\.patients\b/);
      expect(block).not.toMatch(/references public\.organization_patients\b/);
      expect(block).not.toMatch(/references public\.reports\b/);
      expect(block).not.toMatch(/references public\.screening/);
    }
  });

  it("touches the clinical schema in exactly one place, and only for a boolean", () => {
    // forum_can_add_to_group is the single bridge. It answers "is this user a
    // patient assigned to me?" and never returns which record matched.
    const bridges = (CODE.match(/public\.patients\b/g) ?? []).length;
    expect(bridges).toBe(1);
    const fn = CODE.slice(
      CODE.indexOf("function public.forum_can_add_to_group"),
      CODE.indexOf("drop policy if exists forum_groups_member_read")
    );
    expect(fn).toContain("public.patients");
    expect(fn).toContain("returns boolean");
  });

  it("creates no view joining a forum identity to a patient", () => {
    expect(CODE).not.toMatch(/create (or replace )?view/i);
  });
});

describe("daily topic integrity", () => {
  it("allows only one daily topic per day, in the database", () => {
    // What makes the Phase 2 cron idempotent: a second promotion for the same
    // date is refused rather than producing two topics of the day.
    expect(CODE).toContain("forum_topics_one_daily_per_day");
    expect(CODE).toMatch(
      /on public\.forum_topics \(scheduled_for\)\s*where is_daily/
    );
  });

  it("requires a date on anything marked daily", () => {
    expect(CODE).toContain("forum_topics_daily_needs_date");
  });

  it("lets only moderators create topics", () => {
    expect(policy("forum_topics_moderator_insert")).toContain(
      "forum_is_moderator()"
    );
  });
});

describe("post integrity", () => {
  it("requires a post to live in exactly one place", () => {
    expect(CODE).toContain("forum_posts_one_home");
    expect(CODE).toContain("check ((topic_id is null) <> (group_id is null))");
  });

  it("requires a deletion to be a complete record of itself", () => {
    expect(CODE).toContain("forum_posts_deletion_complete");
  });

  it("will not accept a post that arrives already deleted", () => {
    expect(policy("forum_posts_insert")).toContain("deleted_at is null");
  });

  it("forces the author to be the caller", () => {
    expect(policy("forum_posts_insert")).toContain("author_user_id = auth.uid()");
  });
});

describe("privileges", () => {
  it("revokes execute from anon, not just public", () => {
    // Supabase default privileges grant execute to anon on new functions, so
    // revoking from `public` alone leaves them callable unauthenticated.
    expect(CODE).toContain("revoke all on function %s from anon");
    expect(CODE).toContain("grant execute on function %s to authenticated");
  });

  it("keeps the trigger function uncallable by any client", () => {
    expect(CODE).toContain(
      "revoke all on function public.forum_posts_guard() from authenticated"
    );
    expect(CODE).toContain(
      "revoke all on function public.forum_posts_guard() from anon"
    );
  });

  it("every helper is SECURITY DEFINER with a pinned search_path", () => {
    for (const fn of [
      "forum_has_consent",
      "forum_is_moderator",
      "forum_is_banned",
      "forum_in_group",
      "forum_owns_group",
      "forum_can_add_to_group",
      "forum_can_see_post",
      "forum_moderator_delete_post",
    ]) {
      const start = CODE.indexOf(`function public.${fn}`);
      expect(start, fn).toBeGreaterThan(-1);
      const body = CODE.slice(start, start + 700);
      expect(body, `${fn} security definer`).toContain("security definer");
      expect(body, `${fn} search_path`).toContain("set search_path");
    }
  });
});
