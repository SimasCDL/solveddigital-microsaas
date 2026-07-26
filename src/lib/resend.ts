import { Resend } from 'resend';

// Lazy singleton — constructing Resend at module load throws "Missing API key"
// during Vercel's build (env vars aren't present then). Build it on first send.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return (_resend ??= new Resend(process.env.RESEND_API_KEY));
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Tourly email shell — mirrors the funnel's design tokens (cream/ink/teal),
// inline styles only (email clients strip everything else).
const shell = (inner: string) => `
  <div style="background:#faf8f3;padding:32px 16px;font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#15130f;margin:0 0 20px;">Tourly</p>
      <div style="background:#ffffff;border:1px solid #e7e1d6;border-radius:20px;padding:36px 32px;">
        ${inner}
      </div>
      <p style="color:#6f6a60;font-size:12px;text-align:center;margin:20px 0 0;">
        Tourly · AI video tours for your listings
      </p>
    </div>
  </div>`;

export async function sendDeliveryEmail(params: {
  to: string;
  orderId: string;
  /** A free 3-photo preview — watch-only, so the copy must not promise downloads. */
  preview?: boolean;
}): Promise<void> {
  const orderUrl = `${appUrl()}/order/${params.orderId}`;

  const resend = getResend();
  if (!resend) { console.error("[resend] RESEND_API_KEY not set — skipping email"); return; }

  const body = params.preview
    ? `
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 28px;">Your free preview is ready</h1>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        We turned a few of your photos into a cinematic clip &mdash; have a watch.
        When you&rsquo;re happy with it, unlock the full tour built from all your
        photos: widescreen for Zillow &amp; the MLS, plus two vertical cuts for
        Reels and TikTok.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${orderUrl}" style="display:inline-block;background:#0f7d6b;color:#ffffff;font-weight:600;font-size:15px;padding:15px 32px;border-radius:999px;text-decoration:none;">Watch your preview &rarr;</a>
      </p>`
    : `
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 28px;">Your tour is ready</h1>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        Your tour is ready to watch and download &mdash; widescreen for Zillow &amp; the MLS,
        plus two vertical cuts for Reels and TikTok. Open your page to grab them all.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${orderUrl}" style="display:inline-block;background:#0f7d6b;color:#ffffff;font-weight:600;font-size:15px;padding:15px 32px;border-radius:999px;text-decoration:none;">Watch &amp; download your tour &rarr;</a>
      </p>`;

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: params.preview ? `Your free preview is ready` : `Your video tour is ready`,
    html: shell(`${body}
      <p style="color:#6f6a60;font-size:12px;margin:28px 0 0;border-top:1px solid #e7e1d6;padding-top:16px;">
        Order #${params.orderId} &middot; Your videos stay available on this page for 7 days.
      </p>
    `),
  });
}

/** Internal ops alert — goes to ADMIN_ALERT_EMAIL, never to customers. */
export async function sendAdminAlert(subject: string, body: string): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) {
    console.error(`[alert] ADMIN_ALERT_EMAIL not set — dropping alert: ${subject}\n${body}`);
    return;
  }
  const resend = getResend();
  if (!resend) { console.error("[resend] RESEND_API_KEY not set — skipping email"); return; }
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to,
    subject: `[Tourly ops] ${subject}`,
    html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${body
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
  });
}

export async function sendFailureEmail(params: {
  to: string;
  orderId: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) { console.error("[resend] RESEND_API_KEY not set — skipping email"); return; }
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: `An issue with your Tourly video`,
    html: shell(`
      <h1 style="color:#15130f;font-size:24px;font-weight:600;letter-spacing:-0.022em;margin:0 0 12px;">We ran into an issue</h1>
      <p style="color:#6f6a60;font-size:15px;line-height:1.6;margin:0;">
        Something went wrong while generating your video for order #${params.orderId}.
        Our team has been notified${process.env.NEXT_PUBLIC_FREE_MODE === 'true'
          ? ' and we&rsquo;ll make it right — just reply to this email and we&rsquo;ll regenerate your tour.'
          : ' and you will receive a full refund within 3&ndash;5 business days.'}
      </p>
    `),
  });
}
