"use client";

import { useState } from "react";
import QRCode from "qrcode";

export function AccessManager({ initial }: { initial: any }) {
  const [data, setData] = useState(initial);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const response = await fetch("/api/patient/access", { cache: "no-store" });
    const payload = await response.json();
    if (payload.ok) setData(payload.data);
  };

  const createShare = async (organizationPatientId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/patient/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationPatientId,
          scope: "longitudinal_record",
          selectedReportIds: [],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload?.error?.message);
      const url = `${window.location.origin}/share/${payload.data.share_token}`;
      setShareUrl(url);
      setQrUrl(await QRCode.toDataURL(url, { width: 240, margin: 2 }));
      setMessage("This single-use code expires in 15 minutes. Access granted from it lasts 30 days.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Share code failed.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (consentId: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/patient/access", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consentId,
          reason: "Revoked by patient from access management",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload?.error?.message);
      await refresh();
      setMessage("Consent access revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revocation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Hospital enrollments</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {data.enrollments.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">No linked hospital records.</p>
          ) : data.enrollments.map((row: any) => {
            const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
            const facility = Array.isArray(row.facilities) ? row.facilities[0] : row.facilities;
            return (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{organization?.display_name || "Hospital"}</p>
                  <p className="text-xs text-slate-500">
                    {facility?.name || "No facility"} · {row.enrollment_status}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void createShare(row.id)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-brand disabled:opacity-50"
                >
                  Create doctor QR
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {shareUrl && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-semibold text-slate-950">Single-use doctor acceptance</h2>
          <p className="mt-1 text-sm text-slate-600">
            Show this QR to the doctor you intend to authorize. They must sign in
            with an active membership at this hospital.
          </p>
          {qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="Single-use doctor sharing QR code" className="mt-4 h-60 w-60 rounded-xl bg-white p-2" />
          )}
          <p className="mt-3 break-all font-mono text-xs text-slate-600">{shareUrl}</p>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Who can see my records?</h2>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Care-team assignments</h3>
        <div className="mt-2 divide-y divide-slate-100">
          {data.assignments.length === 0 ? (
            <p className="py-3 text-sm text-slate-500">No active assignments shown.</p>
          ) : data.assignments.map((row: any) => {
            const membership = Array.isArray(row.organization_memberships) ? row.organization_memberships[0] : row.organization_memberships;
            const profile = Array.isArray(membership?.profiles) ? membership.profiles[0] : membership?.profiles;
            return (
              <div key={row.id} className="py-3">
                <p className="font-medium">{profile?.full_name || "Hospital clinician"}</p>
                <p className="text-xs text-slate-500">
                  {row.relationship} · {new Date(row.starts_at).toLocaleDateString()} – {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "ongoing"}
                </p>
              </div>
            );
          })}
        </div>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Patient-directed consent</h3>
        <div className="mt-2 divide-y divide-slate-100">
          {data.consents.length === 0 ? (
            <p className="py-3 text-sm text-slate-500">No consent grants.</p>
          ) : data.consents.map((row: any) => {
            const membership = Array.isArray(row.organization_memberships) ? row.organization_memberships[0] : row.organization_memberships;
            const profile = Array.isArray(membership?.profiles) ? membership.profiles[0] : membership?.profiles;
            const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
            return (
              <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{profile?.full_name || "Hospital clinician"}</p>
                  <p className="text-xs text-slate-500">
                    {organization?.display_name} · {row.scope.replaceAll("_", " ")} · {row.valid_until ? `expires ${new Date(row.valid_until).toLocaleDateString()}` : "no expiry"}
                  </p>
                </div>
                {row.revoked_at ? (
                  <span className="text-xs text-slate-400">Revoked</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revoke(row.id)}
                    className="text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}

