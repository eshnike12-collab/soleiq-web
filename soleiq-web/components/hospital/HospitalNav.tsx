"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  ClipboardList,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

/**
 * The portal's section navigation.
 *
 * A client component for one reason: the active section. The shell around it
 * is a server component and has no pathname, so every link rendered
 * identically and there was no way to tell which page you were on — in a
 * portal where Staff, Patients, Assignments and Audit look structurally
 * alike, that is the difference between orienting instantly and reading
 * headings to work it out.
 *
 * THE LINK LIST LIVES HERE, NOT IN THE SHELL, and that is a constraint rather
 * than a preference. Icons are functions, and a server component cannot pass
 * a function across the boundary to a client component — React refuses to
 * serialize it and the page 500s. So the shell passes the two plain values it
 * owns (slug and role) and the icons are resolved on this side.
 *
 * This is navigation presentation, not authorization. What an admin or a
 * doctor may actually reach is enforced per route by `resolveHospital`, which
 * is unchanged and unaffected by anything here.
 */

export function HospitalNav({
  slug,
  role,
}: {
  slug: string;
  role: "admin" | "doctor";
}) {
  const pathname = usePathname();
  const base = `/h/${slug}/${role}`;

  const links =
    role === "admin"
      ? [
          { href: base, label: "Overview", icon: Activity },
          { href: `${base}/staff`, label: "Staff", icon: Users },
          { href: `${base}/patients`, label: "Patients", icon: ClipboardList },
          { href: `${base}/assignments`, label: "Assignments", icon: Building2 },
          { href: `${base}/audit`, label: "Audit", icon: ShieldCheck },
          { href: `${base}/settings`, label: "Settings", icon: Settings },
        ]
      : [{ href: base, label: "Worklist", icon: ClipboardList }];

  /* Exact match, except a section root also owns its sub-pages. Longest match
     wins so `/admin/staff` does not light `/admin` as well. */
  const activeHref = links
    .filter(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Portal sections"
      /* A scrolling row on small screens, a sticky rail from lg so it stays
         put while a long worklist scrolls. */
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible lg:px-0"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
              isActive
                ? "bg-primary-soft text-primary"
                : "text-ink-soft hover:bg-slate-100 hover:text-ink"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
