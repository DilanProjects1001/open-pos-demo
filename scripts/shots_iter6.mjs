// Capturas de la iteración 6 (6 secciones nuevas). Edge headless, perfil aislado.
// Navega por SPA tras login (sesión en memoria). BASE configurable por env.
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
  return page.evaluate((sel, src) => {
    const re = new RegExp(src);
    const el = [...document.querySelectorAll(sel)].find((n) => re.test(n.textContent || ''));
    if (el) { el.click(); return true; }
    return false;
  }, selector, regex.source);
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  userDataDir: join(ROOT, '_edge_profile'),
  args: ['--no-first-run', '--disable-gpu', '--window-size=1300,950'],
  defaultViewport: { width: 1300, height: 950 },
});

try {
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await sleep(1500); // seed
  await page.type('input[type="password"]', '1234', { delay: 35 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 8000 });
  await sleep(500);

  const sections = [
    ['Clientes|Customers', 'iter_6_clientes.png'],
    ['Proveedores|Suppliers', 'iter_6_proveedores.png'],
    ['Compras|Purchases', 'iter_6_compras.png'],
    ['Apartados|Layaways', 'iter_6_apartados.png'],
    ['Fidelización|Loyalty', 'iter_6_fidelizacion.png'],
    ['Devoluciones|Returns', 'iter_6_devoluciones.png'],
  ];

  for (const [label, file] of sections) {
    await clickByText(page, '.MuiListItemButton-root', new RegExp(`^(${label})$`));
    await sleep(900);
    await shot(page, file);
    console.log(`${file} OK`);
  }
} finally {
  await browser.close();
}
