import * as fs from 'fs';
import * as path from 'path';
import type { Order } from './types';

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), '.orders');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

export async function createOrder(order: Order): Promise<Order> {
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob');
    await put(`orders/${order.id}.json`, JSON.stringify(order), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } else {
    ensureLocalDir();
    fs.writeFileSync(path.join(LOCAL_DIR, `${order.id}.json`), JSON.stringify(order));
  }
  return order;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  if (USE_BLOB) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: `orders/${orderId}` });
      if (!blobs.length) return null;
      const res = await fetch(blobs[0].url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  } else {
    try {
      const data = fs.readFileSync(path.join(LOCAL_DIR, `${orderId}.json`), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
  const existing = await getOrder(orderId);
  if (!existing) throw new Error(`Order ${orderId} not found`);
  const updated: Order = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob');
    await put(`orders/${updated.id}.json`, JSON.stringify(updated), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } else {
    ensureLocalDir();
    fs.writeFileSync(path.join(LOCAL_DIR, `${updated.id}.json`), JSON.stringify(updated));
  }
  return updated;
}
