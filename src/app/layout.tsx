import type { Metadata } from "next";
import { Geist, IBM_Plex_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://renoa.ai";
const TITLE = "Tourly — AI video tours for your listings, in minutes";
const DESCRIPTION =
  "Turn your listing photos into a scroll-stopping video tour ready for the MLS, Reels & TikTok — without hiring a videographer or editing a thing.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Tourly",
  keywords: [
    "real estate video",
    "listing video tour",
    "AI property video",
    "MLS video",
    "real estate reels",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Tourly",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Tourly" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${ibmPlex.variable} ${plusJakarta.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
