// Capturas de la iteración 2 (módulo de Venta y apertura de caja).
// Maneja Edge headless con perfil aislado vía puppeteer-core.
// La sesión vive en memoria: navegar por SPA (clics), nunca con page.goto.
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:4599';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: join(ROOT, `ui_shots/${name}`) });

async function clickByText(page, selector, regex) {
  return page.evaluate(
    (sel, src) => {
      const re = new RegExp(src);
      const el = [...document.querySelectorAll(sel)].find((n) => re.test(n.textContent || ''));
      if (el) { el.click(); return true; }
      return false;
    },
    selector,
    regex.source,
  );
}

// Escribe en el n-ésimo input dentro del diálogo abierto.
async function typeInDialogInput(page, index, value) {
  const inputs = await page.$$('.MuiDialog-root input');
  if (!inputs[index]) return false;
  await inputs[index].click({ clickCount: 3 });
  await inputs[index].type(value, { delay: 30 });
  return true;
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  userDataDir: join(ROOT, '_edge_profile'),
  args: ['--no-first-run', '--disable-gpu', '--window-size=1280,860'],
  defaultViewport: { width: 1280, height: 860 },
});

try {
  const page = await browser.newPage();

  // Login como admin (PIN 1234)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await sleep(900); // deja correr el seed (productos + ventas)
  await page.type('input[type="password"]', '1234', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 5000 });
  await sleep(500);

  // Ir a Venta por el menú lateral
  await clickByText(page, 'a, .MuiListItemButton-root', /^Venta$|^Sale$/);
  await sleep(700);

  // 1) Diálogo de apertura de turno (aparece porque no hay caja abierta)
  await page.waitForSelector('.MuiDialog-root', { timeout: 5000 });
  await sleep(400);
  await typeInDialogInput(page, 0, '500');
  await sleep(300);
  await shot(page, 'iter_2_caja.png');
  console.log('caja shot OK');

  // Abrir turno
  await clickByText(page, 'button', /Abrir turno$|Open shift$/);
  await sleep(600);

  // 2) Agregar productos al carrito (Aceite 45 + Arroz 32 + Frijol 28 + Jabón 15 = $120)
  for (const name of ['Aceite', 'Arroz', 'Frijol', 'Jabón']) {
    await clickByText(page, '.MuiListItemButton-root', new RegExp(name));
    await sleep(300);
  }
  await sleep(400);
  await shot(page, 'iter_2_venta.png');
  console.log('venta shot OK');

  // 3) Diálogo de pago con pago mixto (efectivo 100 + tarjeta 30, total 120 -> cambio 10)
  await clickByText(page, 'button', /Realizar pago|Checkout/);
  await page.waitForSelector('.MuiDialog-root input', { timeout: 5000 });
  await sleep(400);
  await typeInDialogInput(page, 0, '100'); // Efectivo
  await typeInDialogInput(page, 1, '30'); // Tarjeta
  await sleep(400);
  await shot(page, 'iter_2_pago.png');
  console.log('pago shot OK');

  // 4) Completar venta -> ticket
  await clickByText(page, 'button', /Completar venta|Complete sale/);
  await sleep(800);
  await shot(page, 'iter_2_ticket.png');
  console.log('ticket shot OK');
} finally {
  await browser.close();
}
