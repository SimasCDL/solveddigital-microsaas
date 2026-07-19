import { MobileFunnel } from "@/components/MobileFunnel";
import { DesktopLanding } from "@/components/DesktopLanding";

/**
 * One page, responsive by breakpoint: the mobile sales funnel below `md`
 * (phones), the desktop landing at `md` and up (tablets / desktop).
 */
export default function Home() {
  return (
    <>
      <div className="md:hidden">
        <MobileFunnel />
      </div>
      <div className="hidden md:block">
        <DesktopLanding />
      </div>
    </>
  );
}
