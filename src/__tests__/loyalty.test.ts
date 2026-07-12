import { describe, it, expect } from 'vitest';
import { pointsEarned, pointsToCents, DEFAULT_LOYALTY } from '../db/loyalty';

describe('fidelización (loyalty)', () => {
  it('gana 1 punto por cada $10 gastados (config por defecto)', () => {
    expect(pointsEarned(12000, DEFAULT_LOYALTY)).toBe(12); // $120 -> 12 pts
    expect(pointsEarned(9900, DEFAULT_LOYALTY)).toBe(9); // $99 -> 9 pts (piso)
    expect(pointsEarned(0, DEFAULT_LOYALTY)).toBe(0);
  });

  it('respeta una config personalizada', () => {
    const cfg = { id: 'loyalty' as const, earnPerCents: 5000, redeemValueCents: 200 };
    expect(pointsEarned(20000, cfg)).toBe(4); // $200 / $50 -> 4 pts
  });

  it('convierte puntos a centavos según el valor configurado', () => {
    expect(pointsToCents(10, DEFAULT_LOYALTY)).toBe(1000); // 10 pts * $1 = $10
    expect(pointsToCents(0, DEFAULT_LOYALTY)).toBe(0);
    expect(pointsToCents(-5, DEFAULT_LOYALTY)).toBe(0);
  });
});
