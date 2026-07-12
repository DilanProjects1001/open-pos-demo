import type { Role } from './AuthContext';

/**
 * Permisos por rol (demo). Reglas simples y centralizadas para poder testearlas.
 */

/** ¿Puede este rol cerrar el turno de caja (hacer el corte)? Solo gerente/admin. */
export function canCloseShift(role: Role | undefined | null): boolean {
  return role === 'admin' || role === 'gerente';
}

/** ¿Puede ver el historial/reportes de cortes? Solo gerente/admin. */
export function canViewCashHistory(role: Role | undefined | null): boolean {
  return role === 'admin' || role === 'gerente';
}
