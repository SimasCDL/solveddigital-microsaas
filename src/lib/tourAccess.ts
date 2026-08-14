import { createHmac, timingSafeEqual } from "crypto";

/**
 * Capability tokens for the customer's tour library at /tours.
 *
 * "Show me every order for this email" is the one query that must never run on
 * an address somebody merely typed — it would turn a guessable email into a
 * list of a stranger's listings and their videos. So the token is mailed to the
 * address itself, and holding it is the proof of ownership. There is no
 * password, no account, and no session table.
 *
 * Signed rather than stored: the payload carries the email and an expiry, and
 * the HMAC is what makes it unforgeable. That keeps the whole feature to zero
 * new tables, which matters in a codebase where the last missing table silently
 * ate every lead for four days.
 */

const TOKEN_TTL_DAYS = 30;

/**
 * Signing secret, in order of preference.
 *
 * Falls back through secrets that are already required in production rather
 * than adding a fourth thing to forget. Returns null when none is set, and
 * every caller then fails CLOSED — an unsigned library is worse than no
 * library, because it hands out other people's orders.
 */
function secret(): string | null {
  return (
    process.env.TOUR_LINK_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

const b64url = (b: Buffer) => b.toString("base64url");

function sign(payload: string, key: string): string {
  return b64url(createHmac("sha256", key).update(payload).digest());
}

/** A token for this address, or null when no signing secret is configured. */
export function createTourToken(email: string): string | null {
  const key = secret();
  if (!key) {
    console.error("[tourAccess] no signing secret — refusing to mint a token");
    return null;
  }
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        e: email.trim().toLowerCase(),
        x: Date.now() + TOKEN_TTL_DAYS * 24 * 3600_000,
      }),
    ),
  );
  return `${payload}.${sign(payload, key)}`;
}

/**
 * The address this token proves ownership of, or null if it proves nothing.
 *
 * Null on: no secret configured, malformed token, bad signature, or expiry
 * passed. The caller must treat null as "show the request-a-link form", never
 * as "show everything".
 */
export function readTourToken(token: string): string | null {
  const key = secret();
  if (!key || !token) return null;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  // Constant-time compare so a wrong signature cannot be narrowed down by
  // timing one guess against the next.
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const { e, x } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { e?: string; x?: number };
    if (!e || typeof x !== "number" || Date.now() > x) return null;
    return e;
  } catch {
    return null;
  }
}
