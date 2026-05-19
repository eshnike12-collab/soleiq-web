"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export function AboutYou() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [resolving, setResolving] = useState(false);

  const useMyLocation = () => {
    setResolving(true);
    setTimeout(() => {
      setCity("Cary");
      setState("NC");
      setResolving(false);
    }, 600);
  };

  const ready = first.trim() && last.trim() && city.trim() && state;
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Patient intake"
        title="Patient name"
        subtitle="And the patient's home location for referral recommendations."
      />
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="field-label">First name</label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Alex" />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Garcia" />
          </div>
        </div>
        <div>
          <label className="field-label">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cary" />
        </div>
        <div>
          <label className="field-label">State</label>
          <Select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Select…</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <button
          onClick={useMyLocation}
          disabled={resolving}
          className="inline-flex items-center text-sm font-medium text-brand"
        >
          <MapPin className="mr-1.5 h-4 w-4" />
          {resolving ? "Locating…" : "Use my location"}
        </button>
      </div>
      <div className="mt-auto pt-4">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            update({
              fullName: `${first.trim()} ${last.trim()}`,
              city: city.trim(),
              state,
            });
            goNext();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
