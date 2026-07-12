import { getDB, type Purchase } from './db';

/**
 * Registra una compra a proveedor (movimiento insert-only) e incrementa el stock
 * de los productos comprados, todo en una sola transacción atómica.
 */
export async function addPurchase(purchase: Purchase): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['purchases', 'products'], 'readwrite');
  await tx.objectStore('purchases').put(purchase);
  const products = tx.objectStore('products');
  for (const item of purchase.items) {
    const id = Number(item.productId);
    const product = await products.get(id);
    if (product) {
      product.stock += item.quantity;
      await products.put(product);
    }
  }
  await tx.done;
}

export async function getAllPurchases(): Promise<Purchase[]> {
  const db = await getDB();
  const all = await db.getAll('purchases');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function countPurchases(): Promise<number> {
  const db = await getDB();
  return db.count('purchases');
}
