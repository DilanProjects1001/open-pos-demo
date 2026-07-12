import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Esquema de un producto del catálogo.
// price y stock son enteros; price está SIEMPRE en centavos (2500 = $25.00).
export interface Product {
  id?: number; // autoincremental (lo asigna IndexedDB)
  code: string; // código de barras
  name: string;
  category: string;
  price: number; // centavos
  stock: number;
  image?: string; // URL opcional
}

// --- Ventas (POS) ---
export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface SaleItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface Payment {
  method: PaymentMethod;
  amountCents: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  totalCents: number;
  payments: Payment[];
  changeCents: number;
  operatorId: string;
  timestamp: number;
}

// --- Caja (turnos) ---
export interface CashSession {
  id: string;
  openedAt: number;
  closedAt: number | null;
  initialCashCents: number;
  finalCashCents: number | null;
  status: 'open' | 'closed';
  operatorId: string;
}

interface OpenPosDB extends DBSchema {
  products: {
    key: number;
    value: Product;
    indexes: { 'by-code': string; 'by-name': string };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: { 'by-timestamp': number };
  };
  cashSessions: {
    key: string;
    value: CashSession;
    indexes: { 'by-status': string };
  };
}

const DB_NAME = 'openpos';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<OpenPosDB>> | null = null;

/** Abre (una sola vez) la base de datos IndexedDB de OpenPOS. */
export function getDB(): Promise<IDBPDatabase<OpenPosDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OpenPosDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: catálogo de productos
        if (oldVersion < 1) {
          const store = db.createObjectStore('products', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-code', 'code');
          store.createIndex('by-name', 'name');
        }
        // v2: ventas y turnos de caja
        if (oldVersion < 2) {
          const sales = db.createObjectStore('sales', { keyPath: 'id' });
          sales.createIndex('by-timestamp', 'timestamp');
          const cash = db.createObjectStore('cashSessions', { keyPath: 'id' });
          cash.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
}
