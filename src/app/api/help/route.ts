import { NextRequest, NextResponse } from "next/server";
import { sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Support intake, delivered to Telegram instead of an inbox.
 *
 * There is no monitored mailbox behind this business, so every "just reply to
 * this email" in the marketing copy would be a promise nothing honours. This is
 * the replacement: the customer writes here, the message lands on a phone
 * immediately, and the reply happens from whatever address is convenient.
 *
 * It is the only channel the nurture emails point at, which means it is
 * load-bearing for the refund guarantee. Failing silently here would turn a
 * refund request into a chargeback, so a delivery failure is reported to the
 * sender rather than swallowed.
 */

/**
 * Per-instance throttle. Not airtight across serverless instances, but the
 * abuse here is Telegram spam rather than anything costly, and a shared store
 * for a contact form is not worth the moving parts.
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX = 5;

function throttled(ip: string): boolean {
  if (!ip) return false;
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Bound the map so a long-lived instance cannot grow it without limit.
  if (hits.size > 500) {
    for (const [k, v] of hits)
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX;
}

export async function POST(req: NextRequest) {
  try {
    const { email, message, orderId } = (await req.json()) as {
      email?: string;
      message?: string;
      orderId?: string;
    };

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email." },
        { status: 400 },
      );
    }
    if (!message || message.trim().length < 3) {
      return NextResponse.json(
        { error: "Please tell us what you need." },
        { status: 400 },
      );
    }

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (throttled(ip)) {
      return NextResponse.json(
        { error: "Too many messages just now. Please try again shortly." },
        { status: 429 },
      );
    }

    // Telegram's Markdown parser chokes on stray formatting characters, and a
    // customer's message is arbitrary text. Escaping beats a dropped message.
    const clean = (s: string) =>
      s.replace(/[*_`[\]()~>#+=|{}.!-]/g, (c) => `\\${c}`);

    const res = await sendTelegram(
      `🆘 *Support request*\n` +
        `📧 ${clean(email)}\n` +
        (orderId ? `🧾 order ${clean(orderId)}\n` : "") +
        `\n${clean(message.trim().slice(0, 1500))}`,
    );

    if (!res.ok) {
      // The customer must never be told "sent" when it was not. Someone asking
      // for a refund needs to know to chase it another way.
      console.error("[help] telegram delivery failed:", res.error);
      return NextResponse.json(
        { error: "We could not deliver that. Please try again in a moment." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[help] request failed:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
