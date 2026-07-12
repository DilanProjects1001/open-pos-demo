import { describe, it, expect } from 'vitest';
import { canCloseShift, canViewCashHistory } from '../auth/permissions';

describe('canCloseShift', () => {
  it('permite cerrar turno a admin y gerente', () => {
    expect(canCloseShift('admin')).toBe(true);
    expect(canCloseShift('gerente')).toBe(true);
  });

  it('NO permite a un cajero cerrar el turno', () => {
    expect(canCloseShift('cajero')).toBe(false);
  });

  it('sin rol no permite cerrar', () => {
    expect(canCloseShift(undefined)).toBe(false);
    expect(canCloseShift(null)).toBe(false);
  });
});

describe('canViewCashHistory', () => {
  it('solo admin/gerente ven el historial', () => {
    expect(canViewCashHistory('admin')).toBe(true);
    expect(canViewCashHistory('gerente')).toBe(true);
    expect(canViewCashHistory('cajero')).toBe(false);
  });
});
