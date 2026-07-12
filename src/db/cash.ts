import { getDB, type CashSession, type ReturnRecord, type Sale } from './db';
import { getAllSales } from './sales';
import { getAllReturns } from './returns';

/** Resumen (corte) de un turno de caja. Todos los montos en centavos. */
export interface SessionSummary {
  salesCount: number;
  totalCents: number;
  cashCents: number; // efectivo recibido (incluye lo que luego se devuelve como cambio)
  cardCents: number;
  transferCents: number;
  changeCents: number; // cambio entregado en efectivo
  refundsCashCents: number; // devoluciones pagadas en efectivo (egreso de caja)
  expectedCashCents: number; // inicial + efectivo - cambio - devoluciones en efectivo
}

/** Devuelve las ventas que pertenecen a un turno (por rango de fechas). PURA. */
export function filterSessionSales(session: CashSession, sales: Sale[]): Sale[] {
  const end = session.closedAt ?? Number.POSITIVE_INFINITY;
  return sales.filter((s) => s.timestamp >= session.openedAt && s.timestamp <= end);
}

/** Devuelve las devoluciones que pertenecen a un turno (por rango de fechas). PURA. */
export function filterSessionReturns(
  session: CashSession,
  returns: ReturnRecord[],
): ReturnRecord[] {
  const end = session.closedAt ?? Number.POSITIVE_INFINITY;
  return returns.filter((r) => r.timestamp >= session.openedAt && r.timestamp <= end);
}

/**
 * Calcula el resumen de un turno a partir de sus ventas (y devoluciones). PURA.
 * Las devoluciones pagadas en efectivo se restan del efectivo esperado en caja.
 */
export function summarizeSession(
  session: CashSession,
  sales: Sale[],
  returns: ReturnRecord[] = [],
): SessionSummary {
  const inTurn = filterSessionSales(session, sales);
  let cashCents = 0;
  let cardCents = 0;
  let transferCents = 0;
  let changeCents = 0;
  let totalCents = 0;
  for (const sale of inTurn) {
    totalCents += sale.totalCents;
    changeCents += sale.changeCents;
    for (const p of sale.payments) {
      if (p.method === 'cash') cashCents += p.amountCents;
      else if (p.method === 'card') cardCents += p.amountCents;
      else transferCents += p.amountCents;
    }
  }
  const refundsCashCents = filterSessionReturns(session, returns)
    .filter((r) => r.method === 'cash')
    .reduce((sum, r) => sum + r.refundCents, 0);
  const expectedCashCents =
    session.initialCashCents + cashCents - changeCents - refundsCashCents;
  return {
    salesCount: inTurn.length,
    totalCents,
    cashCents,
    cardCents,
    transferCents,
    changeCents,
    refundsCashCents,
    expectedCashCents,
  };
}

/** Abre un nuevo turno de caja con el efectivo inicial (en centavos). */
export async function createCashSession(
  operatorId: string,
  initialCashCents: number,
): Promise<CashSession> {
  const session: CashSession = {
    id: crypto.randomUUID(),
    openedAt: Date.now(),
    closedAt: null,
    initialCashCents,
    finalCashCents: null,
    status: 'open',
    operatorId,
  };
  const db = await getDB();
  await db.put('cashSessions', session);
  return session;
}

/** Devuelve el turno de caja abierto (si existe) o null. */
export async function getActiveCashSession(): Promise<CashSession | null> {
  const db = await getDB();
  const open = await db.getAllFromIndex('cashSessions', 'by-status', 'open');
  // Puede haber a lo más uno abierto; si hay varios, se toma el más reciente.
  if (open.length === 0) return null;
  return open.sort((a, b) => b.openedAt - a.openedAt)[0];
}

/** Devuelve los turnos cerrados, del más reciente al más antiguo. */
export async function getClosedSessions(): Promise<CashSession[]> {
  const db = await getDB();
  const closed = await db.getAllFromIndex('cashSessions', 'by-status', 'closed');
  return closed.sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
}

/** Cuenta cuántos turnos de caja hay (para decidir si se ejecuta el seed). */
export async function countCashSessions(): Promise<number> {
  const db = await getDB();
  return db.count('cashSessions');
}

/**
 * Cierra un turno de caja: fija el efectivo final y marca 'closed'.
 * Si el turno ya está cerrado, NO se modifica (se devuelve tal cual): un corte
 * cerrado es inmutable. Devuelve null si el turno no existe.
 */
export async function closeCashSession(
  id: string,
  finalCashCents: number,
): Promise<CashSession | null> {
  const db = await getDB();
  const session = await db.get('cashSessions', id);
  if (!session) return null;
  if (session.status === 'closed') return session; // inmutable: no se reabre ni modifica
  const updated: CashSession = {
    ...session,
    finalCashCents,
    closedAt: Date.now(),
    status: 'closed',
  };
  await db.put('cashSessions', updated);
  return updated;
}

/** Lee el resumen de un turno desde IndexedDB (comodidad para la UI). */
export async function getSessionSummary(session: CashSession): Promise<SessionSummary> {
  const [sales, returns] = await Promise.all([getAllSales(), getAllReturns()]);
  return summarizeSession(session, sales, returns);
}
