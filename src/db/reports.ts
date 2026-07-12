import type { Sale } from './db';

// Agregaciones para el dashboard de reportes. Funciones PURAS (sin IndexedDB) y
// con el dinero siempre en centavos, para poder reutilizarlas y testearlas.

const DAY = 24 * 60 * 60 * 1000;

export interface DayBucket {
  label: string; // "dd/mm"
  totalCents: number;
}

/** Total vendido por día durante los últimos `days` días (incluye hoy). */
export function salesPerDay(sales: Sale[], days = 7, now = Date.now()): DayBucket[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startToday = today.getTime();
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startToday - i * DAY;
    const dayEnd = dayStart + DAY;
    const totalCents = sales
      .filter((s) => s.timestamp >= dayStart && s.timestamp < dayEnd)
      .reduce((sum, s) => sum + s.totalCents, 0);
    const d = new Date(dayStart);
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ label, totalCents });
  }
  return buckets;
}

export interface ProductCount {
  name: string;
  quantity: number;
  totalCents: number;
}

/** Productos más vendidos por cantidad (top `n`). */
export function topProducts(sales: Sale[], n = 5): ProductCount[] {
  const map = new Map<string, ProductCount>();
  for (const sale of sales) {
    for (const it of sale.items) {
      const cur = map.get(it.productId) ?? { name: it.name, quantity: 0, totalCents: 0 };
      cur.name = it.name;
      cur.quantity += it.quantity;
      cur.totalCents += it.subtotalCents;
      map.set(it.productId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, n);
}

export interface MethodTotals {
  count: number;
  totalCents: number;
  cashCents: number;
  cardCents: number;
  transferCents: number;
}

/** Totales por forma de pago sobre un conjunto de ventas. */
export function methodTotals(sales: Sale[]): MethodTotals {
  const t: MethodTotals = {
    count: sales.length,
    totalCents: 0,
    cashCents: 0,
    cardCents: 0,
    transferCents: 0,
  };
  for (const sale of sales) {
    t.totalCents += sale.totalCents;
    for (const p of sale.payments) {
      if (p.method === 'cash') t.cashCents += p.amountCents;
      else if (p.method === 'card') t.cardCents += p.amountCents;
      else t.transferCents += p.amountCents;
    }
  }
  return t;
}
