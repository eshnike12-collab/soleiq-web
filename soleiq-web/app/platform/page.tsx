import { OrganizationOnboardingForm } from "@/components/hospital/SettingsForms";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  listPlatformFeedback,
  listPlatformOrganizations,
} from "@/server/platform";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const organizations = await pageAccess(listPlatformOrganizations);
  const feedback = await listPlatformFeedback().catch(() => []);
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">SoleIQ platform</p>
            <h1 className="text-lg font-semibold">Organization provisioning</h1>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <OrganizationOnboardingForm />
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-5 py-3">Hospital</th><th className="px-5 py-3">Slug</th><th className="px-5 py-3">Timezone</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody>
              {organizations.map((organization: any) => (
                <tr key={organization.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">{organization.display_name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{organization.slug}</td>
                  <td className="px-5 py-3">{organization.timezone}</td>
                  <td className="px-5 py-3 capitalize">{organization.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">Care-team feedback ({feedback.length})</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Sent by patients and doctors from their dashboards; also emailed
            when RESEND_API_KEY is configured.
          </p>
          <div className="mt-3 divide-y divide-slate-100">
            {feedback.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No feedback yet.</p>
            ) : (
              feedback.map((item: any) => (
                <div key={item.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold capitalize text-brand">
                      {item.category}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold capitalize text-slate-700">
                      {item.role}
                    </span>
                    <span className="text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                      {item.contact_email ? ` · ${item.contact_email}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

