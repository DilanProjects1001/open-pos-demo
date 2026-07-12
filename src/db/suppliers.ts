import { getDB, type Supplier } from './db';

export function newSupplier(data: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
  return { id: crypto.randomUUID(), createdAt: Date.now(), ...data };
}

export async function saveSupplier(supplier: Supplier): Promise<void> {
  const db = await getDB();
  await db.put('suppliers', supplier);
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDB();
  const all = await db.getAll('suppliers');
  return all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function deleteSupplier(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('suppliers', id);
}

export async function countSuppliers(): Promise<number> {
  const db = await getDB();
  return db.count('suppliers');
}
