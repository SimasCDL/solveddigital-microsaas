/** Shared Supabase REST helpers — service-role key, server-side only. */

/** Named so it doesn't read as a React hook (`use*`) to the lint rules. */
export const supabaseConfigured = () =>
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function sbFetch(
  pathname: string,
  init?: RequestInit & { headers?: Record<string, string> },
) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1${pathname}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}
