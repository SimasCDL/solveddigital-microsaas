import { Resend } from "resend";

// Lazy singleton — constructing Resend at module load throws "Missing API key"
// during Vercel's build (env vars aren't present then). Build it on first send.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return (_resend ??= new Resend(process.env.RESEND_API_KEY));
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping email");
    return;
  }

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
    subject: params.preview
      ? `Your free preview is ready`
      : `Your video tour is ready`,
    html: shell(`${body}
      <p style="color:#6f6a60;font-size:12px;margin:28px 0 0;border-top:1px solid #e7e1d6;padding-top:16px;">
        Order #${params.orderId} &middot; This page's links last 7 days. After that
        your tour is still in
        <a href="${appUrl()}/library" style="color:#0f7d6b;">your library</a>,
        along with everything else you have made.
      </p>
    `),
  });
}

/**
 * The reminder for somebody who paid and never sent their photos.
 *
 * Two of these, ever. Deliberately not the post-purchase sequence: every email
 * in that one is written for a person holding a finished tour, and telling
 * someone where to post a vertical cut they have never seen would read as a
 * company that had not noticed they got nothing.
 *
 * It also concedes nothing and hurries nobody. An unredeemed pack costs us no
 * generation, so there is no revenue to rescue here — only a customer who paid
 * and has not been served, which is a reason to be available rather than a
 * reason to push. Nothing here claims an expiry, because nothing expires.
 */
export async function sendUploadReminderEmail(params: {
  to: string;
  sessionId: string;
  maxPhotos: number;
  /** 1 = the nudge a day later, 2 = the last one. */
  attempt: 1 | 2;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping reminder");
    return;
  }

  const uploadUrl = `${appUrl()}/upload?session_id=${encodeURIComponent(params.sessionId)}`;
  const helpUrl = `${appUrl()}/help`;
  const helpShort = helpUrl.replace(/^https?:\/\//, "");

  const body =
    params.attempt === 1
      ? `
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 28px;">Your photos have not arrived yet</h1>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        You bought a pack yesterday and it is still sitting here waiting for a
        gallery. Nothing is wrong and nothing has been used up &mdash; send up to
        ${params.maxPhotos} photos whenever the listing is ready and your tour
        comes back to this inbox in about fifteen minutes.
      </p>`
      : `
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 28px;">Still here whenever you are</h1>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        Last one about this. Your pack is paid for and it does not expire, so
        there is no rush from our side &mdash; the link below works next week or
        next month just as well as today.
      </p>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        If something went wrong when you tried to upload, that is worth telling
        us about rather than writing off. It takes one message and we will sort
        it out.
      </p>`;

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject:
      params.attempt === 1
        ? "your pack is waiting for photos"
        : "still here whenever you are",
    html: shell(`${body}
      <p style="margin:0 0 28px;">
        <a href="${uploadUrl}" style="display:inline-block;background:#0f7d6b;color:#ffffff;font-weight:600;font-size:15px;padding:15px 32px;border-radius:999px;text-decoration:none;">Send my photos &rarr;</a>
      </p>
      <p style="color:#6f6a60;font-size:13px;margin:0;">
        Stuck, or changed your mind? Tell us at
        <a href="${helpUrl}" style="color:#0f7d6b;">${helpShort}</a>
        and a human picks it up. 30 days to change your mind, refund included.
      </p>
    `),
  });
}

/**
 * The link into the customer's own tour library.
 *
 * Sent only when the address actually has tours, and only ever to the address
 * itself — the token in this link is the whole authentication story, so mailing
 * it anywhere else would hand over somebody's listings.
 */
export async function sendTourLibraryLinkEmail(params: {
  to: string;
  token: string;
  /** Finished tours, so the copy can be specific rather than say "your tours". */
  tourCount: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping library link");
    return;
  }

  const url = `${appUrl()}/library?t=${encodeURIComponent(params.token)}`;
  const n = params.tourCount;
  const countLine =
    n === 0
      ? "Your tours are here."
      : n === 1
        ? "You have 1 tour saved."
        : `You have ${n} tours saved.`;

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: "Your Tourly library",
    html: shell(`
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 28px;">${countLine}</h1>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        Everything you have made with Tourly lives on one page: watch it, download
        it again, or start the next listing. No password, this link is the key.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${url}" style="display:inline-block;background:#0f7d6b;color:#ffffff;font-weight:600;font-size:15px;padding:15px 32px;border-radius:999px;text-decoration:none;">Open my library &rarr;</a>
      </p>
      <p style="color:#6f6a60;font-size:13px;margin:0;">
        The link works for 30 days and only from this email address. If you did
        not ask for it, nothing has happened to your account and you can ignore
        this.
      </p>
    `),
  });
}

/**
 * The receipt that is also the way back in.
 *
 * In the pay-first funnel the customer pays on a Stripe Payment Link and only
 * then reaches the uploader, via the session id on the success URL. That URL is
 * the ONLY route to it. Close the tab, lose the tab, tap a notification
 * mid-redirect, and they have paid us and have nowhere to go: Stripe's own
 * receipt carries no link of ours, and their order does not exist yet, so
 * nothing else in the system knows to chase them.
 *
 * So this is not a nicety. It is the durable copy of the one link that turns
 * their money into a product, and it must go out the moment the payment lands.
 *
 * Never "reply to this email" — nothing reads that inbox. /help reaches a phone.
 */
export async function sendUploadLinkEmail(params: {
  to: string;
  /** The paid Checkout Session — its id is what unlocks the uploader. */
  sessionId: string;
  /** Photos this pack covers, so the copy states the real cap. */
  maxPhotos: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping upload link");
    return;
  }

  const uploadUrl = `${appUrl()}/upload?session_id=${encodeURIComponent(params.sessionId)}`;
  const helpUrl = `${appUrl()}/help`;

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: "You're in. Send your listing photos",
    html: shell(`
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 28px;">You're in. Now send your photos.</h1>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        Your pack is paid for and waiting. Send up to ${params.maxPhotos} listing
        photos and your tour comes back to this inbox, usually in about 15
        minutes. No editing, nothing to install.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${uploadUrl}" style="display:inline-block;background:#0f7d6b;color:#ffffff;font-weight:600;font-size:15px;padding:15px 32px;border-radius:999px;text-decoration:none;">Upload my photos &rarr;</a>
      </p>
      <p style="color:#15130f;font-size:15px;margin:0 0 28px;">
        Keep this email. That button is how you get back to your upload page if
        you close the tab, and it works whenever you are ready. Your photos do
        not have to be sent today.
      </p>
      <p style="color:#6f6a60;font-size:13px;margin:0;">
        You get three files: widescreen for Zillow and the MLS, plus two vertical
        cuts for Reels and TikTok. Something wrong? Tell us at
        <a href="${helpUrl}" style="color:#0f7d6b;">${helpUrl.replace(/^https?:\/\//, "")}</a>
        and a human picks it up.
      </p>
      <p style="color:#6f6a60;font-size:12px;margin:28px 0 0;border-top:1px solid #e7e1d6;padding-top:16px;">
        30 days to change your mind. If the tour is not something you would put
        your name on, ask at ${helpUrl.replace(/^https?:\/\//, "")} and we refund
        you, and you keep the files either way.
      </p>
    `),
  });
}

/**
 * The quiz diagnostic, mailed to the lead.
 *
 * The email gate promises "we'll send a copy to your inbox" — this is that copy,
 * and it has to arrive while they're still reading the on-page result or the
 * promise reads as a bait for the address. It doubles as the retargeting asset:
 * their score and their number, with a live checkout link, sitting in the inbox.
 */
export async function sendQuizDiagnosticEmail(params: {
  to: string;
  archetype: string;
  score: number;
  costLine: string;
  situation: string;
  fixFirst: string;
  plan: string[];
  packName: string;
  packPrice: string;
  checkoutUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping email");
    return;
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const plan = params.plan
    .map(
      (p) =>
        `<li style="color:#15130f;font-size:14px;line-height:1.6;margin:0 0 10px;">${esc(p)}</li>`,
    )
    .join("");

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: `Your listing diagnostic — ${params.archetype}`,
    html: shell(`
      <p style="color:#6f6a60;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 8px;">Your listing marketing</p>
      <h1 style="color:#15130f;font-size:26px;font-weight:600;letter-spacing:-0.022em;margin:0 0 6px;">${esc(params.archetype)}</h1>
      <p style="color:#6f6a60;font-size:14px;margin:0 0 24px;">Score ${params.score}/100</p>

      <div style="background:#e3f3ec;border-radius:14px;padding:18px;margin:0 0 28px;">
        <p style="color:#15130f;font-size:15px;line-height:1.5;margin:0;">${esc(params.costLine)}</p>
      </div>

      <h2 style="color:#15130f;font-size:18px;font-weight:600;margin:0 0 10px;">What&rsquo;s happening</h2>
      <p style="color:#6f6a60;font-size:14px;line-height:1.6;margin:0 0 24px;">${esc(params.situation)}</p>

      <h2 style="color:#15130f;font-size:18px;font-weight:600;margin:0 0 10px;">What to fix first</h2>
      <p style="color:#6f6a60;font-size:14px;line-height:1.6;margin:0 0 24px;">${esc(params.fixFirst)}</p>

      <h2 style="color:#15130f;font-size:18px;font-weight:600;margin:0 0 12px;">Your 30-day plan</h2>
      <ul style="margin:0 0 28px;padding-left:20px;">${plan}</ul>

      <div style="border-top:1px solid #e7e1d6;padding-top:24px;">
        <p style="color:#6f6a60;font-size:13px;margin:0 0 4px;">Recommended for your galleries</p>
        <p style="color:#15130f;font-size:20px;font-weight:700;margin:0 0 16px;">${esc(params.packName)} &middot; ${esc(params.packPrice)}</p>
        <p style="margin:0 0 12px;">
          <a href="${params.checkoutUrl}" style="display:inline-block;background:#0f7d6b;color:#ffffff;font-weight:600;font-size:15px;padding:15px 32px;border-radius:999px;text-decoration:none;">Get my tours &rarr;</a>
        </p>
        <p style="color:#6f6a60;font-size:12px;margin:0;">30-day money-back guarantee. Not obsessed with your video? Full refund &mdash; keep the files.</p>
      </div>
    `),
  });
}

/**
 * Send (or schedule) one step of the nurture sequence.
 *
 * Differs from the transactional senders above in three ways that all exist to
 * keep this out of the promotions tab and out of spam:
 *
 * - A real `text/plain` alternative goes with every send. An HTML-only bulk
 *   email is one of the cheapest spam signals there is.
 * - `List-Unsubscribe` plus `List-Unsubscribe-Post` give Gmail and Yahoo the
 *   one-click unsubscribe button in the header. Since February 2024 bulk
 *   senders without it get throttled, and a header unsubscribe is far better
 *   for the sender than the alternative, which is the recipient hitting "report
 *   spam" because it was the easier button to find.
 * - `scheduledAt` hands the delay to Resend. Returning the id is what makes the
 *   send cancellable when the person buys before it fires.
 *
 * Returns the Resend id, or null if nothing was sent.
 */
export async function sendNurtureEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubUrl: string;
  step: number;
  /** ISO 8601. Omit to send immediately. */
  scheduledAt?: string;
}): Promise<string | null> {
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping email");
    return null;
  }

  // A named human in the From line, falling back to the transactional sender.
  // These emails are written in the first person and a no-reply address in the
  // header contradicts the first sentence.
  const from = process.env.NURTURE_FROM_EMAIL || process.env.FROM_EMAIL!;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    replyTo: process.env.REPLY_TO_EMAIL || from,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers: {
      "List-Unsubscribe": `<${params.unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: [{ name: "sequence", value: `quiz_step_${params.step}` }],
    ...(params.scheduledAt ? { scheduledAt: params.scheduledAt } : {}),
  });

  if (error) {
    console.error(`[nurture] step ${params.step} send failed:`, error);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Cancel scheduled sends that have not fired yet.
 *
 * Best effort by design. Resend answers an error for an email that has already
 * gone out or does not exist, and neither is worth failing a webhook over: the
 * caller is a Stripe handler that must still return 200, or an unsubscribe that
 * must still confirm. Every id is attempted even if an earlier one throws.
 */
export async function cancelScheduledEmails(ids: string[]): Promise<void> {
  const resend = getResend();
  if (!resend || !ids.length) return;
  await Promise.all(
    ids.map((id) =>
      resend.emails
        .cancel(id)
        .catch((err) => console.error(`[nurture] cancel ${id} failed:`, err)),
    ),
  );
}

/** Internal ops alert — goes to ADMIN_ALERT_EMAIL, never to customers. */
export async function sendAdminAlert(
  subject: string,
  body: string,
): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) {
    console.error(
      `[alert] ADMIN_ALERT_EMAIL not set — dropping alert: ${subject}\n${body}`,
    );
    return;
  }
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping email");
    return;
  }
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to,
    subject: `[Tourly ops] ${subject}`,
    html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre>`,
  });
}

export async function sendFailureEmail(params: {
  to: string;
  orderId: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error("[resend] RESEND_API_KEY not set — skipping email");
    return;
  }
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: `An issue with your Tourly video`,
    html: shell(`
      <h1 style="color:#15130f;font-size:24px;font-weight:600;letter-spacing:-0.022em;margin:0 0 12px;">We ran into an issue</h1>
      <p style="color:#6f6a60;font-size:15px;line-height:1.6;margin:0;">
        Something went wrong while generating your video for order #${params.orderId}.
        Our team has been notified${
          process.env.NEXT_PUBLIC_FREE_MODE === "true"
            ? ` and we&rsquo;ll make it right. <a href="${appUrl()}/help" style="color:#15130f;">Tell us here</a> and we&rsquo;ll regenerate your tour.`
            : " and you will receive a full refund within 3&ndash;5 business days."
        }
      </p>
    `),
  });
}
