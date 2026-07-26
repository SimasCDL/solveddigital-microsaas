import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Order } from './types';
import { sbFetch, supabaseConfigured } from './supabase';

// Orders live in Supabase (table `orders`) so support can look any customer up
// in the dashboard. The local copy is a best-effort cache/fallback — it uses the
// OS temp dir because serverless filesystems (Vercel) are read-only except /tmp,
// and all local writes are non-fatal so a read-only FS never breaks an order.
const LOCAL_DIR = path.join(os.tmpdir(), 'tourly-orders');

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
  // Best-effort only — never let a read-only FS (serverless) break the request.
  try {
    if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_DIR, `${order.id}.json`), JSON.stringify(order));
  } catch (err) {
    console.error('[orders] local write skipped (read-only FS?):', err);
  }
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
  if (supabaseConfigured()) {
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
  if (supabaseConfigured()) {
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
  if (supabaseConfigured()) {
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
  if (supabaseConfigured()) {
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
