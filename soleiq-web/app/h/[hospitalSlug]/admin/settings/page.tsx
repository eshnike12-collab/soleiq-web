import { HospitalShell } from "@/components/hospital/HospitalShell";
import { HospitalSettingsForms } from "@/components/hospital/SettingsForms";
import { PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function HospitalSettingsPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  const { hospitalSlug } = await params;
  const data = await pageAccess(() => getAdminOverview(hospitalSlug));
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="admin">
      <PageHeader
        eyebrow="Configuration"
        title="Hospital & facilities"
        description="The hospital UUID is the tenant boundary. The slug is a readable route label and is never used as a clinical business key."
      />
      <HospitalSettingsForms hospital={data.hospital} />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Facilities</h3>
        <div className="mt-3 divide-y divide-slate-100">
          {data.facilities.map((facility: any) => (
            <div key={facility.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{facility.name}</p>
                <p className="text-xs capitalize text-slate-500">{facility.facility_type} · {facility.timezone}</p>
              </div>
              <span className="text-xs capitalize text-slate-500">{facility.status}</span>
            </div>
          ))}
        </div>
      </section>
    </HospitalShell>
  );
}
