import { getStripe } from "./stripe";

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

async function fetchClarity(days: number): Promise<ClaritySnapshot | null> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) return null;
  const res = await fetch(
    `${CLARITY_URL}?numOfDays=${days}&dimension1=Referrer`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Clarity ${res.status}`);
  const data = (await res.json()) as ClarityRow[];

  const traffic = metric(data, "Traffic");
  const sessions = num(traffic.totalSessionCount);
  const bots = num(traffic.totalBotSessionCount);
  const eng = metric(data, "EngagementTime");
  const totalTime = num(eng.totalTime);
  const activeTime = num(eng.activeTime);

  // Referrer breakdown → top 3 by session count.
  const refRows =
    data.find((m) => m.metricName === "ReferrerUrl")?.information ?? [];
  const topSources = refRows
    .map((r) => {
      const name =
        (r.referrerUrl as string) ||
        (r.name as string) ||
        (Object.values(r).find((v) => typeof v === "string") as string) ||
        "direct";
      const count = num(r.totalSessionCount ?? r.sessionsCount ?? r.subTotal);
      return {
        name: String(name)
          .replace(/^https?:\/\/(www\.)?/, "")
          .replace(/\/.*/, ""),
        count,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
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
  let currency = "usd";
  for (const s of sessions.data) {
    if (s.payment_status === "paid") {
      purchases += 1;
      revenue += (s.amount_total ?? 0) / 100;
      currency = s.currency ?? currency;
    }
  }
  return { checkouts: sessions.data.length, purchases, revenue, currency };
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

export async function buildReport(): Promise<string> {
  const [day, week, sales7] = await Promise.all([
    fetchClarity(1).catch(() => null),
    fetchSales(24).catch(() => null),
    fetchSales(24 * 7).catch(() => null),
  ]);

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vilnius",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  const L: string[] = [];
  L.push(`🎯 *Tourly* · ${date} · last 24h`);
  L.push("");

  // FUNNEL
  const landing = day?.sessions ?? 0;
  const checkouts = week?.checkouts ?? 0;
  const buys = week?.purchases ?? 0;
  const rev = week ? money(week.revenue, week.currency) : "—";
  const coPct = landing ? Math.round((checkouts / landing) * 100) : 0;
  L.push("*FUNNEL*");
  L.push(
    `👁 Landing ${landing}  →  🛒 Checkout ${checkouts} (${coPct}%)  →  💳 Buys ${buys} · ${rev}`,
  );
  L.push("");

  // BEHAVIOR
  L.push("*BEHAVIOR* (Clarity)");
  if (day && day.sessions > 0) {
    L.push(
      `⏱ Active ${fmtSec(day.activeSec)} · Scroll ${Math.round(day.scrollPct)}% · 👤 ${day.sessions} (bots ${day.botPct.toFixed(0)}%)`,
    );
    if (day.topSources.length) {
      L.push(
        "📈 " + day.topSources.map((s) => `${s.name} ${s.count}`).join(" · "),
      );
    }
    L.push(
      `⚠️ dead-clicks ${day.deadClickPct.toFixed(1)}% · JS-errors ${day.jsErrorPct.toFixed(1)}%`,
    );
  } else {
    L.push("— no sessions in the last 24h");
  }
  L.push("");

  // 7-DAY
  if (sales7) {
    L.push(
      `🗓 *7-DAY*: ${sales7.purchases} buys · ${money(sales7.revenue, sales7.currency)}`,
    );
    L.push("");
  }

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
  if (day && day.sessions === 0)
    tips.push("💡 No traffic yet — waiting on ads");
  if (tips.length) {
    L.push(...tips.slice(0, 3));
  }

  return L.join("\n");
}
