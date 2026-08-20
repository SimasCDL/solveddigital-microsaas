import { NextRequest, NextResponse } from "next/server";
import { sendTelegram, generationReadyMessage } from "@/lib/telegram";
import { getOrder } from "@/lib/orders";

// Admin-gated env diagnostic — reports which env vars production actually has
// (presence + length only, never the secret values). Pass x-admin-key.
//
// `?telegram=1` also fires a test message to the sales channel, so the alerting
// path can be verified without burning a free trial or generating a video.
export async function GET(req: NextRequest) {
  if (
    !process.env.ADMIN_KEY ||
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ?telegram=1        → plain "alerting works" ping
  // ?telegram=<orderId> → re-send that order's real "generation ready" message,
  //                       useful for eyeballing a finished tour or re-notifying
  //                       after an alert was missed.
  let telegramTest: { ok: boolean; error?: string; sent?: string } | undefined;
  const tg = new URL(req.url).searchParams.get("telegram");
  if (tg === "1") {
    telegramTest = await sendTelegram(
      "🔔 *Test alert* - alerting works.\n\nThis is a manual check from the admin diagnostic, not a real order.",
    );
  } else if (tg) {
    const order = await getOrder(tg);
    if (!order) {
      telegramTest = { ok: false, error: `order ${tg} not found` };
    } else {
      const msg = generationReadyMessage({
        orderId: tg,
        email: order.email,
        photoCount: order.photoUrls.length,
        free: (order.stripeSessionId ?? "").startsWith("free:"),
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://www.renoa.ai",
      });
      telegramTest = { ...(await sendTelegram(msg)), sent: msg };
    }
  }
  // ?clarity=1 → ask the Clarity export API what it actually says, because
  // "the report shows zero traffic" has two very different causes: nobody came,
  // or this token cannot read the project the tag on the page writes to. The
  // status code tells them apart and nothing else does.
  let clarityCheck:
    { status: number | string; sessions?: number; body?: string } | undefined;
  if (new URL(req.url).searchParams.get("clarity") === "1") {
    const token = process.env.CLARITY_API_TOKEN;
    if (!token) {
      clarityCheck = { status: "CLARITY_API_TOKEN not set" };
    } else {
      try {
        const res = await fetch(
          "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1",
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        const text = await res.text();
        let sessions: number | undefined;
        try {
          const rows = JSON.parse(text) as Array<{
            metricName: string;
            information?: Record<string, unknown>[];
          }>;
          const traffic = rows.find((r) => r.metricName === "Traffic")
            ?.information?.[0];
          const n = Number(traffic?.totalSessionCount ?? NaN);
          if (Number.isFinite(n)) sessions = n;
        } catch {
          /* not JSON — the raw body below is the useful part */
        }
        clarityCheck = {
          status: res.status,
          sessions,
          body: text.slice(0, 300),
        };
      } catch (err) {
        clarityCheck = {
          status: "fetch failed",
          body: String(err).slice(0, 200),
        };
      }
    }
  }

  const p = (k: string) => {
    const v = process.env[k];
    return v ? `set (len ${v.length})` : "MISSING";
  };
  return NextResponse.json({
    ANTHROPIC_API_KEY: p("ANTHROPIC_API_KEY"),
    REPLICATE_API_TOKEN: p("REPLICATE_API_TOKEN"),
    FAL_KEY: p("FAL_KEY"),
    SUPABASE_URL: process.env.SUPABASE_URL || "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: p("SUPABASE_SERVICE_ROLE_KEY"),
    STRIPE_SECRET_KEY: p("STRIPE_SECRET_KEY"),
    RESEND_API_KEY: p("RESEND_API_KEY"),
    FROM_EMAIL: process.env.FROM_EMAIL || "MISSING",
    VIDEO_PROVIDER: process.env.VIDEO_PROVIDER || "MISSING",
    NEXT_PUBLIC_FREE_MODE: process.env.NEXT_PUBLIC_FREE_MODE || "MISSING",
    // Base URL used to build order/video links in delivery emails.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    // Must be absent/false in production — bypasses Stripe payment verification.
    SKIP_PAYMENT_CHECK: process.env.SKIP_PAYMENT_CHECK || "unset (good)",
    // Server-side Meta Lead (Conversions API).
    META_CAPI_TOKEN: p("META_CAPI_TOKEN"),
    META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE || "unset",
    // Stripe webhook → Telegram sale alerts.
    STRIPE_WEBHOOK_SECRET: p("STRIPE_WEBHOOK_SECRET"),
    TELEGRAM_BOT_TOKEN: p("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "MISSING",
    // Both crons live in /etc/cron.d on the VPS and authenticate with this.
    // Unset means /api/nurture 401s and the whole sequence stops at step 1.
    CRON_SECRET: p("CRON_SECRET"),
    // The daily report's traffic and behaviour numbers. Unset means the report
    // has no idea anyone visited. `clarityCheck` says which of the two it is.
    CLARITY_API_TOKEN: p("CLARITY_API_TOKEN"),
    // Must be the SAME project the API token was issued for. A tag writing to
    // project A while the token reads project B looks exactly like no traffic.
    NEXT_PUBLIC_CLARITY_PROJECT_ID:
      process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ||
      "unset (falls back to xpy86yhdm3)",
    ...(clarityCheck ? { clarityCheck } : {}),
    ...(telegramTest ? { telegramTest } : {}),
  });
}
