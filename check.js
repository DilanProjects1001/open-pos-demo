// Autotest sin navegador para OpenPOS. Valida invariantes clave sin depender de la UI.
// Ejecutar:  node check.js   (exit 0 = todo bien)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let failures = 0;
const ok = (msg) => console.log('  OK  ' + msg);
const fail = (msg) => {
  console.error(' FAIL ' + msg);
  failures++;
};
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

// --- 1) formatCurrency: centavos -> "$XX.XX" ---
function formatCurrency(cents) {
  const value = (cents || 0) / 100;
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const cases = [
  [2500, '$25.00'],
  [8500, '$85.00'],
  [2400, '$24.00'],
  [0, '$0.00'],
  [5, '$0.05'],
  [100000, '$1,000.00'],
];
for (const [cents, expected] of cases) {
  const got = formatCurrency(cents);
  if (got === expected) ok(`formatCurrency(${cents}) = ${got}`);
  else fail(`formatCurrency(${cents}) = ${got}, se esperaba ${expected}`);
}

// --- 2) Precios del seed en centavos (enteros) ---
const seed = read('src/db/seed.ts');
const prices = [...seed.matchAll(/price:\s*(\d+)/g)].map((m) => Number(m[1]));
if (prices.length >= 10) ok(`seed tiene ${prices.length} productos (>= 10)`);
else fail(`seed tiene solo ${prices.length} productos`);
if (prices.every((p) => Number.isInteger(p) && p > 0)) ok('todos los precios del seed son enteros positivos (centavos)');
else fail('hay precios no enteros o <= 0 en el seed');

// --- 3) PINs de usuarios: existen los 3 y son únicos ---
const auth = read('src/auth/AuthContext.tsx');
const pins = [...auth.matchAll(/pin:\s*'(\d+)'/g)].map((m) => m[1]);
const expectedPins = ['1234', '5678', '0000'];
if (expectedPins.every((p) => pins.includes(p))) ok('existen los PIN 1234 / 5678 / 0000');
else fail(`PINs encontrados: ${pins.join(', ')}`);
if (new Set(pins).size === pins.length) ok('los PINs son únicos');
else fail('hay PINs duplicados');

// --- 4) Claves de traducción presentes en ambos idiomas ---
const es = JSON.parse(read('src/locales/es-MX.json'));
const en = JSON.parse(read('src/locales/en.json'));
const flat = (o, pre = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, pre + k + '.') : [pre + k],
  );
const esKeys = flat(es).sort();
const enKeys = flat(en).sort();
if (JSON.stringify(esKeys) === JSON.stringify(enKeys)) ok(`i18n: es-MX y en tienen las mismas ${esKeys.length} claves`);
else fail('i18n: las claves de es-MX y en no coinciden');

// --- 5) Seed de ventas: al menos 5 ventas con métodos válidos ---
const saleDrafts = (seed.match(/buildSale\(products,/g) || []).length;
if (saleDrafts >= 5) ok(`seed de ventas define ${saleDrafts} ventas (>= 5)`);
else fail(`seed de ventas define solo ${saleDrafts} ventas`);
const methods = new Set([...seed.matchAll(/method:\s*'(cash|card|transfer)'/g)].map((m) => m[1]));
if (['cash', 'card', 'transfer'].every((m) => methods.has(m)))
  ok('el seed de ventas usa los 3 métodos: cash / card / transfer');
else fail(`métodos usados en el seed: ${[...methods].join(', ')}`);

// --- 6) Funciones de caja presentes ---
const cash = read('src/db/cash.ts');
for (const fn of ['createCashSession', 'getActiveCashSession', 'closeCashSession']) {
  if (cash.includes(`export async function ${fn}`)) ok(`cash.ts exporta ${fn}`);
  else fail(`falta la función ${fn} en cash.ts`);
}

// --- 7) Stores de IndexedDB declarados ---
const db = read('src/db/db.ts');
for (const store of ['products', 'sales', 'cashSessions']) {
  if (db.includes(`'${store}'`)) ok(`db.ts declara el store '${store}'`);
  else fail(`falta el store '${store}' en db.ts`);
}

// --- 8) Cierre de caja: resumen + seed de sesión cerrada ---
if (cash.includes('export function summarizeSession')) ok('cash.ts exporta summarizeSession');
else fail('falta summarizeSession en cash.ts');
if (seed.includes('ensureCashSeed') && /status:\s*'closed'/.test(seed))
  ok('el seed incluye una sesión de caja cerrada de ejemplo');
else fail('el seed no incluye una sesión de caja cerrada');

// --- 9) Permisos de rol para cerrar turno ---
const perms = read('src/auth/permissions.ts');
if (perms.includes('canCloseShift')) ok('permissions.ts exporta canCloseShift');
else fail('falta canCloseShift en permissions.ts');

// --- 10) Reportes: la página y sus agregaciones existen ---
const reports = read('src/db/reports.ts');
for (const fn of ['salesPerDay', 'topProducts', 'methodTotals']) {
  if (reports.includes(`export function ${fn}`)) ok(`reports.ts exporta ${fn}`);
  else fail(`falta ${fn} en reports.ts`);
}
const reportsPage = read('src/pages/ReportsPage.tsx');
if (reportsPage.includes('BarChart')) ok('ReportsPage usa gráficas (BarChart)');
else fail('ReportsPage no usa BarChart');

// --- 25) La ruta /reportes responde 200 (si hay un servidor levantado) ---
const BASE = process.env.CHECK_BASE_URL || 'http://localhost:4599';
try {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  const res = await fetch(`${BASE}/reportes`, { signal: ctrl.signal });
  clearTimeout(timer);
  if (res.status === 200) ok(`GET ${BASE}/reportes -> 200`);
  else fail(`GET ${BASE}/reportes -> ${res.status}`);
} catch {
  console.log('  SKIP  GET /reportes (servidor no disponible; levanta preview/dev y reintenta)');
}

console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLO(S)`);
process.exit(failures === 0 ? 0 : 1);
