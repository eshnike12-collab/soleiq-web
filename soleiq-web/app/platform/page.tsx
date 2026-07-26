import { OrganizationOnboardingForm } from "@/components/hospital/SettingsForms";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { listPlatformOrganizations } from "@/server/platform";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const organizations = await pageAccess(listPlatformOrganizations);
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
      </main>
    </div>
  );
}

