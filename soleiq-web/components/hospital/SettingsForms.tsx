"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand";

async function mutate(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload?.error?.message);
  return payload.data;
}

export function HospitalSettingsForms({
  hospital,
}: {
  hospital: {
    slug: string;
    legalName: string;
    displayName: string;
    timezone: string;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        className="rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await mutate(`/api/h/${hospital.slug}/admin/settings`, "PATCH", {
              displayName: form.get("displayName"),
              legalName: form.get("legalName"),
              timezone: form.get("timezone"),
            });
            setMessage("Hospital settings updated.");
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Update failed.");
          }
        }}
      >
        <h3 className="font-semibold">Hospital identity</h3>
        <label className="mt-4 block text-xs font-semibold text-slate-500">
          Display name
          <input className={`${field} mt-1`} name="displayName" defaultValue={hospital.displayName} required />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">
          Legal name
          <input className={`${field} mt-1`} name="legalName" defaultValue={hospital.legalName} required />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">
          Timezone
          <input className={`${field} mt-1`} name="timezone" defaultValue={hospital.timezone} required />
        </label>
        <button className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Save settings</button>
      </form>
      <form
        className="rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          // React nulls event.currentTarget after the await; keep the element.
          const formElement = event.currentTarget;
          const form = new FormData(formElement);
          try {
            await mutate(`/api/h/${hospital.slug}/admin/settings`, "POST", {
              name: form.get("name"),
              facilityType: form.get("facilityType"),
              timezone: form.get("timezone"),
              address: {},
            });
            formElement.reset();
            setMessage("Facility created.");
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Facility failed.");
          }
        }}
      >
        <h3 className="font-semibold">Add facility</h3>
        <input className={`${field} mt-4`} name="name" placeholder="Facility name" required />
        <select className={`${field} mt-3`} name="facilityType" defaultValue="clinic">
          <option value="hospital">Hospital</option>
          <option value="clinic">Clinic</option>
          <option value="department">Department</option>
          <option value="location">Location</option>
          <option value="virtual">Virtual</option>
        </select>
        <input className={`${field} mt-3`} name="timezone" defaultValue={hospital.timezone} required />
        <button className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Create facility</button>
      </form>
      {message && <p className="text-sm text-slate-600 lg:col-span-2">{message}</p>}
    </div>
  );
}

export function OrganizationOnboardingForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        // React nulls event.currentTarget after the await; keep the element.
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
          await mutate("/api/platform/organizations", "POST", {
            slug: form.get("slug"),
            legalName: form.get("legalName"),
            displayName: form.get("displayName"),
            timezone: form.get("timezone"),
          });
          formElement.reset();
          setMessage("Hospital created. You are its initial non-PHI administrator.");
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Creation failed.");
        }
      }}
    >
      <h2 className="font-semibold">Onboard hospital system</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <input className={field} name="displayName" placeholder="Display name" required />
        <input className={field} name="legalName" placeholder="Legal name" required />
        <input className={field} name="slug" placeholder="route-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        <input className={field} name="timezone" defaultValue="America/New_York" required />
      </div>
      <button className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Create hospital</button>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </form>
  );
}
