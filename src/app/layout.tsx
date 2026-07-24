import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Splash } from "@/components/Splash";

// Fonts are self-hosted by next/font (no runtime request to Google) — good for
// low-connectivity devices. Strong Devanagari + Tamil script coverage.
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-sans",
  display: "swap",
});
const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-deva",
  display: "swap",
});
const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-tamil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kalāsūtra — Proof of the hand that made it",
  description:
    "Kalāsūtra links handcrafted items to a secure, tamper-evident record of their maker and origin.",
};

export const viewport: Viewport = {
  // Mobile-first: designed for 360–400px viewports. Allow zoom for accessibility.
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2E3192",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getCurrentUser();

  return (
    <html lang={locale} className={`${notoSans.variable} ${notoDeva.variable} ${notoTamil.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          <Splash />
          <a href="#main" className="sr-only skip-link">
            Skip to main content
          </a>
          <SiteHeader user={user ? { displayName: user.displayName, role: user.role } : null} />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
            {children}
          </main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
