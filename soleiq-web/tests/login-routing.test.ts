import { describe, expect, it } from "vitest";
import {
  homeForMemberships,
  type HospitalMembership,
} from "@/lib/auth";

function membership(
  role: HospitalMembership["role"],
  status: HospitalMembership["status"] = "active",
  slug = "mercy-general"
): HospitalMembership {
  return {
    id: `${role}-membership`,
    organization_id: "11111111-1111-4111-8111-111111111111",
    role,
    status,
    permissions: {},
    organizations: {
      slug,
      display_name: "Mercy General",
      branding: {},
    },
  };
}

describe("post-login routing", () => {
  it("routes an active hospital administrator to the scoped admin console", () => {
    expect(homeForMemberships([membership("admin")])).toBe(
      "/h/mercy-general/admin"
    );
  });

  it("routes an active doctor to the scoped clinical worklist", () => {
    expect(homeForMemberships([membership("doctor")])).toBe(
      "/h/mercy-general/doctor"
    );
  });

  it("routes patients and users without memberships to patient home", () => {
    expect(homeForMemberships([membership("patient")])).toBe("/home");
    expect(homeForMemberships([])).toBe("/home");
  });

  it("does not grant a destination from an inactive invitation", () => {
    expect(homeForMemberships([membership("doctor", "invited")])).toBe(
      "/home"
    );
  });
});
