// Script de capturas: maneja Edge (Chromium) de forma headless y aislada con
// puppeteer-core para poder iniciar sesión y navegar antes de fotografiar.
// La sesión vive solo en memoria: hay que navegar por SPA (clics), NUNCA con
// recargas completas (page.goto), o se pierde el login.
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:4599';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: join(ROOT, `ui_shots/${name}`) });

// Hace clic en un elemento por su texto visible (para links del menú o botones).
async function clickByText(page, selector, regex) {
  const clicked = await page.evaluate(
    (sel, src) => {
      const re = new RegExp(src);
      const el = [...document.querySelectorAll(sel)].find((n) => re.test(n.textContent || ''));
      if (el) { el.click(); return true; }
      return false;
    },
    selector,
    regex.source,
  );
  return clicked;
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

  // 1) Página de login (una sola carga completa)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await sleep(800); // deja correr el seed inicial
  await shot(page, 'iter_1_login.png');
  console.log('login shot OK');

  // Iniciar sesión como admin (PIN 1234)
  await page.type('input[type="password"]', '1234', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 5000 });
  await sleep(500);

  // 2) Ir a Catálogo por el menú lateral (SPA, sin recargar)
  await clickByText(page, 'a, .MuiListItemButton-root', /Catálogo|Catalog/);
  await page.waitForSelector('table tbody tr', { timeout: 5000 });
  await sleep(700);
  await shot(page, 'iter_1_catalog.png');
  console.log('catalog shot OK');

  // 3) Diálogo de alta de producto
  await clickByText(page, 'button', /Agregar|Add/);
  await page.waitForSelector('.MuiDialog-root', { timeout: 5000 });
  await sleep(500);
  await shot(page, 'iter_1_new_product.png');
  console.log('new product shot OK');
  await page.keyboard.press('Escape');
  await sleep(400);

  // 4) Diálogo de "Cambio rápido de operador" desde la topbar
  await page.click('.MuiAppBar-root .MuiChip-root');
  await sleep(400);
  const items = await page.$$('.MuiMenu-list li');
  if (items.length) await items[0].click(); // primer item = cambio de operador
  await page.waitForSelector('.MuiDialog-root input[type="password"]', { timeout: 5000 });
  await sleep(500);
  await shot(page, 'iter_1_switch.png');
  console.log('switch shot OK');
} finally {
  await browser.close();
}
