import { NextRequest, NextResponse } from "next/server";
import { sbFetch, supabaseConfigured } from "@/lib/supabase";
import { getLeadByEmail, normalizeEmail, upsertLead } from "@/lib/leads";
import { startSequence } from "@/lib/sequence";
import { isInternalEmail } from "@/lib/internal";
import { diagnose } from "@/lib/quiz";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Enrol addresses collected before the quiz funnel existed into the winback.
 *
 * Sources, because the old quiz leads are not recoverable: `/api/quiz-lead`
 * never persisted anything before this table existed, so those addresses only
 * ever appeared in Telegram. What *is* on disk is everyone who claimed a free
 * preview (`free_trials`) and everyone who placed an order (`orders`).
 * Anything scraped out of Telegram by hand can be passed in as `emails`.
 *
 * Dry run by default. This sends real mail to real people and the list is
 * polluted with the team's own testing, so it prints who it would enrol and
 * changes nothing until `confirm: true`.
 *
 *   POST /api/backfill-leads   { "sources": ["free_trials","orders"] }
 *   POST /api/backfill-leads   { "emails": ["a@b.com"], "confirm": true }
 */


/** Obvious non-humans that testing tends to leave behind. */
function looksLikeJunk(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return true;
  if (local.length <= 2) return true; // a@, ab@
  if (/^(test|demo|asd|qwe|aaa|xxx|noreply|no-reply)/.test(local)) return true;
  if (/example\.(com|org)$|test\.|localhost/.test(domain)) return true;
  return false;
}

async function collect(sources: string[]): Promise<string[]> {
  const out = new Set<string>();
  if (!supabaseConfigured()) return [];

  if (sources.includes("free_trials")) {
    const res = await sbFetch("/free_trials?select=email&limit=5000");
    for (const r of (await res.json()) as Array<{ email: string | null }>) {
      if (r.email) out.add(normalizeEmail(r.email));
    }
  }
  if (sources.includes("orders")) {
    const res = await sbFetch(
      "/orders?select=email,stripe_session_id&limit=5000",
    );
    for (const r of (await res.json()) as Array<{
      email: string | null;
      stripe_session_id: string | null;
    }>) {
      // Someone who actually paid is a customer, not a winback target.
      const paid =
        r.stripe_session_id && !r.stripe_session_id.startsWith("free:");
      if (r.email && !paid) out.add(normalizeEmail(r.email));
    }
  }
  return [...out];
}

export async function POST(req: NextRequest) {
  if (
    !process.env.ADMIN_KEY ||
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      emails = [],
      sources = [],
      confirm = false,
    } = (await req.json().catch(() => ({}))) as {
      emails?: string[];
      sources?: string[];
      confirm?: boolean;
    };

    const candidates = new Set<string>([
      ...emails.map(normalizeEmail),
      ...(await collect(sources)),
    ]);

    const skipped: Record<string, string> = {};
    const eligible: string[] = [];

    for (const email of candidates) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        skipped[email] = "invalid";
      } else if (isInternalEmail(email)) {
        skipped[email] = "internal";
      } else if (looksLikeJunk(email)) {
        skipped[email] = "junk";
      } else {
        const existing = await getLeadByEmail(email);
        if (existing) skipped[email] = `already a lead (${existing.status})`;
        else eligible.push(email);
      }
    }

    if (!confirm) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldEnrol: eligible.length,
        eligible,
        skipped,
        note: 'Nothing sent. Re-post with { "confirm": true } to enrol these.',
      });
    }

    // Winback leads have no quiz answers, so the diagnosis falls back to its
    // defaults. That is fine: the winback copy leans on the price change and
    // the pack, never on "you said" or "your score".
    const d = diagnose({});
    let enrolled = 0;
    for (const email of eligible) {
      try {
        const { lead } = await upsertLead({
          email,
          answers: {},
          archetype: d.archetype,
          score: d.score,
          packId: d.pack.id,
          source: "winback",
        });
        if (lead.status === "active") {
          await startSequence(lead);
          enrolled++;
        }
      } catch (err) {
        console.error(`[backfill] ${email} failed:`, err);
        skipped[email] = "enrol failed";
      }
    }

    return NextResponse.json({ ok: true, enrolled, skipped });
  } catch (err) {
    console.error("[backfill] failed:", err);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
