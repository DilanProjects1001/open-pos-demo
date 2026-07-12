// Captura de verificación EN VIVO (Cloudflare Pages): login como admin y venta
// completa con pago mixto, para probar que el deploy funciona de punta a punta.
// Edge headless con perfil aislado. Guarda ui_shots/iter_5_live.png (ticket final).
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.LIVE_URL || 'https://agc-openpos.pages.dev';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // 1) Login en vivo
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await sleep(1600); // deja correr el seed en el sitio en vivo
  await page.type('input[type="password"]', '1234', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 8000 });
  await sleep(700);

  // 2) Abrir turno de caja
  await page.waitForSelector('.MuiDialog-root', { timeout: 8000 });
  await typeInDialogInput(page, 0, '500');
  await clickByText(page, 'button', /Abrir turno$|Open shift$/);
  await sleep(700);

  // 3) Carrito: Aceite + Arroz + Frijol + Jabón = $120
  for (const name of ['Aceite', 'Arroz', 'Frijol', 'Jabón']) {
    await clickByText(page, '.MuiListItemButton-root', new RegExp(name));
    await sleep(300);
  }

  // 4) Pago mixto: efectivo 100 + tarjeta 30 -> cambio 10
  await clickByText(page, 'button', /Realizar pago|Checkout/);
  await page.waitForSelector('.MuiDialog-root input', { timeout: 8000 });
  await typeInDialogInput(page, 0, '100');
  await typeInDialogInput(page, 1, '30');
  await sleep(400);
  await clickByText(page, 'button', /Completar venta|Complete sale/);
  await sleep(900);

  // 5) Ticket final -> captura en vivo
  await page.screenshot({ path: join(ROOT, 'ui_shots/iter_5_live.png') });
  console.log('iter_5_live shot OK');
} finally {
  await browser.close();
}
