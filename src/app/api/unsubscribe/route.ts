import { NextRequest, NextResponse } from "next/server";
import { getLeadByToken } from "@/lib/leads";
import { stopSequence } from "@/lib/sequence";

export const dynamic = "force-dynamic";

/**
 * Unsubscribe, by capability token.
 *
 * Two entry points, both required:
 *
 * - `GET` is the link at the foot of every email. It redirects to a
 *   confirmation page so the person can see it worked.
 * - `POST` is RFC 8058 one-click, which is what Gmail and Yahoo call when the
 *   recipient uses the unsubscribe button in the mail client chrome. It gets
 *   the same `List-Unsubscribe` URL and must answer 200 without a redirect.
 *
 * The token is a random uuid stored on the lead, never derived from the
 * address, so knowing somebody's email is not enough to unsubscribe them. It
 * grants exactly one capability and nothing readable comes back, so there is
 * nothing to gain by guessing.
 *
 * An unsubscribe is unconditional and permanent: `upsertLead` will not restart
 * a sequence for this row even if the same person runs the quiz again.
 */

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const lead = await getLeadByToken(token);
    if (!lead) return false;
    return await stopSequence(lead.email, "unsubscribed");
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const ok = await unsubscribe(req.nextUrl.searchParams.get("t"));
  return NextResponse.redirect(
    new URL(`/unsubscribed${ok ? "" : "?e=1"}`, req.nextUrl.origin),
  );
}

export async function POST(req: NextRequest) {
  await unsubscribe(req.nextUrl.searchParams.get("t"));
  // Always 200. A mail client retrying a one-click unsubscribe it believes
  // failed is worse for everyone than silently accepting a stale token.
  return new NextResponse(null, { status: 200 });
}
