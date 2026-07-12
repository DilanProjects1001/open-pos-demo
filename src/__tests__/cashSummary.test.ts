import { describe, it, expect } from 'vitest';
import { summarizeSession, filterSessionSales } from '../db/cash';
import type { CashSession, Sale } from '../db/db';

const session: CashSession = {
  id: 'sess-1',
  openedAt: 1000,
  closedAt: 2000,
  initialCashCents: 50000,
  finalCashCents: null,
  status: 'open',
  operatorId: 'admin',
};

// Venta base de ayuda.
const sale = (id: string, timestamp: number, sale: Partial<Sale>): Sale => ({
  id,
  timestamp,
  items: [],
  totalCents: 0,
  payments: [],
  changeCents: 0,
  operatorId: 'admin',
  ...sale,
});

const sales: Sale[] = [
  // Dentro del turno: efectivo 7500 con cambio 500 (neto 7000)
  sale('s1', 1500, {
    totalCents: 7000,
    payments: [{ method: 'cash', amountCents: 7500 }],
    changeCents: 500,
  }),
  // Dentro del turno: mixto efectivo 10000 + tarjeta 3700
  sale('s2', 1800, {
    totalCents: 13700,
    payments: [
      { method: 'cash', amountCents: 10000 },
      { method: 'card', amountCents: 3700 },
    ],
  }),
  // FUERA del turno (posterior al cierre): no debe contar
  sale('s3', 2500, {
    totalCents: 25000,
    payments: [{ method: 'card', amountCents: 25000 }],
  }),
  // FUERA del turno (anterior a la apertura): no debe contar
  sale('s4', 900, {
    totalCents: 9999,
    payments: [{ method: 'transfer', amountCents: 9999 }],
  }),
];

describe('summarizeSession', () => {
  it('solo considera las ventas dentro del rango del turno', () => {
    expect(filterSessionSales(session, sales).map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('calcula totales por método en centavos', () => {
    const sum = summarizeSession(session, sales);
    expect(sum.salesCount).toBe(2);
    expect(sum.totalCents).toBe(20700);
    expect(sum.cashCents).toBe(17500);
    expect(sum.cardCents).toBe(3700);
    expect(sum.transferCents).toBe(0);
    expect(sum.changeCents).toBe(500);
  });

  it('el efectivo esperado = inicial + efectivo - cambio', () => {
    const sum = summarizeSession(session, sales);
    // 50000 + 17500 - 500 = 67000
    expect(sum.expectedCashCents).toBe(67000);
  });

  it('un turno sin ventas espera exactamente el fondo inicial', () => {
    const sum = summarizeSession(session, []);
    expect(sum.salesCount).toBe(0);
    expect(sum.expectedCashCents).toBe(session.initialCashCents);
  });
});
