// Utilidades de dinero. Regla del proyecto: TODOS los importes se manejan como
// enteros de centavos (number). El formateo a moneda es solo de presentación.

/** Formatea centavos a moneda: 2500 -> "$25.00". */
export function formatCurrency(cents: number): string {
  const value = (cents || 0) / 100;
  return `$${value.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Convierte un texto de moneda ("25.5", "25,50", "$25.00") a centavos enteros. */
export function parseCurrencyToCents(input: string): number {
  const normalized = String(input).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}
