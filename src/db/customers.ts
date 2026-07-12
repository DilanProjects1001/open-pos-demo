import { getDB, type Customer, type Sale } from './db';

/** Alta o actualización de un cliente. */
export async function saveCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  await db.put('customers', customer);
}

/** Crea un cliente nuevo con valores por defecto (saldo 0, puntos 0). */
export function newCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'balanceCents' | 'points'> & Partial<Pick<Customer, 'balanceCents' | 'points'>>): Customer {
  return {
    id: crypto.randomUUID(),
    balanceCents: data.balanceCents ?? 0,
    points: data.points ?? 0,
    createdAt: Date.now(),
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  const all = await db.getAll('customers');
  return all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const db = await getDB();
  return db.get('customers', id);
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('customers', id);
}

export async function countCustomers(): Promise<number> {
  const db = await getDB();
  return db.count('customers');
}

/** Ajusta puntos y saldo de un cliente (deltas pueden ser negativos). */
export async function adjustCustomer(
  id: string,
  deltaPoints: number,
  deltaBalanceCents: number,
): Promise<Customer | null> {
  const db = await getDB();
  const c = await db.get('customers', id);
  if (!c) return null;
  const updated: Customer = {
    ...c,
    points: Math.max(0, c.points + deltaPoints),
    balanceCents: c.balanceCents + deltaBalanceCents,
  };
  await db.put('customers', updated);
  return updated;
}

/** Historial de compras (ventas) de un cliente, más recientes primero. */
export async function getCustomerSales(customerId: string): Promise<Sale[]> {
  const db = await getDB();
  const sales = await db.getAllFromIndex('sales', 'by-customer', customerId);
  return sales.sort((a, b) => b.timestamp - a.timestamp);
}
