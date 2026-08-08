import { MobileFunnel } from "@/components/MobileFunnel";
import { DesktopLanding } from "@/components/DesktopLanding";
import { SmartHashScroll } from "@/components/SmartHashScroll";
import type { Funnel } from "@/lib/funnels";

/**
 * The landing shell every funnel route renders — desktop layout at md+, the
 * mobile sales funnel below md. Only the `funnel` config differs between
 * routes, so a variant can never drift out of sync with the control by accident.
 */
export function FunnelPage({ funnel }: { funnel: Funnel }) {
  return (
    <div className="tourly min-h-screen bg-cream text-ink">
      <SmartHashScroll />
      <div className="md:hidden">
        <MobileFunnel funnel={funnel} />
      </div>
      <div className="hidden md:block" style={{ zoom: 0.8 }}>
        <DesktopLanding funnel={funnel} />
      </div>
    </div>
  );
}
