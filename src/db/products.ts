import { getDB, type Product } from './db';

/** Inserta un producto nuevo. Devuelve el id asignado. */
export async function addProduct(product: Omit<Product, 'id'>): Promise<number> {
  const db = await getDB();
  const id = await db.add('products', product as Product);
  return id as number;
}

/** Devuelve todos los productos ordenados por nombre. */
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  const all = await db.getAll('products');
  return all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Actualiza un producto existente (debe traer id). */
export async function updateProduct(product: Product): Promise<void> {
  if (product.id == null) throw new Error('updateProduct: el producto no tiene id');
  const db = await getDB();
  await db.put('products', product);
}

/** Elimina un producto por id. */
export async function deleteProduct(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('products', id);
}

/** Busca productos cuyo código o nombre contengan el término (sin distinguir mayúsculas). */
export async function searchProducts(term: string): Promise<Product[]> {
  const all = await getAllProducts();
  const q = term.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (p) =>
      p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  );
}

/** Cuenta cuántos productos hay (para decidir si se ejecuta el seed). */
export async function countProducts(): Promise<number> {
  const db = await getDB();
  return db.count('products');
}
