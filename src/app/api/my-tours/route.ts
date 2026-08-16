import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { listOrdersByEmail } from "@/lib/orders";
import { signVideoUrls } from "@/lib/videos";
import { createTourToken, readTourToken } from "@/lib/tourAccess";
import { sendTourLibraryLinkEmail } from "@/lib/resend";
import { clientIp, hashIp } from "@/lib/freeTrial";

export const dynamic = "force-dynamic";

/**
 * The customer's tour library.
 *
 * POST { email }  → mails a link, if that address has anything to show.
 * GET  ?t=<token> → the tours belonging to the address the token proves.
 *
 * Playback links are signed fresh on every load, which is what lets a library
 * outlive the 7-day expiry stamped on the emailed order links. The underlying
 * files were never deleted — that expiry is a policy on an anonymous UUID link,
 * and it should not apply to somebody who has proved the inbox is theirs.
 */

/** Signed playback links, short-lived because the page re-fetches anyway. */
const PLAYBACK_SIGN_SECONDS = 60 * 60;

const HOUR = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function overLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > 500) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < HOUR)) hits.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const addr = email.trim().toLowerCase();
    const ipHash = hashIp(clientIp(req.headers));

    // Always answers the same way, whatever happens below. Telling the caller
    // that an address has tours turns this endpoint into a way to test which of
    // your competitors' emails are customers, and telling them it was throttled
    // just tells a bot when to come back.
    const ok = NextResponse.json({ ok: true });

    if (
      overLimit(`ip:${ipHash}`, 5, 15 * 60_000) ||
      overLimit(`em:${addr}`, 3, HOUR) ||
      overLimit("global", 100, HOUR)
    ) {
      console.warn("[my-tours] rate limited");
      return ok;
    }

    after(async () => {
      try {
        // Nothing to show, nothing to send. A "here are your tours" email to
        // someone who has never bought is both confusing and a free way for a
        // stranger to make us mail an address they do not own.
        const orders = await listOrdersByEmail(addr);
        if (!orders.length) return;

        const token = createTourToken(addr);
        if (!token) return;

        await sendTourLibraryLinkEmail({
          to: addr,
          token,
          tourCount: orders.filter((o) => o.status === "completed").length,
        });
      } catch (err) {
        console.error("[my-tours] link email failed:", err);
      }
    });

    return ok;
  } catch (err) {
    console.error("[my-tours] request failed:", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const email = readTourToken(token);
  if (!email) {
    // Deliberately identical for expired, forged and absent tokens.
    return NextResponse.json({ error: "Link expired" }, { status: 401 });
  }

  try {
    const orders = await listOrdersByEmail(email);
    const tours = await Promise.all(
      orders.map(async (o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        propertyAddress: o.propertyAddress || "",
        photoCount: o.photoUrls.length,
        thumbnail: o.photoUrls[0] ?? null,
        // A free preview is watch-only; the page must not offer downloads.
        free: (o.stripeSessionId ?? "").startsWith("free:"),
        videoUrls:
          o.status === "completed"
            ? await signVideoUrls(o.videoUrls ?? [], PLAYBACK_SIGN_SECONDS)
            : [],
      })),
    );

    return NextResponse.json({ email, tours });
  } catch (err) {
    console.error("[my-tours] list failed:", err);
    return NextResponse.json({ error: "Could not load" }, { status: 500 });
  }
}
