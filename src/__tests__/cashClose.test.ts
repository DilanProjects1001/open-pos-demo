import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  createCashSession,
  closeCashSession,
  getActiveCashSession,
} from '../db/cash';

describe('closeCashSession (IndexedDB simulada)', () => {
  it('cierra un turno activo y fija el efectivo final', async () => {
    const s = await createCashSession('admin', 50000);
    expect(s.status).toBe('open');
    expect(s.closedAt).toBeNull();

    const closed = await closeCashSession(s.id, 67000);
    expect(closed).not.toBeNull();
    expect(closed?.status).toBe('closed');
    expect(closed?.finalCashCents).toBe(67000);
    expect(closed?.closedAt).not.toBeNull();
  });

  it('una sesión cerrada no se puede reabrir ni modificar', async () => {
    const s = await createCashSession('admin', 30000);
    const first = await closeCashSession(s.id, 40000);
    // Segundo intento con otro monto: el corte es inmutable, no debe cambiar.
    const second = await closeCashSession(s.id, 99999);
    expect(second?.status).toBe('closed');
    expect(second?.finalCashCents).toBe(40000); // se conserva el primer cierre
    expect(second?.closedAt).toBe(first?.closedAt);
  });

  it('devuelve null si el turno no existe', async () => {
    expect(await closeCashSession('inexistente', 100)).toBeNull();
  });

  it('un turno cerrado deja de ser el turno activo', async () => {
    const s = await createCashSession('gerente', 10000);
    await closeCashSession(s.id, 10000);
    const active = await getActiveCashSession();
    if (active) expect(active.id).not.toBe(s.id);
  });
});
