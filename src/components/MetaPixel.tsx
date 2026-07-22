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

/**
 * Fire a Meta "Lead" for a completed purchase — exactly once per order, even
 * across refreshes, revisits, or the order page's status polling. `eventID`
 * lets Meta dedupe if the same event is ever also sent via the Conversions API.
 */
export function trackLeadOnce(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  const key = `fb_lead_${orderId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // localStorage blocked (private mode) — still fires, just not de-duped
    // across reloads. Meta's own eventID de-dupes on their side.
  }
  window.fbq?.(
    "track",
    "Lead",
    { content_name: "video_tour_order" },
    { eventID: orderId },
  );
}
