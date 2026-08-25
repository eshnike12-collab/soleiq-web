import Link from "next/link";
import { Box, Camera, Home, LayoutGrid } from "lucide-react";

/**
 * Patient portal bottom navigation. Server-safe on purpose (no hooks, no
 * "use client") so both server pages (/home) and client pages (/features)
 * can render it; the active tab comes from the prop, not the pathname.
 *
 * Pages that render it should add bottom padding (pb-24) or use
 * <PatientNavSpacer /> so content isn't hidden behind the fixed bar.
 */
export function PatientNav({
  active,
}: {
  active?: "home" | "features" | "scan";
}) {
  const itemClass = (isActive: boolean) =>
    `flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-semibold transition-colors ${
      isActive ? "text-primary" : "text-ink-faint"
    }`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface-raised pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-5 py-2">
        <Link href="/home" className={itemClass(active === "home")} aria-current={active === "home" ? "page" : undefined}>
          <Home className="h-5 w-5" />
          Home
        </Link>
        <Link href="/" className="group flex flex-col items-center gap-1 text-[11px] font-semibold text-ink-soft">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-button transition-transform duration-150 group-active:scale-95">
            <Camera className="h-5 w-5" />
          </span>
          New check
        </Link>
        <Link href="/scan-3d" className={itemClass(active === "scan")} aria-current={active === "scan" ? "page" : undefined}>
          <Box className="h-5 w-5" />
          3D scan
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
