import type { Metadata } from "next";
import { FunnelPage } from "@/components/FunnelPage";
import { FUNNELS } from "@/lib/funnels";

/**
 * Variant funnel — kept out of the index so it can't compete with `/` for the
 * same keywords or split its ranking. `follow` stays on so internal links are
 * still crawled.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function QuickFunnelPage() {
  return <FunnelPage funnel={FUNNELS.quick} />;
}
