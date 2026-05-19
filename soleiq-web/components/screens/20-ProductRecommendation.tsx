"use client";

import { useSoleiqStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

type EvidenceLevel = "established" | "emerging" | "investigational";

interface Product {
  key: "patch" | "socks" | "pad";
  name: string;
  blurb: string;
  mechanism: string;
  evidence: EvidenceLevel;
  padCaution: boolean;
  url: string;
}

const PRODUCTS: Product[] = [
  {
    key: "patch",
    name: "Rediant Patch",
    blurb: "Adhesive red-light therapy patch for targeted regions.",
    mechanism: "Red light therapy (RLT) — adjunctive use only",
    evidence: "investigational",
    padCaution: true,
    url: "https://example.com/rediant-patch",
  },
  {
    key: "socks",
    name: "Rediant Socks",
    blurb: "Pressure-redistributing daily wear.",
    mechanism: "Pressure offloading + moisture wicking",
    evidence: "established",
    padCaution: false,
    url: "https://example.com/rediant-socks",
  },
  {
    key: "pad",
    name: "Rediant Pad",
    blurb: "In-shoe orthotic insert for active wound offloading.",
    mechanism: "Total-contact offloading",
    evidence: "established",
    padCaution: false,
    url: "https://example.com/rediant-pad",
  },
];

const EVIDENCE_BADGE: Record<
  EvidenceLevel,
  { label: string; className: string }
> = {
  established: {
    label: "Established evidence",
    className: "bg-teal-50 text-teal-800",
  },
  emerging: {
    label: "Emerging evidence",
    className: "bg-amber-50 text-amber-800",
  },
  investigational: {
    label: "Investigational — limited evidence",
    className: "bg-warmGray-100 text-warmGray-800",
  },
};

export function ProductRecommendation() {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const profile = useSoleiqStore((s) => s.profile);
  const goTo = useSoleiqStore((s) => s.goTo);
  const risk = visit?.result?.riskLevel ?? "low";

  const padPresent =
    profile.pad?.status === "diagnosed" || profile.pad?.status === "suspected";
  const padCritical =
    !!profile.pad?.restPain ||
    (profile.pad?.abi != null && profile.pad.abi < 0.9) ||
    (profile.pad?.signs?.length ?? 0) >= 2;

  const allowed = new Set<Product["key"]>(
    risk === "high"
      ? ["patch", "socks", "pad"]
      : risk === "medium"
      ? ["patch", "socks"]
      : []
  );

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <ScreenHeader
        eyebrow="Therapy options"
        title="Adjunctive products"
        subtitle={
          risk === "low"
            ? "At this risk level no offloading or therapy product is indicated. These are informational only."
            : "Highlighted products may complement your treatment plan. Final selection at your clinical discretion."
        }
      />

      {padPresent && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[12px] leading-snug text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">PAD caution</p>
            <p className="mt-0.5">
              Patient has {profile.pad?.status === "diagnosed" ? "diagnosed" : "suspected"} peripheral artery disease
              {padCritical ? " with critical features" : ""}. Red light therapy
              and any device producing heat may{" "}
              <span className="font-semibold">mask ischemic warning signs</span>
              {" "}and is not recommended without vascular workup. Prioritize ABI
              measurement and vascular consultation before adjunctive devices.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {PRODUCTS.map((p) => {
          const recommended = allowed.has(p.key);
          const blockedByPad = padPresent && p.padCaution;
          const badge = EVIDENCE_BADGE[p.evidence];
          return (
            <Card
              key={p.key}
              className={
                blockedByPad
                  ? "opacity-70"
                  : recommended
                  ? "border-brand/40 ring-2 ring-blue-50"
                  : ""
              }
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 font-semibold text-teal-800">
                  {p.name.split(" ")[1][0]}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-warmGray-800">
                      {p.name}
                    </p>
                    {blockedByPad ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        not advised · PAD
                      </span>
                    ) : recommended ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand">
                        recommended
                      </span>
                    ) : (
                      <span className="rounded-full bg-warmGray-50 px-2 py-0.5 text-[10px] uppercase text-warmGray-600">
                        informational
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-warmGray-600">{p.blurb}</p>
                  <p className="mt-1 text-[11px] text-warmGray-600">
                    <span className="font-medium">Mechanism:</span>{" "}
                    {p.mechanism}
                  </p>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    <Info className="h-3 w-3" /> {badge.label}
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 mt-2 inline-flex items-center text-xs font-medium text-brand"
                  >
                    Learn more <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <Button fullWidth variant="outline" onClick={() => goTo(99)}>
          View patient timeline
        </Button>
      </div>
    </div>
  );
}
