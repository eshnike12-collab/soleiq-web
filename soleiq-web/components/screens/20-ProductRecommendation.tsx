"use client";

import { useSoleiqStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Info, ShoppingBag } from "lucide-react";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { suggestProducts } from "@/lib/productCatalog";

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
    className: "bg-success-soft text-teal-800",
  },
  emerging: {
    label: "Emerging evidence",
    className: "bg-warn-soft text-amber-800",
  },
  investigational: {
    label: "Investigational — limited evidence",
    className: "bg-slate-100 text-ink-soft",
  },
};

export function ProductRecommendation() {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const profile = useSoleiqStore((s) => s.profile);
  const goTo = useSoleiqStore((s) => s.goTo);
  const risk = visit?.result?.riskLevel ?? "low";
  const suggestions = suggestProducts(visit?.result?.screening, profile);

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
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-warn/25 bg-warn-soft p-3.5 text-sm leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <div>
            <p className="font-bold text-warn">PAD caution</p>
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

      {/* OTC products matched to this patient's actual findings */}
      {suggestions.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            <ShoppingBag className="h-3.5 w-3.5" /> Products that may help, based on your check
          </p>
          <div className="space-y-3">
            {suggestions.map(({ product, reason }) => (
              <Card key={product.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-bold text-ink">{product.name}</p>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                    {product.helpsWith}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{reason}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-faint">{product.howItHelps}</p>
                {product.caution && (
                  <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-sm leading-relaxed text-amber-800">
                    {product.caution}
                  </p>
                )}
                <a
                  href={product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex min-h-[44px] items-center text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4"
                >
                  View product <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Card>
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
            These are general over-the-counter suggestions, not medical advice
            and not endorsements. With diabetes, always check with your
            clinician before starting a new foot product — and never use
            acid-based callus removers or blades on your own feet.
          </p>
        </div>
      )}

      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        SoleIQ therapy devices
      </p>
      <div className="space-y-3">
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
                  ? "border-primary/30 ring-2 ring-primary-soft"
                  : ""
              }
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-lg font-bold text-teal-800">
                  {p.name.split(" ")[1][0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[15px] font-bold text-ink">
                      {p.name}
                    </p>
                    {blockedByPad ? (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        not advised · PAD
                      </span>
                    ) : recommended ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        recommended
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-ink-faint">
                        informational
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{p.blurb}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    <span className="font-medium">Mechanism:</span>{" "}
                    {p.mechanism}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    <Info className="h-3 w-3" /> {badge.label}
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 mt-1 inline-flex min-h-[44px] items-center text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4"
                  >
                    Learn more <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
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
