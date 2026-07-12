// Captura de la iteración 4 (dashboard de Reportes).
// La página /reportes está protegida (login + rol admin/gerente); por eso hay que
// iniciar sesión y navegar por SPA antes de fotografiar (un --screenshot directo
// caería en /login por el redirect). Edge headless con perfil aislado.
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:4599';
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

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  userDataDir: join(ROOT, '_edge_profile'),
  args: ['--no-first-run', '--disable-gpu', '--window-size=1280,1000'],
  defaultViewport: { width: 1280, height: 1000 },
});

try {
  const page = await browser.newPage();

  // Login admin (PIN 1234); el seed carga productos, ventas y un corte cerrado.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await sleep(1100);
  await page.type('input[type="password"]', '1234', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 5000 });
  await sleep(500);

  // Ir a Reportes por el menú lateral (SPA)
  await clickByText(page, 'a, .MuiListItemButton-root', /^Reportes$|^Reports$/);
  await page.waitForSelector('svg', { timeout: 5000 }); // gráficas renderizadas
  await sleep(1400); // deja terminar la animación de las barras
  await page.screenshot({ path: join(ROOT, 'ui_shots/iter_4_reportes.png') });
  console.log('reportes shot OK');
} finally {
  await browser.close();
}
