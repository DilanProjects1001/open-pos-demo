import { getDB, type LoyaltyConfig } from './db';

// Configuración por defecto de fidelización: 1 punto por cada $10 (1000 centavos),
// y cada punto vale $1 (100 centavos) al canjearse.
export const DEFAULT_LOYALTY: LoyaltyConfig = {
  id: 'loyalty',
  earnPerCents: 1000,
  redeemValueCents: 100,
};

/** Lee la configuración de fidelización (o la default si no existe). */
export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const db = await getDB();
  const cfg = await db.get('settings', 'loyalty');
  return (cfg as LoyaltyConfig) ?? DEFAULT_LOYALTY;
}

/** Guarda la configuración de fidelización. */
export async function saveLoyaltyConfig(cfg: LoyaltyConfig): Promise<void> {
  const db = await getDB();
  await db.put('settings', { ...cfg, id: 'loyalty' });
}

/** Puntos ganados por un importe (centavos) según la config. PURA. */
export function pointsEarned(amountCents: number, cfg: LoyaltyConfig): number {
  if (cfg.earnPerCents <= 0) return 0;
  return Math.floor(amountCents / cfg.earnPerCents);
}

/** Valor en centavos de una cantidad de puntos al canjear. PURA. */
export function pointsToCents(points: number, cfg: LoyaltyConfig): number {
  return Math.max(0, Math.floor(points)) * cfg.redeemValueCents;
}
