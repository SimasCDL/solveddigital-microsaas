import { getStripe } from "./stripe";
import { funnelCounts, type FunnelStage } from "./quizEvents";
import { sendsInWindow } from "./nurtureSends";
import { convertedInWindow, leadCounts } from "./leads";
import { countsAsSale, isTestAddress } from "./internal";

/**
 * Daily report — pulls traffic/behavior from Microsoft Clarity and
 * sales from Stripe, and formats a short Telegram message.
 * Everything is env-driven; safe no-ops when a source isn't configured.
 */

const CLARITY_URL =
  "https://www.clarity.ms/export-data/api/v1/project-live-insights";

interface ClaritySnapshot {
  sessions: number;
  bots: number;
  botPct: number;
  humans: number;
  activeSec: number; // avg active seconds / session
  totalSec: number; // avg total seconds / session
  scrollPct: number;
  deadClickPct: number;
  jsErrorPct: number;
  topSources: { name: string; count: number }[];
}

interface SalesSnapshot {
  checkouts: number;
  purchases: number;
  revenue: number; // major units
  currency: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function metric(data: ClarityRow[], name: string): Record<string, unknown> {
  return data.find((m) => m.metricName === name)?.information?.[0] ?? {};
}

interface ClarityRow {
  metricName: string;
  information?: Record<string, unknown>[];
}

/**
 * Clarity either answered or it did not, and the report must be able to tell
 * the difference.
 *
 * Returning `null` for both an unset token and a rejected request is what let
 * a silently broken instrument print "Landing 0" next to a day with real
 * traffic in it. A zero that came from a failed probe is not a measurement,
 * and every line built on it is a fabrication.
 */
type ClarityResult =
  { ok: true; snap: ClaritySnapshot } | { ok: false; reason: string };

async function fetchClarity(days: number): Promise<ClarityResult> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) return { ok: false, reason: "CLARITY_API_TOKEN not set" };
  const res = await fetch(
    `${CLARITY_URL}?numOfDays=${days}&dimension1=Referrer`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    // 401 is a token that belongs to no project (or a different one from the
    // tag on the page); 429 is the 10-requests-per-day export cap. Both look
    // identical to "nobody visited" unless the status is carried through.
    const body = (await res.text().catch(() => "")).slice(0, 100);
    return {
      ok: false,
      reason: `Clarity API ${res.status}${body ? ` - ${body}` : ""}`,
    };
  }
  const data = (await res.json()) as ClarityRow[];

  const traffic = metric(data, "Traffic");
  const sessions = num(traffic.totalSessionCount);
  const bots = num(traffic.totalBotSessionCount);
  // Clarity reports engagement in MINUTES, summed across every session in the
  // window. Divided by sessions and handed straight to `fmtSec` it printed
  // "Active 2s" for a funnel people genuinely spend a minute and a half in —
  // a number wrong by 60x, and wrong in the direction that would have had
  // somebody rewriting a page that was working.
  const eng = metric(data, "EngagementTime");
  const totalTime = num(eng.totalTime) * 60;
  const activeTime = num(eng.activeTime) * 60;

  // Referrer breakdown → top 3 by session count.
  //
  // Clarity hands back `{name: null, sessionsCount: "11"}` for direct traffic.
  // The old fallback took "the first string value on the row", which on that
  // row is the session count itself — so the report's top traffic source was
  // literally named "11", and the INSIGHTS line read "Most traffic: 11 (11)".
  // A null name is direct traffic and nothing else.
  const refRows =
    data.find((m) => m.metricName === "ReferrerUrl")?.information ?? [];

  // Our own host is not a source. Clarity counts the return from Stripe as a
  // referral from /upload, which both outranks real sources and prints a live
  // checkout session id into a Telegram message.
  const ownHost = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/.*/, "")
    .toLowerCase();

  const byHost = new Map<string, number>();
  for (const r of refRows) {
    const raw = typeof r.name === "string" ? r.name : "";
    const count = num(r.totalSessionCount ?? r.sessionsCount ?? r.subTotal);
    if (count <= 0) continue;

    const host = raw
      .replace(/^https?:\/\//, "")
      .replace(/\/.*/, "")
      // `facebook.com`, `l.facebook.com` and `m.facebook.com` are one source
      // split three ways, which is how the real biggest source ended up ranked
      // below a row that did not exist.
      .replace(/^(www|l|lm|m)\./, "")
      .toLowerCase();

    if (!host) {
      byHost.set("direct", (byHost.get("direct") ?? 0) + count);
      continue;
    }
    if (host === ownHost || host === "buy.stripe.com") continue;
    byHost.set(host, (byHost.get(host) ?? 0) + count);
  }

  const topSources = [...byHost]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    ok: true,
    snap: {
      sessions,
      bots,
      botPct: sessions ? (bots / sessions) * 100 : 0,
      humans: sessions - bots,
      activeSec: sessions ? activeTime / sessions : activeTime,
      totalSec: sessions ? totalTime / sessions : totalTime,
      scrollPct: num(metric(data, "ScrollDepth").averageScrollDepth),
      deadClickPct: num(
        metric(data, "DeadClickCount").sessionsWithMetricPercentage,
      ),
      jsErrorPct: num(
        metric(data, "ScriptErrorCount").sessionsWithMetricPercentage,
      ),
      topSources,
    },
  };
}

async function fetchSales(hours: number): Promise<SalesSnapshot | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const sessions = await getStripe().checkout.sessions.list({
    created: { gte: since },
    limit: 100,
  });
  let purchases = 0;
  let revenue = 0;
  let checkouts = 0;
  let currency = "usd";
  for (const s of sessions.data) {
    const email = s.customer_details?.email ?? s.customer_email;
    // Our own testing runs through the real Stripe account, so it is in this
    // list whether or not the matching row was ever deleted from Supabase.
    // Filtering here is the only thing that cleans up the history as well as
    // today, because every figure in this section is read back from Stripe.
    if (isTestAddress(email)) continue;
    checkouts += 1;
    const amount = (s.amount_total ?? 0) / 100;
    if (s.payment_status === "paid" && countsAsSale(email, amount)) {
      purchases += 1;
      revenue += amount;
      currency = s.currency ?? currency;
    }
  }
  return { checkouts, purchases, revenue, currency };
}

function fmtSec(s: number): string {
  const r = Math.round(s);
  if (r < 60) return `${r}s`;
  return `${Math.floor(r / 60)}m ${r % 60}s`;
}

function money(n: number, currency: string): string {
  const sym = currency === "eur" ? "€" : currency === "usd" ? "$" : "";
  return `${sym}${n.toFixed(n % 1 ? 2 : 0)}${sym ? "" : " " + currency.toUpperCase()}`;
}

/** Clarity device split (phone vs computer) via the Device dimension. */
async function fetchDevices(
  days: number,
): Promise<{ mobile: number; desktop: number; tablet: number } | null> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `${CLARITY_URL}?numOfDays=${days}&dimension1=Device`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ClarityRow[];
    const rows =
      data.find((m) => m.metricName === "Device")?.information ??
      data.find((m) => m.metricName === "Traffic")?.information ??
      [];
    let mobile = 0;
    let desktop = 0;
    let tablet = 0;
    for (const r of rows) {
      const name = String(
        r.device ??
          r.Device ??
          r.name ??
          Object.values(r).find((v) => typeof v === "string") ??
          "",
      ).toLowerCase();
      const count = num(r.totalSessionCount ?? r.sessionsCount ?? r.subTotal);
      if (/mobile|phone/.test(name)) mobile += count;
      else if (/tablet|ipad/.test(name)) tablet += count;
      else if (/pc|desktop|computer|windows|mac/.test(name)) desktop += count;
    }
    return { mobile, desktop, tablet };
  } catch {
    return null;
  }
}

/**
 * Dead clicks per page.
 *
 * The aggregate ("18.2% of sessions") says something is unclickable and not
 * where, which is the half that cannot be acted on. Broken out by page it is a
 * work item: a page with few sessions and many dead clicks is broken, and that
 * is invisible in a percentage averaged over the whole site.
 *
 * The URL dimension shatters on query strings — every ad click carries its own
 * `fbclid` and utm set, so the same page comes back as dozens of one-session
 * rows. Grouping by path is what makes the numbers add up, and ids inside the
 * path (order pages) collapse to `*` for the same reason.
 */
async function fetchDeadClicks(
  days: number,
): Promise<{ path: string; clicks: number; sessions: number }[]> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(`${CLARITY_URL}?numOfDays=${days}&dimension1=URL`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ClarityRow[];
    const rows =
      data.find((m) => m.metricName === "DeadClickCount")?.information ?? [];

    const agg = new Map<string, { clicks: number; sessions: number }>();
    for (const r of rows) {
      const url = typeof r.Url === "string" ? r.Url : "";
      if (!url) continue;
      const path =
        url
          .replace(/^https?:\/\/[^/]+/, "")
          .replace(/\?.*$/, "")
          // /order/<uuid> and friends are one page, not forty.
          .replace(/\/[0-9a-f]{8}-[0-9a-f-]{20,}/gi, "/*")
          .replace(/\/\d{4,}/g, "/*") || "/";
      const clicks = num(r.subTotal);
      if (clicks <= 0) continue;
      const cur = agg.get(path) ?? { clicks: 0, sessions: 0 };
      cur.clicks += clicks;
      cur.sessions += num(r.sessionsCount);
      agg.set(path, cur);
    }

    return [...agg]
      .map(([path, v]) => ({ path, ...v }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * The funnel as one line: two rates, and which of them is the constraint.
 *
 * The point is to name the leak, not to print the funnel. Nothing here lists
 * the stages, because a reader who has to find the leak themselves in a row of
 * counts will not, and the section then costs attention without spending it.
 *
 * It reported three rates when the path was intro → six questions → email gate
 * → result. That path is gone: the live funnel is intro → packs → Stripe, so
 * `step_*`, `gate_view` and `lead` are no longer emitted by anything. They were
 * removed rather than left in place because a stage that can only ever be zero
 * prints a confident `Gate 0%` every morning, which is indistinguishable from a
 * gate that is genuinely failing - the exact way `Start 0% · Gate 0% · Buy 0%`
 * shipped once and went unnoticed for weeks against real traffic.
 */
function quizSection(stages: FunnelStage[]): string[] {
  if (stages.length < 2) return [];

  const at = (step: string) =>
    stages.find((s) => s.step === step)?.sessions ?? 0;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  // No stage-by-stage list. Thirteen labels and thirteen numbers on one wrapped
  // line is the part nobody reads twice, and it pushed the two lines that do
  // say something under a wall of figures. The rates and the worst drop are the
  // whole point of the section; the raw counts live in `quiz_events` for
  // anyone who wants to interrogate them.
  const L: string[] = ["*FUNNEL* (24h)"];

  // Two rates that mean different things and have different fixes: whether the
  // ad matched the page, and whether the offer lands once they ask to see it.
  //
  // These keys are the event names `funnelCounts` emits, and nothing else will
  // do: a lookup that misses returns 0, so a wrong key prints a confident
  // "0%" rather than failing, and the report goes on lying every morning until
  // somebody checks it against the raw events. `result_view` is the offer
  // screen - the funnel reuses that key for it, so this rate stays continuous
  // with the history the quiz wrote.
  const landed = at("quiz_start");
  const offer = at("result_view");
  const bought = at("checkout_click");
  const reach = pct(offer, landed);
  const buy = pct(bought, offer);
  L.push(`▶️ Offer ${reach}% · 🛒 Buy ${buy}% (${landed} landed, ${bought} to Stripe)`);

  // Which half to work on. With two stages the arithmetic is small enough to
  // state outright rather than hint at, and saying nothing on a quiet day is
  // worse than saying the funnel is holding.
  if (!landed) {
    L.push("👉 No landings recorded. Check the page tag before reading this.");
  } else if (reach < 40) {
    L.push(
      `👉 The intro is the constraint: ${100 - reach}% leave without asking to see pricing.`,
    );
  } else if (buy < 15) {
    L.push(
      "👉 The intro is doing its job. The offer screen is where they stop.",
    );
  } else {
    L.push("👉 Both halves holding.");
  }
  return L;
}

export async function buildReport(): Promise<string> {
  const [
    clarity,
    sales24,
    sales7,
    devices,
    deadClicks,
    quiz,
    emailsSent,
    converted,
    leads,
  ] = await Promise.all([
    fetchClarity(1).catch((err): ClarityResult => ({
      ok: false,
      reason: String(err).slice(0, 100),
    })),
    fetchSales(24).catch(() => null),
    fetchSales(24 * 7).catch(() => null),
    fetchDevices(1).catch(() => null),
    fetchDeadClicks(3).catch(() => []),
    funnelCounts(24).catch(() => [] as FunnelStage[]),
    sendsInWindow(24).catch(() => 0),
    convertedInWindow(24).catch(() => 0),
    leadCounts().catch(() => null),
  ]);

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vilnius",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  const L: string[] = [];
  // The 7-day total rides on the header rather than sitting in its own block
  // near the bottom. It is the one number that answers "are we selling", and it
  // was the last thing in the message, below three sections about traffic.
  const week7 = sales7
    ? ` · 🗓 *7-DAY*: ${sales7.purchases} buys · ${money(sales7.revenue, sales7.currency)}`
    : "";
  L.push(`🎯 *Tourly* · ${date} · last 24h${week7}`);
  L.push("");

  // FUNNEL
  //
  // Clarity is the sitewide session count, but it is a third-party tag on a
  // third-party API and it is the one input here that can vanish without
  // anything else changing. When it does, the number that replaces it is our
  // own — the quiz landings we count ourselves — and it is labelled, because a
  // quiz-only figure printed as if it were sitewide traffic is the same lie in
  // the other direction.
  const day = clarity.ok ? clarity.snap : null;
  const quizLanded = quiz.find((s) => s.step === "quiz_start")?.sessions ?? 0;
  const landing = day ? day.sessions : quizLanded;
  const landingNote = day ? "" : " (quiz)";
  const checkouts = sales24?.checkouts ?? 0;
  const buys = sales24?.purchases ?? 0;
  const rev = sales24 ? money(sales24.revenue, sales24.currency) : "-";
  const coPct = landing ? Math.round((checkouts / landing) * 100) : 0;
  L.push("*FUNNEL*");
  L.push(
    `👁 Landing ${landing || "n/a"}${landingNote}  →  🛒 Checkout ${checkouts}` +
      // A rate with no denominator is not 0%, it is unknown, and printing it as
      // 0% is what made a day with 35 landings and 2 checkouts read as dead.
      `${landing ? ` (${coPct}%)` : ""}  →  💳 Buys ${buys} · ${rev}`,
  );
  L.push("");

  // QUIZ FUNNEL — the one section that names where to work next.
  const qs = quizSection(quiz);
  if (qs.length) {
    L.push(...qs);
    L.push("");
  }

  // EMAIL — sends that landed today, and who bought after getting one.
  if (emailsSent || converted || leads?.active) {
    L.push("*EMAIL*");
    L.push(
      `📧 Sent ${emailsSent} · 💰 Converted ${converted}` +
        (leads ? ` · 👥 ${leads.active} on sequence` : ""),
    );
    if (leads?.unsubscribed)
      L.push(`🚪 Unsubscribed total ${leads.unsubscribed}`);
    L.push("");
  }

  // BEHAVIOR
  L.push("*BEHAVIOR* (Clarity)");
  if (day && day.sessions > 0) {
    L.push(
      `⏱ Active ${fmtSec(day.activeSec)} · Scroll ${Math.round(day.scrollPct)}% · 👤 ${day.sessions} (bots ${day.botPct.toFixed(0)}%)`,
    );
    if (devices && (devices.mobile || devices.desktop || devices.tablet)) {
      const dv: string[] = [];
      if (devices.desktop) dv.push(`🖥 Desktop ${devices.desktop}`);
      if (devices.mobile) dv.push(`📱 Mobile ${devices.mobile}`);
      if (devices.tablet) dv.push(`▫️ Tablet ${devices.tablet}`);
      L.push(dv.join(" · "));
    }
    if (day.topSources.length) {
      L.push(
        "📈 " + day.topSources.map((s) => `${s.name} ${s.count}`).join(" · "),
      );
    }
    L.push(
      `⚠️ dead-clicks ${day.deadClickPct.toFixed(1)}% · JS-errors ${day.jsErrorPct.toFixed(1)}%`,
    );
    // Only worth the line when it is actually happening. Under 5% of sessions
    // this is background noise on any site and naming a page would invent a
    // job out of it.
    if (day.deadClickPct >= 5 && deadClicks.length) {
      L.push(
        "👆 " +
          deadClicks
            .map((d) => `${d.path} ${d.clicks} in ${d.sessions} sess`)
            .join(" · "),
      );
    }
  } else if (clarity.ok) {
    L.push("- no sessions in the last 24h");
  } else {
    // The instrument is broken, not the traffic. Said plainly, because the
    // previous wording claimed a measurement nobody took, and it read as the
    // most alarming line in the report on a day the funnel was working.
    L.push(`❓ Clarity not reporting - ${clarity.reason}`);
    if (quizLanded) {
      L.push(`   (our own counters saw ${quizLanded} quiz landings)`);
    }
  }
  L.push("");

  // INSIGHTS
  const tips: string[] = [];
  if (checkouts > 0 && buys === 0)
    tips.push(
      `💡 ${checkouts} reached checkout, 0 bought → checkout is the leak`,
    );
  if (day && day.sessions > 0 && day.scrollPct < 40)
    tips.push(
      `💡 Scroll only ${Math.round(day.scrollPct)}% → hero/CTA too low`,
    );
  if (day && day.jsErrorPct > 2)
    tips.push(
      `💡 JS errors on ${day.jsErrorPct.toFixed(1)}% of sessions → check console`,
    );
  if (day && day.topSources[0])
    tips.push(
      `💡 Most traffic: ${day.topSources[0].name} (${day.topSources[0].count})`,
    );
  // Both instruments have to agree. Clarity reading zero on a day our own
  // counters logged landings means Clarity is wrong, not that nobody came.
  if (day && day.sessions === 0 && !quizLanded)
    tips.push("💡 No traffic yet - waiting on ads");
  if (tips.length) {
    L.push(...tips.slice(0, 3));
  }

  return L.join("\n");
}
