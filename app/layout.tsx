import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ClarityAnalytics from "@/components/site/ClarityAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tourly — AI video tours for your listings, in 2 minutes",
  description:
    "Turn your listing photos into a scroll-stopping video tour ready for MLS, Reels & TikTok — without hiring a videographer or editing a thing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream text-ink">
        {children}
        <ClarityAnalytics />
      </body>
    </html>
  );
}
