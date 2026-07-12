import { describe, it, expect } from 'vitest';
import { summarizeSession, filterSessionReturns } from '../db/cash';
import type { CashSession, ReturnRecord, Sale } from '../db/db';

const session: CashSession = {
  id: 's', openedAt: 1000, closedAt: 2000, initialCashCents: 50000,
  finalCashCents: null, status: 'open', operatorId: 'admin',
};

const sale: Sale = {
  id: 'v1', timestamp: 1500, items: [], totalCents: 20000,
  payments: [{ method: 'cash', amountCents: 20000 }], changeCents: 0,
  operatorId: 'admin',
};

const cashReturn: ReturnRecord = {
  id: 'r1', saleId: 'v1', items: [], refundCents: 5000, method: 'cash',
  operatorId: 'gerente', reason: 'defecto', timestamp: 1600,
};
const cardReturn: ReturnRecord = {
  id: 'r2', saleId: 'v1', items: [], refundCents: 3000, method: 'card',
  operatorId: 'gerente', reason: 'x', timestamp: 1700,
};
const outOfTurn: ReturnRecord = { ...cashReturn, id: 'r3', timestamp: 5000 };

describe('devoluciones y caja', () => {
  it('solo cuenta devoluciones dentro del turno', () => {
    expect(filterSessionReturns(session, [cashReturn, outOfTurn]).map((r) => r.id)).toEqual(['r1']);
  });

  it('las devoluciones en efectivo restan del efectivo esperado', () => {
    const sum = summarizeSession(session, [sale], [cashReturn]);
    // 50000 + 20000 (efectivo) - 0 (cambio) - 5000 (devolución efectivo) = 65000
    expect(sum.refundsCashCents).toBe(5000);
    expect(sum.expectedCashCents).toBe(65000);
  });

  it('las devoluciones con tarjeta NO afectan el efectivo esperado', () => {
    const sum = summarizeSession(session, [sale], [cardReturn]);
    expect(sum.refundsCashCents).toBe(0);
    expect(sum.expectedCashCents).toBe(70000);
  });

  it('sin devoluciones el resultado es el de siempre', () => {
    const sum = summarizeSession(session, [sale]);
    expect(sum.expectedCashCents).toBe(70000);
  });
});
