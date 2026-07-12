import { getDB, type CashSession, type Product, type Sale, type SaleItem, type Payment } from './db';
import { countProducts, getAllProducts } from './products';
import { countSales, getAllSales } from './sales';
import { countCashSessions, summarizeSession } from './cash';

// Datos semilla ficticios. Precios en CENTAVOS (ej. 8500 = $85.00).
const SEED_PRODUCTS: Omit<Product, 'id'>[] = [
  { code: '7501000000012', name: 'Café 250g', category: 'Abarrotes', price: 8500, stock: 40 },
  { code: '7501000000029', name: 'Playera M', category: 'Ropa', price: 25000, stock: 25 },
  { code: '7501000000036', name: 'Leche 1L', category: 'Lácteos', price: 2400, stock: 60 },
  { code: '7501000000043', name: 'Pan blanco', category: 'Panadería', price: 1800, stock: 35 },
  { code: '7501000000050', name: 'Arroz 1kg', category: 'Abarrotes', price: 3200, stock: 50 },
  { code: '7501000000067', name: 'Frijol 500g', category: 'Abarrotes', price: 2800, stock: 45 },
  { code: '7501000000074', name: 'Aceite', category: 'Abarrotes', price: 4500, stock: 30 },
  { code: '7501000000081', name: 'Huevos 12pz', category: 'Abarrotes', price: 3600, stock: 55 },
  { code: '7501000000098', name: 'Jabón', category: 'Higiene', price: 1500, stock: 70 },
  { code: '7501000000104', name: 'Cepillo dental', category: 'Higiene', price: 2000, stock: 65 },
];

/**
 * Inserta los productos de ejemplo SOLO si la base está vacía.
 * Devuelve true si sembró datos, false si ya había productos.
 */
export async function ensureSeed(): Promise<boolean> {
  const existing = await countProducts();
  if (existing > 0) {
    await ensureSalesSeed();
    await ensureCashSeed();
    return false;
  }

  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all(SEED_PRODUCTS.map((p) => tx.store.add(p as Product)));
  await tx.done;

  await ensureSalesSeed();
  await ensureCashSeed();
  return true;
}

const DAY = 24 * 60 * 60 * 1000;

// Construye una venta a partir de líneas [producto, cantidad] y métodos de pago.
function buildSale(
  products: Product[],
  lines: [name: string, qty: number][],
  operatorId: string,
  daysAgo: number,
  makePayments: (total: number) => Payment[],
): Sale | null {
  const items: SaleItem[] = [];
  for (const [name, qty] of lines) {
    const p = products.find((x) => x.name === name);
    if (!p || p.id == null) return null;
    items.push({
      productId: String(p.id),
      name: p.name,
      priceCents: p.price,
      quantity: qty,
      subtotalCents: p.price * qty,
    });
  }
  const totalCents = items.reduce((s, i) => s + i.subtotalCents, 0);
  const payments = makePayments(totalCents);
  const paid = payments.reduce((s, pmt) => s + pmt.amountCents, 0);
  const cashPaid = payments
    .filter((pmt) => pmt.method === 'cash')
    .reduce((s, pmt) => s + pmt.amountCents, 0);
  const changeCents = cashPaid > 0 ? Math.max(0, paid - totalCents) : 0;
  return {
    id: crypto.randomUUID(),
    items,
    totalCents,
    payments,
    changeCents,
    operatorId,
    timestamp: Date.now() - daysAgo * DAY,
  };
}

/** Inserta ventas de ejemplo SOLO si no hay ventas todavía. */
export async function ensureSalesSeed(): Promise<boolean> {
  const existing = await countSales();
  if (existing > 0) return false;

  const products = await getAllProducts();
  if (products.length === 0) return false;

  const drafts: (Sale | null)[] = [
    // 1) Efectivo con cambio
    buildSale(products, [['Café 250g', 1], ['Leche 1L', 2]], 'cajero', 0, (t) => [
      { method: 'cash', amountCents: Math.ceil((t + 500) / 100) * 100 },
    ]),
    // 2) Solo tarjeta
    buildSale(products, [['Playera M', 1]], 'gerente', 1, (t) => [
      { method: 'card', amountCents: t },
    ]),
    // 3) Pago mixto efectivo + tarjeta
    buildSale(products, [['Arroz 1kg', 2], ['Frijol 500g', 1], ['Aceite', 1]], 'cajero', 2, (t) => [
      { method: 'cash', amountCents: 10000 },
      { method: 'card', amountCents: t - 10000 },
    ]),
    // 4) Transferencia
    buildSale(products, [['Huevos 12pz', 3], ['Pan blanco', 2]], 'admin', 3, (t) => [
      { method: 'transfer', amountCents: t },
    ]),
    // 5) Efectivo exacto
    buildSale(products, [['Jabón', 2], ['Cepillo dental', 2]], 'cajero', 5, (t) => [
      { method: 'cash', amountCents: t },
    ]),
  ];

  const sales = drafts.filter((s): s is Sale => s !== null);
  const db = await getDB();
  const tx = db.transaction('sales', 'readwrite');
  await Promise.all(sales.map((s) => tx.store.put(s)));
  await tx.done;
  return sales.length > 0;
}

/**
 * Inserta un turno de caja CERRADO de ejemplo SOLO si no hay turnos todavía.
 * Cubre las ventas históricas (las de más de 12 h de antigüedad) y "cuadra":
 * el efectivo final se fija al esperado.
 */
export async function ensureCashSeed(): Promise<boolean> {
  const existing = await countCashSessions();
  if (existing > 0) return false;

  const sales = await getAllSales();
  const cutoff = Date.now() - 0.5 * DAY; // ventas de hace más de 12 h
  const past = sales.filter((s) => s.timestamp <= cutoff);
  if (past.length === 0) return false;

  const firstSale = Math.min(...past.map((s) => s.timestamp));
  const base: CashSession = {
    id: crypto.randomUUID(),
    openedAt: firstSale - 60 * 60 * 1000, // 1 h antes de la primera venta
    closedAt: cutoff,
    initialCashCents: 50000, // $500.00 de fondo inicial
    finalCashCents: null,
    status: 'closed',
    operatorId: 'gerente',
  };
  const summary = summarizeSession(base, sales);
  const session: CashSession = { ...base, finalCashCents: summary.expectedCashCents };

  const db = await getDB();
  await db.put('cashSessions', session);
  return true;
}
