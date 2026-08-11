import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Cursor } from "@/components/ui/Cursor";

// Humanist sans: friendly for patients, crisp enough for clinicians.
const nunitoSans = Nunito_Sans({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SoleIQ",
  description: "AI-powered diabetic foot monitoring — unified platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body className="font-sans">
        {/* Pointer treatment shared with soleiqhealth.com. Renders nothing on
            touch devices or under reduced motion, where the native cursor is
            left exactly as it was. */}
        <Cursor />
        {children}
      </body>
    </html>
  );
}
