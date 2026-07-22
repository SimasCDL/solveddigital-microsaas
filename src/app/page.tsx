import { MobileFunnel } from "@/components/MobileFunnel";
import { DesktopLanding } from "@/components/DesktopLanding";
import { SmartHashScroll } from "@/components/SmartHashScroll";

/**
 * Marketing landing — the site's front door. Desktop layout at md+, the mobile
 * sales funnel below md. Wrapped in `.tourly` so it uses Geist + the shared
 * font-display / eyebrow styles. The customer flow lives at /upload and /order.
 */
export default function Home() {
  return (
    <div className="tourly min-h-screen bg-cream text-ink">
      <SmartHashScroll />
      <div className="md:hidden">
        <MobileFunnel />
      </div>
      <div className="hidden md:block" style={{ zoom: 0.8 }}>
        <DesktopLanding />
      </div>
    </div>
  );
}
