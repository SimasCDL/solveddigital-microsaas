import * as fs from 'fs';
import * as path from 'path';
import type { Order } from './types';

// Orders live in Supabase (table `orders`) so support can look any customer up
// in the dashboard; local .orders/ is the fallback when Supabase is unreachable
// (and doubles as dev storage before the table exists).
const LOCAL_DIR = path.join(process.cwd(), '.orders');

const useSupabase = () =>
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sbFetch(pathname: string, init?: RequestInit & { headers?: Record<string, string> }) {
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

interface OrderRow {
  id: string;
  email: string;
  property_address: string;
  photo_urls: string[];
  video_urls: string[];
  music: boolean;
  status: Order['status'];
  stripe_session_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const toRow = (o: Order): OrderRow => ({
  id: o.id,
  email: o.email,
  property_address: o.propertyAddress,
  photo_urls: o.photoUrls,
  video_urls: o.videoUrls ?? [],
  music: o.music ?? false,
  status: o.status,
  stripe_session_id: o.stripeSessionId ?? null,
  error_message: o.errorMessage ?? null,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
});

const fromRow = (r: OrderRow): Order => ({
  id: r.id,
  email: r.email,
  propertyAddress: r.property_address,
  photoUrls: r.photo_urls ?? [],
  videoUrls: r.video_urls ?? [],
  music: r.music ?? false,
  status: r.status,
  stripeSessionId: r.stripe_session_id ?? undefined,
  errorMessage: r.error_message ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function writeLocal(order: Order) {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, `${order.id}.json`), JSON.stringify(order));
}

function readLocal(orderId: string): Order | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, `${orderId}.json`), 'utf-8'));
  } catch {
    return null;
  }
}

export async function createOrder(order: Order): Promise<Order> {
  // local copy always — cheap insurance against Supabase hiccups mid-order
  writeLocal(order);
  if (useSupabase()) {
    try {
      await sbFetch('/orders', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(toRow(order)),
      });
    } catch (err) {
      console.error('[orders] Supabase create failed, local copy kept:', err);
    }
  }
  return order;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  if (useSupabase()) {
    try {
      const res = await sbFetch(`/orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`);
      const rows: OrderRow[] = await res.json();
      if (rows.length) return fromRow(rows[0]);
    } catch (err) {
      console.error('[orders] Supabase read failed, trying local:', err);
    }
  }
  return readLocal(orderId);
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
  const existing = await getOrder(orderId);
  if (!existing) throw new Error(`Order ${orderId} not found`);
  const updated: Order = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  writeLocal(updated);
  if (useSupabase()) {
    try {
      await sbFetch('/orders', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(toRow(updated)),
      });
    } catch (err) {
      console.error('[orders] Supabase update failed, local copy kept:', err);
    }
  }
  return updated;
}

/** How many orders (any status except pending_payment) already used this Stripe
 *  session — enforces single-use (or 3-use for the multi-video pack) sessions. */
export async function countOrdersBySession(sessionId: string): Promise<number> {
  if (useSupabase()) {
    try {
      const res = await sbFetch(
        `/orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&status=neq.pending_payment&select=id`
      );
      const rows: Array<{ id: string }> = await res.json();
      return rows.length;
    } catch (err) {
      console.error('[orders] Supabase session count failed, scanning local:', err);
    }
  }
  try {
    const files = fs.readdirSync(LOCAL_DIR).filter(f => f.endsWith('.json'));
    let count = 0;
    for (const f of files) {
      try {
        const o: Order = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, f), 'utf-8'));
        if (o.stripeSessionId === sessionId && o.status !== 'pending_payment') count++;
      } catch { /* not an order file */ }
    }
    return count;
  } catch {
    return 0;
  }
}
