import { getDB, type ReturnRecord } from './db';

/**
 * Registra una devolución (insert-only) y REPONE el stock de los productos
 * devueltos, en una transacción atómica. El importe reembolsado (refundCents)
 * se descuenta de la caja al resumir el turno (ver summarizeSession).
 */
export async function addReturn(record: ReturnRecord): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['returns', 'products'], 'readwrite');
  await tx.objectStore('returns').put(record);
  const products = tx.objectStore('products');
  for (const item of record.items) {
    const id = Number(item.productId);
    const product = await products.get(id);
    if (product) {
      product.stock += item.quantity;
      await products.put(product);
    }
  }
  await tx.done;
}

export async function getAllReturns(): Promise<ReturnRecord[]> {
  const db = await getDB();
  const all = await db.getAll('returns');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function countReturns(): Promise<number> {
  const db = await getDB();
  return db.count('returns');
}
