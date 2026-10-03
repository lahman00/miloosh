import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Analytics } from "@/components/Analytics";
import { FirstPartyAnalytics } from "@/components/FirstPartyAnalytics";
import { SocialLandingCapture } from "@/components/SocialLandingCapture";
import { getOrganizationJsonLd } from "@/lib/structured-data";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_CANVAS_COLOR, SITE_URL } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const title = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "software alternatives",
    "software comparison",
    "compare software",
    "switch software",
  ],
  openGraph: {
    title,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: "yf1LZXLagz0fH3kKABG9nyDUlHNx7A1rPkdkC2v2qI0",
    other: {
      "impact-site-verification": "3a06dc9c-bb49-4725-8924-307dd7436394",
    },
  },
  alternates: {
    types: {
      "application/rss+xml": `${SITE_URL}/feed.xml`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: SITE_CANVAS_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="miloosh-theme flex min-h-full flex-col bg-zinc-950 font-sans text-white antialiased">
        <JsonLd data={getOrganizationJsonLd()} />
        <FirstPartyAnalytics />
        <SocialLandingCapture />
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Navbar />
        <Analytics />
        <div id="main-content" className="site-content" tabIndex={-1}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
