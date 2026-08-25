import { Box } from "lucide-react";
import { AppTopBar } from "@/components/chrome/AppTopBar";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AuthConfigurationError } from "@/components/auth/AuthConfigurationError";
import { getPatientDashboard } from "@/server/patients";
import { pageAccess } from "@/server/page-access";
import { PatientNav } from "@/components/patient/PatientNav";
import { Scan3DPanel } from "@/components/scan3d/Scan3DPanel";

export const dynamic = "force-dynamic";

/**
 * 3D scan, as a tab of the patient portal.
 *
 * Previously this lived in the Expo app on :8081 and had no idea who was
 * signed in. Here it runs inside the authenticated portal, so a scan is tied
 * to the patient's own record and their frames pool per foot across visits.
 */
export default async function Scan3DPage() {
  const data = await pageAccess(getPatientDashboard);
  if (data.configurationError) {
    return <AuthConfigurationError message={data.configurationError} />;
  }

  const patientId = (data.patient as { id?: string } | null)?.id ?? null;

  return (
    <div className="min-h-screen">
      <AppTopBar
        title={<h1 className="truncate text-lg font-bold text-ink">3D scan</h1>}
        actions={
          <>
            <FeedbackButton prefillEmail={data.profile?.email ?? null} />
            <SignOutButton />
          </>
        }
      />
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8 pb-24">
        <section className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Box className="h-4 w-4 text-primary" /> Scan your foot in 3D
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            One slow lap around the foot builds a 3D model your care team can
            measure and compare between visits. Usable frames are saved as you
            go, so a scan that falls short adds to what you already have rather
            than starting over.
          </p>
        </section>

        {patientId ? (
          <Scan3DPanel patientId={patientId} />
        ) : (
          // Without a patient record there is nowhere to file the scan and no
          // stable identity to pool frames against, so this refuses rather
          // than writing captures to an id that will not be there next visit.
          <section className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
            <p className="font-bold text-ink">No patient record linked</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Your sign-in isn&apos;t linked to a patient record yet, so a scan
              couldn&apos;t be saved to your history. Finish a check first, or
              ask your care team to link your account.
            </p>
          </section>
        )}
      </main>
      <PatientNav active="scan" />
    </div>
  );
}
