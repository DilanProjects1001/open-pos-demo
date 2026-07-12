import { getDB, type Layaway } from './db';

export async function saveLayaway(layaway: Layaway): Promise<void> {
  const db = await getDB();
  await db.put('layaways', layaway);
}

export async function getAllLayaways(): Promise<Layaway[]> {
  const db = await getDB();
  const all = await db.getAll('layaways');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLayaway(id: string): Promise<Layaway | undefined> {
  const db = await getDB();
  return db.get('layaways', id);
}

export async function countLayaways(): Promise<number> {
  const db = await getDB();
  return db.count('layaways');
}

/** Registra un abono. Si con el abono se liquida, marca el apartado como 'settled'. */
export async function addLayawayPayment(
  id: string,
  amountCents: number,
): Promise<Layaway | null> {
  const db = await getDB();
  const l = await db.get('layaways', id);
  if (!l || l.status !== 'open') return l ?? null;
  const paidCents = Math.min(l.totalCents, l.paidCents + amountCents);
  const updated: Layaway = {
    ...l,
    paidCents,
    payments: [...l.payments, { amountCents, timestamp: Date.now() }],
    status: paidCents >= l.totalCents ? 'settled' : 'open',
  };
  await db.put('layaways', updated);
  return updated;
}

/** Cancela un apartado abierto. */
export async function cancelLayaway(id: string): Promise<Layaway | null> {
  const db = await getDB();
  const l = await db.get('layaways', id);
  if (!l || l.status !== 'open') return l ?? null;
  const updated: Layaway = { ...l, status: 'cancelled' };
  await db.put('layaways', updated);
  return updated;
}

/** Saldo pendiente de un apartado (centavos). PURA. */
export function layawayBalance(l: Layaway): number {
  return Math.max(0, l.totalCents - l.paidCents);
}
