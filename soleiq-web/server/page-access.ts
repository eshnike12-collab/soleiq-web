import "server-only";

import { notFound, redirect } from "next/navigation";
import { DomainError } from "./errors";

export async function pageAccess<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DomainError) {
      if (error.code === "UNAUTHENTICATED") redirect("/login");
      if (error.code === "FORBIDDEN" || error.code === "NOT_FOUND") notFound();
    }
    throw error;
  }
}

