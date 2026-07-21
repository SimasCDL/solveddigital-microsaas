import { MobileFunnel } from "@/components/MobileFunnel";
import { DesktopLanding } from "@/components/DesktopLanding";

/**
 * Marketing landing — the site's front door. Desktop layout at md+, the mobile
 * sales funnel below md. Wrapped in `.tourly` so it uses Geist + the shared
 * font-display / eyebrow styles. The customer flow lives at /upload and /order.
 */
export default function Home() {
  return (
    <div className="tourly min-h-screen bg-cream">
      <div className="md:hidden">
        <MobileFunnel />
      </div>
      <div className="hidden md:block">
        <DesktopLanding />
      </div>
    </div>
  );
}
