import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';

describe('parseCurrencyToCents', () => {
  it('convierte texto de moneda a centavos enteros', () => {
    expect(parseCurrencyToCents('25.50')).toBe(2550);
    expect(parseCurrencyToCents('10')).toBe(1000);
    expect(parseCurrencyToCents('0.05')).toBe(5);
    expect(parseCurrencyToCents('$45.00')).toBe(4500);
  });

  it('devuelve 0 ante texto inválido', () => {
    expect(parseCurrencyToCents('')).toBe(0);
    expect(parseCurrencyToCents('abc')).toBe(0);
  });

  it('suma varios pagos en centavos sin errores de punto flotante', () => {
    const parts = ['25.50', '10', '0.05'];
    const total = parts.reduce((sum, p) => sum + parseCurrencyToCents(p), 0);
    expect(total).toBe(3555);
    expect(Number.isInteger(total)).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('formatea centavos a moneda', () => {
    expect(formatCurrency(3555)).toBe('$35.55');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(100000)).toBe('$1,000.00');
  });
});
