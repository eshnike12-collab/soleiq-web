import {
  Activity,
  BadgeCheck,
  BookOpen,
  Box,
  CalendarDays,
  GitCompare,
  History,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The patient's feature list, in one place.
 *
 * It was stated twice — once as tiles on /features, once implicitly by the
 * bottom bar — and the two had already drifted (3D Scan and Privacy existed in
 * one and not the other). The hub grid and the sidebar's dropdown now read
 * from this, so a feature added here appears in both.
 *
 * Every href is a route that already exists. Nothing here grants access to
 * anything; each page enforces its own.
 */
export interface PatientFeature {
  name: string;
  href: string;
  icon: LucideIcon;
  caption: string;
}

export const PATIENT_FEATURES: PatientFeature[] = [
  { name: "Summary", href: "/features/summary", icon: Activity, caption: "Your risk status at a glance" },
  { name: "History", href: "/features/history", icon: History, caption: "Every past check" },
  { name: "Comparison", href: "/compare", icon: GitCompare, caption: "Two checks side by side" },
  { name: "3D Scan", href: "/scan-3d", icon: Box, caption: "Capture a 3D foot scan" },
  { name: "Care Team", href: "/features/care-team", icon: Users, caption: "Who can see your results" },
  { name: "Privacy & Access", href: "/access", icon: ShieldCheck, caption: "Who can see your records" },
  { name: "Visits", href: "/features/visits", icon: CalendarDays, caption: "Clinical visits and notes" },
  { name: "Product Recommendations", href: "/features/recommendations", icon: ShoppingBag, caption: "What was suggested and why" },
  { name: "Research", href: "/features/research", icon: BookOpen, caption: "Read about your condition" },
  { name: "Membership", href: "/features/membership", icon: BadgeCheck, caption: "Your plan and limits" },
  { name: "Feedback", href: "/features/feedback", icon: MessageSquare, caption: "Tell us what to improve" },
];
