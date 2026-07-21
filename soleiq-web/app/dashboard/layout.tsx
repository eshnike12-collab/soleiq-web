import { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allow={["admin", "doctor"]}>{children}</RoleGuard>;
}
