import crypto from 'crypto';

const GRAPH_VERSION = 'v21.0';

// Meta requires user identifiers to be SHA-256 hashed, lowercased & trimmed.
const sha256 = (v: string) =>
  crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

/**
 * Fire a Meta conversion event server-side via the Conversions API. Runs during
 * fulfillment, so it's completely independent of the customer's browser — ad
 * blockers, a closed tab, or a missed order-page load can't drop it.
 *
 * `Lead` = a paid purchase (what the campaigns optimize on). `StartTrial` = a
 * claimed free trial, kept separate so it can't dilute that signal.
 *
 * `event_id` = orderId matches the browser pixel's eventID, so if both fire
 * Meta de-dupes them into a single event (never double-counts).
 *
 * No-ops unless META_CAPI_TOKEN is set, so it's safe to ship before the token
 * exists. Set META_TEST_EVENT_CODE to make events show under Events Manager →
 * Test Events while testing (remove it for production).
 */
export async function sendMetaEventServerSide(params: {
  eventName: 'Lead' | 'StartTrial';
  orderId: string;
  email?: string;
  eventSourceUrl?: string;
}): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || '1711786899965347';
  if (!token) return; // CAPI not configured — the browser pixel still fires the Lead

  const user_data: Record<string, unknown> = {};
  if (params.email) user_data.em = [sha256(params.email)];

  const event: Record<string, unknown> = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.orderId,
    action_source: 'website',
    user_data,
  };
  if (params.eventSourceUrl) event.event_source_url = params.eventSourceUrl;

  const body: Record<string, unknown> = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.error(`[meta] CAPI ${params.eventName} failed:`, res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error(`[meta] CAPI ${params.eventName} error:`, err);
  }
}
