import { describe, expect, it } from "vitest";
import {
  canReadClinicalResource,
  type AuthorizationPrincipal,
  type ClinicalResource,
} from "@/server/authz/matrix";

const resource: ClinicalResource = {
  organizationId: "hospital-a",
  patientUserId: "patient-a",
  released: true,
  activeAssignedDoctorUserIds: ["doctor-assigned"],
  validConsentDoctorUserIds: ["doctor-consented"],
};

const mayRead = (principal: AuthorizationPrincipal, patch = {}) =>
  canReadClinicalResource(principal, { ...resource, ...patch });

describe("clinical authorization matrix", () => {
  it("separates Patient A from Patient B and hides preliminary reports", () => {
    expect(mayRead({ role: "patient", userId: "patient-a" })).toBe(true);
    expect(mayRead({ role: "patient", userId: "patient-b" })).toBe(false);
    expect(
      mayRead({ role: "patient", userId: "patient-a" }, { released: false })
    ).toBe(false);
  });

  it("allows only assigned or consented active same-hospital doctors", () => {
    const base = {
      role: "doctor" as const,
      organizationId: "hospital-a",
      membershipStatus: "active" as const,
    };
    expect(mayRead({ ...base, userId: "doctor-assigned" })).toBe(true);
    expect(mayRead({ ...base, userId: "doctor-consented" })).toBe(true);
    expect(mayRead({ ...base, userId: "doctor-unassigned" })).toBe(false);
    expect(
      mayRead({
        ...base,
        userId: "doctor-assigned",
        organizationId: "hospital-b",
      })
    ).toBe(false);
    expect(
      mayRead({
        ...base,
        userId: "doctor-assigned",
        membershipStatus: "suspended",
      })
    ).toBe(false);
  });

  it("removes access when assignment expires or consent is revoked", () => {
    const doctor = {
      role: "doctor" as const,
      userId: "doctor-assigned",
      organizationId: "hospital-a",
      membershipStatus: "active" as const,
    };
    expect(mayRead(doctor)).toBe(true);
    expect(
      mayRead(doctor, {
        activeAssignedDoctorUserIds: [],
        validConsentDoctorUserIds: [],
      })
    ).toBe(false);
  });

  it("requires explicit PHI permission and never grants platform implicit PHI", () => {
    const admin = {
      role: "admin" as const,
      userId: "admin",
      organizationId: "hospital-a",
      membershipStatus: "active" as const,
    };
    expect(mayRead({ ...admin, phiAccess: false })).toBe(false);
    expect(mayRead({ ...admin, phiAccess: true })).toBe(true);
    expect(mayRead({ role: "platform_admin", userId: "platform" })).toBe(false);
  });
});

