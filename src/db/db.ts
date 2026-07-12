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
  // Fidelización (opcional): cliente asociado y puntos.
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountCents?: number;
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

// --- Clientes ---
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balanceCents: number; // saldo a favor / crédito (centavos)
  points: number; // puntos de fidelización
  createdAt: number;
}

// --- Proveedores ---
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  products: string; // productos que suministra (texto libre)
  createdAt: number;
}

// --- Compras / entradas de mercancía (insert-only) ---
export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  costCents: number; // costo unitario en centavos
  subtotalCents: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCents: number;
  operatorId: string;
  timestamp: number;
}

// --- Apartados (layaways) ---
export interface LayawayPayment {
  amountCents: number;
  timestamp: number;
}

export interface Layaway {
  id: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  totalCents: number;
  paidCents: number;
  status: 'open' | 'settled' | 'cancelled';
  payments: LayawayPayment[];
  createdAt: number;
}

// --- Devoluciones ---
export interface ReturnRecord {
  id: string;
  saleId: string;
  items: SaleItem[];
  refundCents: number;
  method: PaymentMethod;
  operatorId: string;
  reason: string;
  timestamp: number;
}

// --- Configuración (fidelización) ---
export interface LoyaltyConfig {
  id: 'loyalty';
  earnPerCents: number; // centavos gastados para ganar 1 punto (1000 = $10)
  redeemValueCents: number; // valor de 1 punto al canjear (100 = $1)
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
    indexes: { 'by-timestamp': number; 'by-customer': string };
  };
  cashSessions: {
    key: string;
    value: CashSession;
    indexes: { 'by-status': string };
  };
  customers: { key: string; value: Customer; indexes: { 'by-name': string } };
  suppliers: { key: string; value: Supplier; indexes: { 'by-name': string } };
  purchases: { key: string; value: Purchase; indexes: { 'by-timestamp': number } };
  layaways: {
    key: string;
    value: Layaway;
    indexes: { 'by-status': string; 'by-customer': string };
  };
  returns: { key: string; value: ReturnRecord; indexes: { 'by-timestamp': number } };
  settings: { key: string; value: LoyaltyConfig };
}

const DB_NAME = 'openpos';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<OpenPosDB>> | null = null;

/** Abre (una sola vez) la base de datos IndexedDB de OpenPOS. */
export function getDB(): Promise<IDBPDatabase<OpenPosDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OpenPosDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
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
        // v3: clientes, proveedores, compras, apartados, devoluciones, ajustes
        if (oldVersion < 3) {
          // Añade índice by-customer al store de ventas (creado en v1/v2 o arriba).
          const sales = transaction.objectStore('sales');
          if (!sales.indexNames.contains('by-customer')) {
            sales.createIndex('by-customer', 'customerId');
          }
          const customers = db.createObjectStore('customers', { keyPath: 'id' });
          customers.createIndex('by-name', 'name');
          const suppliers = db.createObjectStore('suppliers', { keyPath: 'id' });
          suppliers.createIndex('by-name', 'name');
          const purchases = db.createObjectStore('purchases', { keyPath: 'id' });
          purchases.createIndex('by-timestamp', 'timestamp');
          const layaways = db.createObjectStore('layaways', { keyPath: 'id' });
          layaways.createIndex('by-status', 'status');
          layaways.createIndex('by-customer', 'customerId');
          const returns = db.createObjectStore('returns', { keyPath: 'id' });
          returns.createIndex('by-timestamp', 'timestamp');
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
