import { getDB, type Sale } from './db';

/** Guarda una venta en IndexedDB. */
export async function addSale(sale: Sale): Promise<void> {
  const db = await getDB();
  await db.put('sales', sale);
}

/** Devuelve todas las ventas ordenadas de la más reciente a la más antigua. */
export async function getAllSales(): Promise<Sale[]> {
  const db = await getDB();
  const all = await db.getAll('sales');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

/** Cuenta cuántas ventas hay (para decidir si se ejecuta el seed). */
export async function countSales(): Promise<number> {
  const db = await getDB();
  return db.count('sales');
}
