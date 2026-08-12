"use client";

import Script from "next/script";

export const META_PIXEL_ID = "1711786899965347";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Meta (Facebook) Pixel — loaded site-wide so it fires PageView on every page,
 * including the landing where ad traffic arrives (that's what captures the
 * fbclid → _fbc cookie Meta needs to attribute a later conversion). The
 * conversion event itself (Lead) is fired from the page where it happens — see
 * `trackLeadOnce`, called on the order page once a paid order is confirmed.
 */
export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// In-memory guard so the order page's repeated status polls can't each kick off
// their own fire loop for the same order within a single page load.
const inFlight = new Set<string>();

/**
 * Fire a Meta conversion event for an order — exactly once per order, even
 * across refreshes, revisits, or the order page's status polling. `eventID`
 * lets Meta dedupe if the same event is ever also sent via the Conversions API.
 *
 * The order page reaches this via a status fetch that can resolve before the
 * pixel snippet (loaded `afterInteractive`) has defined `window.fbq`. So we
 * WAIT for fbq to exist before firing, and only persist the de-dupe flag once
 * the event has actually gone out — otherwise a fast status response would mark
 * the order "sent" while the pixel was still loading and the event would be lost.
 */
function trackOnce(
  event: "Lead" | "StartTrial" | "Purchase",
  orderId: string,
  contentName: string,
  extra?: { value: number; currency: string },
): void {
  if (typeof window === "undefined" || !orderId) return;
  const guard = `${event}:${orderId}`;
  if (inFlight.has(guard)) return;
  const key = `fb_${event.toLowerCase()}_${orderId}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch {
    // localStorage blocked (private mode) — fall through; Meta's eventID still
    // de-dupes on their side.
  }
  inFlight.add(guard);

  let tries = 0;
  const fire = () => {
    if (typeof window.fbq === "function") {
      window.fbq(
        "track",
        event,
        {
          content_name: contentName,
          ...(extra
            ? { value: extra.value, currency: extra.currency.toUpperCase() }
            : {}),
        },
        { eventID: orderId },
      );
      try {
        localStorage.setItem(key, "1");
      } catch {}
      return;
    }
    // Wait up to ~15s for the pixel to initialize, then give up and release the
    // guard so a later page load can retry.
    if (tries++ < 60) {
      setTimeout(fire, 250);
    } else {
      inFlight.delete(guard);
    }
  };
  fire();
}

/** A completed PURCHASE. This is the event the ad campaigns optimize on, so it
 *  must never fire for a free trial. */
export const trackLeadOnce = (orderId: string) =>
  trackOnce("Lead", orderId, "video_tour_order");

/** A claimed free trial — tracked separately so it can't pollute the Lead
 *  signal the paid campaigns are optimizing against. */
export const trackStartTrialOnce = (orderId: string) =>
  trackOnce("StartTrial", orderId, "free_video_tour");

/**
 * Money received — the event a Sales campaign optimises on.
 *
 * Keyed on the Stripe SESSION id, not an order id, because the pay-first funnel
 * takes payment before an order exists. The webhook reports the same sale
 * server-side with the same id, so whichever arrives second is de-duped by Meta
 * rather than doubling the revenue.
 *
 * Fired from /upload, which is where Stripe's success URL lands the customer.
 */
export const trackPurchaseOnce = (
  sessionId: string,
  value: number,
  currency: string,
) => trackOnce("Purchase", sessionId, "video_tour_pack", { value, currency });
