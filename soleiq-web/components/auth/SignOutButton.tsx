"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-warmGray-600 hover:text-warmGray-800"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}
