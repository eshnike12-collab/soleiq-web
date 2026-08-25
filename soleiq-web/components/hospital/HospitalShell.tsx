import Link from "next/link";
import { Activity, Building2, ClipboardList, Settings, ShieldCheck, Users } from "lucide-react";
import { AppTopBar } from "@/components/chrome/AppTopBar";
import { T } from "@/components/chrome/T";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function HospitalShell({
  slug,
  hospitalName,
  role,
  children,
}: {
  slug: string;
  hospitalName: string;
  role: "admin" | "doctor";
  children: React.ReactNode;
}) {
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
  return (
    <div className="min-h-screen text-slate-900">
      <AppTopBar
        title={
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              <T k="nav.clinical" />
            </p>
            <h1 className="truncate text-lg font-semibold">{hospitalName}</h1>
          </div>
        }
        actions={
          <>
            <FeedbackButton compact />
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-brand">
              {role}
            </span>
            <SignOutButton />
          </>
        }
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Hospital">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-brand"
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
