import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Cursor } from "@/components/ui/Cursor";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

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
    // `lang` and `dir` start as English/ltr and are rewritten by the provider
    // once the client knows which language this reader wants. Server-rendered
    // HTML has no way to know that, and guessing would mismatch and warn.
    <html lang="en" dir="ltr" className={nunitoSans.variable}>
      <body className="font-sans">
        {/* Inter Tight, for the brand lockup only, requested exactly as
            soleiqhealth.com requests it — so the wordmark is the same
            letterforms on both properties, and a browser crossing between them
            reuses the file it already has.

            Rendered here rather than through `next/font` because that fetches
            at build time, and rather than inside a `<head>` element because
            the App Router owns that: React hoists these into the head itself. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Inter:wght@400;450;500;600&display=swap"
        />
        {/* Pointer treatment shared with soleiqhealth.com. Renders nothing on
            touch devices or under reduced motion, where the native cursor is
            left exactly as it was. */}
        <Cursor />
        {/* Client component wrapping server-rendered children: the pages below
            still render on the server and arrive here as `children`. Only the
            parts that read the dictionary need to be client components. */}
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
