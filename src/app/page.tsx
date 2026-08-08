import { FunnelPage } from "@/components/FunnelPage";
import { FUNNELS } from "@/lib/funnels";

/**
 * Marketing landing — the site's front door, and the control funnel every
 * variant under /f is measured against. The customer flow lives at /upload and
 * /order.
 */
export default function Home() {
  return <FunnelPage funnel={FUNNELS.main} />;
}
