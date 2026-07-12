import { describe, it, expect } from 'vitest';
import { layawayBalance } from '../db/layaways';
import type { Layaway } from '../db/db';

const base: Layaway = {
  id: 'l1', customerId: 'c1', customerName: 'X', items: [],
  totalCents: 30000, paidCents: 10000, status: 'open', payments: [], createdAt: 0,
};

describe('apartados (layaways)', () => {
  it('el saldo pendiente = total - abonado', () => {
    expect(layawayBalance(base)).toBe(20000);
    expect(layawayBalance({ ...base, paidCents: 30000 })).toBe(0);
  });

  it('nunca devuelve saldo negativo', () => {
    expect(layawayBalance({ ...base, paidCents: 40000 })).toBe(0);
  });
});
