import { redirect } from "next/navigation";

/** Released canonical reports now use exact opaque report IDs under /records. */
export default function LegacyResultsRoute() {
  redirect("/home");
}
