import { put, list } from '@vercel/blob';
import type { Order } from './types';

const PREFIX = 'orders/';

export async function createOrder(order: Order): Promise<Order> {
  await put(`${PREFIX}${order.id}.json`, JSON.stringify(order), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
  return order;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}${orderId}` });
    if (!blobs.length) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
  const existing = await getOrder(orderId);
  if (!existing) throw new Error(`Order ${orderId} not found`);
  const updated: Order = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await put(`${PREFIX}${orderId}.json`, JSON.stringify(updated), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
  return updated;
}
