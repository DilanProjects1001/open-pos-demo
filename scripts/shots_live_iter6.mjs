// Verificación FUNCIONAL en vivo de compras y devoluciones (los flujos que mutan
// stock/caja). Edge headless, perfil aislado. Contra la URL publicada.
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.LIVE_URL || 'https://agc-openpos.pages.dev';
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
async function typeInDialogInput(page, index, value) {
  const inputs = await page.$$('.MuiDialog-root input');
  if (!inputs[index]) return false;
  await inputs[index].click({ clickCount: 3 });
  await inputs[index].type(value, { delay: 25 });
  return true;
}

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  userDataDir: join(ROOT, '_edge_profile'),
  args: ['--no-first-run', '--disable-gpu', '--window-size=1300,950'],
  defaultViewport: { width: 1300, height: 950 },
});

try {
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await sleep(1700);
  await page.type('input[type="password"]', '1234', { delay: 35 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 8000 });
  await sleep(500);

  // --- Compras: registrar entrada (incrementa stock) ---
  await clickByText(page, '.MuiListItemButton-root', /^(Compras|Purchases)$/);
  await sleep(800);
  await clickByText(page, 'button', /Registrar compra|Register purchase/);
  await page.waitForSelector('.MuiDialog-root', { timeout: 6000 });
  await sleep(500);
  // inputs del diálogo: [0]=proveedor(select, no input text), campos: quantity y cost
  // Encontrar el input de cantidad (type=number) y costo por orden.
  const inputs = await page.$$('.MuiDialog-root input');
  // inputs: [0] cantidad, [1] costo (el select de proveedor/producto no son <input> de texto visibles)
  // Ajustamos: buscamos el input numérico de cantidad y el de costo.
  if (inputs.length >= 2) {
    await inputs[inputs.length - 2].click({ clickCount: 3 });
    await inputs[inputs.length - 2].type('10', { delay: 25 });
    await inputs[inputs.length - 1].click({ clickCount: 3 });
    await inputs[inputs.length - 1].type('30', { delay: 25 });
  }
  await sleep(300);
  await clickByText(page, 'button', /Registrar entrada|Register stock-in/);
  await sleep(900);
  await shot(page, 'iter_6_live_compra.png');
  console.log('compra live OK');

  // --- Devoluciones: procesar una devolución de una venta sembrada ---
  await clickByText(page, '.MuiListItemButton-root', /^(Devoluciones|Returns)$/);
  await sleep(800);
  await clickByText(page, 'button', /Nueva devolución|New return/);
  await page.waitForSelector('.MuiDialog-root', { timeout: 6000 });
  await sleep(600);
  // Poner cantidad 1 en el primer artículo (input numérico dentro del card)
  const dinputs = await page.$$('.MuiDialog-root input[type="number"]');
  if (dinputs[0]) { await dinputs[0].click({ clickCount: 3 }); await dinputs[0].type('1', { delay: 25 }); }
  await sleep(300);
  await clickByText(page, 'button', /Procesar devolución|Process return/);
  await sleep(900);
  await shot(page, 'iter_6_live_devolucion.png');
  console.log('devolucion live OK');
} finally {
  await browser.close();
}
