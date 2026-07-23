"use client";

import Script from "next/script";

/**
 * Microsoft Clarity analytics.
 *
 * The Clarity project ID is a public client-side identifier (visible in the
 * page source of every site that uses Clarity) — not a secret — so it's safe to
 * hardcode. An optional NEXT_PUBLIC_CLARITY_ID env var can override it.
 *
 * Only fires in production so local `npm run dev` doesn't pollute the project.
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "xpy86yhdm3";

export default function ClarityAnalytics(): React.ReactElement | null {
  if (process.env.NODE_ENV !== "production" || !CLARITY_ID) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");`}
    </Script>
  );
}
