// Capturas de la iteración 3 (cierre/corte de caja).
// Edge headless con perfil aislado vía puppeteer-core. Navegar por SPA (clics),
// nunca con page.goto tras el login (la sesión vive en memoria).
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
  args: ['--no-first-run', '--disable-gpu', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 900 },
});

try {
  const page = await browser.newPage();

  // Login admin (PIN 1234)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await sleep(1100); // deja correr el seed (productos + ventas + corte cerrado)
  await page.type('input[type="password"]', '1234', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 5000 });
  await sleep(500);

  // Ir a Venta y abrir turno
  await clickByText(page, 'a, .MuiListItemButton-root', /^Venta$|^Sale$/);
  await page.waitForSelector('.MuiDialog-root', { timeout: 5000 });
  await typeInDialogInput(page, 0, '500');
  await clickByText(page, 'button', /Abrir turno$|Open shift$/);
  await sleep(600);

  // Hacer una venta (para que el turno tenga movimiento): Aceite+Arroz+Frijol+Jabón = $120
  for (const name of ['Aceite', 'Arroz', 'Frijol', 'Jabón']) {
    await clickByText(page, '.MuiListItemButton-root', new RegExp(name));
    await sleep(250);
  }
  await clickByText(page, 'button', /Realizar pago|Checkout/);
  await page.waitForSelector('.MuiDialog-root input', { timeout: 5000 });
  await typeInDialogInput(page, 0, '120'); // efectivo exacto
  await sleep(300);
  await clickByText(page, 'button', /Completar venta|Complete sale/);
  await sleep(700);
  await clickByText(page, 'button', /Cerrar ticket|Close receipt/);
  await sleep(500);

  // Ir a Caja: turno abierto + historial (con el corte sembrado)
  await clickByText(page, 'a, .MuiListItemButton-root', /^Caja$|Cash Drawer/);
  await page.waitForSelector('table', { timeout: 5000 });
  await sleep(700);
  await shot(page, 'iter_3_caja_abierta.png');
  console.log('caja_abierta OK');

  // Abrir diálogo de cierre y capturar el resumen
  await clickByText(page, 'button', /Cerrar turno$|Close shift$/);
  await page.waitForSelector('.MuiDialog-root', { timeout: 5000 });
  await typeInDialogInput(page, 0, '620'); // efectivo final: 500 inicial + 120 = 620 (cuadra)
  await sleep(400);
  await shot(page, 'iter_3_cierre.png');
  console.log('cierre OK');

  // Confirmar cierre
  await clickByText(page, 'button', /Confirmar cierre|Confirm close/);
  await sleep(800);
  await shot(page, 'iter_3_caja_cerrada.png');
  console.log('caja_cerrada OK');

  // Detalle de un corte (historial)
  await clickByText(page, 'button', /Ver detalle|View detail/);
  await page.waitForSelector('.MuiDialog-root', { timeout: 5000 });
  await sleep(500);
  await shot(page, 'iter_3_detalle_corte.png');
  console.log('detalle OK');
} finally {
  await browser.close();
}
