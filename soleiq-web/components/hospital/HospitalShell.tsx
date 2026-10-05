import { HospitalNav } from "./HospitalNav";
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
  return (
    <div className="min-h-screen text-ink">
      <AppTopBar
        title={
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold uppercase tracking-[0.12em] text-primary">
              <T k="nav.clinical" />
            </p>
            <h1 className="truncate text-lg font-bold text-ink">{hospitalName}</h1>
          </div>
        }
        actions={
          <>
            <FeedbackButton compact />
            <span className="rounded-full bg-primary-soft px-3 py-1 text-[13px] font-semibold capitalize text-primary">
              {role}
            </span>
            <SignOutButton />
          </>
        }
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[232px_1fr] lg:gap-8 lg:px-8">
        <HospitalNav slug={slug} role={role} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
