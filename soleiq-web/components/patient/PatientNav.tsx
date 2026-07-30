import Link from "next/link";
import { Camera, Home, LayoutGrid } from "lucide-react";

/**
 * Patient portal bottom navigation. Server-safe on purpose (no hooks, no
 * "use client") so both server pages (/home) and client pages (/features)
 * can render it; the active tab comes from the prop, not the pathname.
 *
 * Pages that render it should add bottom padding (pb-24) or use
 * <PatientNavSpacer /> so content isn't hidden behind the fixed bar.
 */
export function PatientNav({ active }: { active?: "home" | "features" }) {
  const itemClass = (isActive: boolean) =>
    `flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-semibold ${
      isActive ? "text-brand" : "text-slate-500"
    }`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-5 py-2">
        <Link href="/home" className={itemClass(active === "home")} aria-current={active === "home" ? "page" : undefined}>
          <Home className="h-5 w-5" />
          Home
        </Link>
        <Link href="/" className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-blue-900/20">
            <Camera className="h-5 w-5" />
          </span>
          New check
        </Link>
        <Link href="/features" className={itemClass(active === "features")} aria-current={active === "features" ? "page" : undefined}>
          <LayoutGrid className="h-5 w-5" />
          Features
        </Link>
      </div>
    </nav>
  );
}

/** Spacer matching the nav's height, for pages that prefer it over pb-24. */
export function PatientNavSpacer() {
  return <div className="h-20" aria-hidden="true" />;
}
