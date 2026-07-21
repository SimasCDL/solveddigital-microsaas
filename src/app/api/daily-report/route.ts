import { NextRequest, NextResponse } from "next/server";
import { buildReport } from "@/lib/report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily report. Hit by Vercel Cron (which sends Authorization: Bearer
 * $CRON_SECRET) at 20:00 UTC, or manually with ?key=$CRON_SECRET.
 * Add ?dry=1 to preview the message text without sending to Telegram.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const text = await buildReport();

    if (req.nextUrl.searchParams.get("dry") === "1") {
      return NextResponse.json({ ok: true, text });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, error: "Telegram not configured", text },
        { status: 200 },
      );
    }

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const tgBody = await tg.json();
    if (!tg.ok || !tgBody.ok) {
      return NextResponse.json(
        { ok: false, error: "Telegram send failed", tg: tgBody },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("daily-report error:", err);
    return NextResponse.json(
      { ok: false, error: "Report failed" },
      { status: 500 },
    );
  }
}
