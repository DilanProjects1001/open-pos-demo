# SELFTEST — OpenPOS

Pruebas automáticas que NO requieren navegador. Ejecutar:

```bash
node check.js         # validaciones estáticas (exit 0 = todo bien)
npx vitest run        # tests unitarios (16 pruebas)
npm run build         # compila TypeScript + Vite sin errores
```

## Tests unitarios (`npx vitest run`)

- **`cashSummary.test.ts`** — `summarizeSession`/`filterSessionSales`: totales por método
  en centavos, filtrado por rango del turno, y efectivo esperado = inicial + efectivo −
  cambio.
- **`cashClose.test.ts`** (IndexedDB simulada con `fake-indexeddb`) — `closeCashSession`
  cierra el turno y fija el efectivo final; **un corte cerrado es inmutable** (no se reabre
  ni cambia al reintentar); devuelve `null` si no existe; un turno cerrado deja de ser el
  activo.
- **`money.test.ts`** — `parseCurrencyToCents` (suma de pagos en centavos, sin errores de
  punto flotante) y `formatCurrency`.
- **`permissions.test.ts`** — `canCloseShift`: admin/gerente sí, **cajero no**, sin rol no.

## Qué valida `check.js`

1. **`formatCurrency`** convierte centavos a moneda correctamente
   (`2500 → $25.00`, `5 → $0.05`, `100000 → $1,000.00`, etc.).
2. **Precios del seed** son todos enteros positivos (invariante "dinero en centavos")
   y hay al menos 10 productos.
3. **Usuarios**: existen los PIN `1234` / `5678` / `0000` y son únicos.
4. **i18n**: los archivos `es-MX.json` y `en.json` tienen exactamente el mismo
   conjunto de claves (sin traducciones faltantes en ningún idioma).
5. **Seed de ventas**: define al menos 5 ventas y usa los 3 métodos de pago
   (`cash` / `card` / `transfer`).
6. **Caja**: `src/db/cash.ts` exporta `createCashSession`, `getActiveCashSession`
   y `closeCashSession`.
7. **IndexedDB**: `src/db/db.ts` declara los stores `products`, `sales` y `cashSessions`.

## Pruebas manuales del módulo de Venta (en el navegador)

Abrir la app (`npm run dev`), entrar con PIN `1234` y navegar a **Venta**:

1. **Apertura de turno**: al entrar por primera vez aparece el diálogo "Abrir turno
   de caja". Escribir un efectivo inicial (p. ej. 500) y pulsar **Abrir turno**. El
   encabezado debe mostrar "Turno abierto · Inicial: $500.00". Verificar que no se
   puede vender hasta abrir el turno (buscador y botón deshabilitados).
2. **Búsqueda y carrito**: escribir en el buscador (p. ej. "café") filtra la lista.
   Hacer clic en un producto lo agrega al carrito; hacer clic de nuevo **incrementa**
   la cantidad. Probar los botones **+ / −** y el ícono de **eliminar**. El total al
   pie se recalcula.
3. **Pago mixto**: con el carrito en $120.00, pulsar **Realizar pago**; en el diálogo
   escribir Efectivo `100` y Tarjeta `30`. Debe mostrar Total pagado **$130.00** y
   Cambio **$10.00**. El botón **Completar venta** solo se habilita si lo pagado ≥ total.
4. **Ticket**: al completar, aparece el ticket con folio, fecha, operador, artículos,
   total, métodos y cambio. **Cerrar ticket** limpia el carrito y permite otra venta.
5. **Persistencia**: recargar la página (F5) mantiene el turno abierto y las ventas
   guardadas (viven en IndexedDB). Las ventas de ejemplo (seed) también persisten.

## Pruebas manuales del cierre de caja (módulo Caja)

1. Con un turno abierto y alguna venta, ir a **Caja**: muestra el turno activo con el
   resumen (nº de ventas, total, efectivo inicial, efectivo esperado) y el botón
   **Cerrar turno**.
2. **Cerrar turno** abre el diálogo de **corte de caja**: totales por método, efectivo
   esperado, y un campo para el **efectivo final contado**. Al escribirlo, muestra la
   **diferencia** (Cuadra / Sobrante / Faltante). Confirmar cierra el turno.
3. Tras cerrar: el turno activo desaparece (aviso "no hay turno abierto") y el corte
   aparece en el **historial**. **Ver detalle** muestra el resumen y las ventas del turno.
4. **Permiso por rol**: iniciar como **Cajero** (PIN 0000). En Caja, el botón de cierre
   se reemplaza por "Solo un gerente o administrador puede cerrar el turno".
5. **Inmutabilidad**: un corte ya cerrado no puede reabrirse ni modificarse (verificado
   además por `cashClose.test.ts`).

## Evidencia visual (capturas en `ui_shots/`)

Generadas manejando **Edge** headless con perfil aislado
(`scripts/shots.mjs` y `scripts/shots_iter2.mjs`):

- `iter_1_login.png` — login con PIN y pistas de usuarios demo.
- `iter_1_catalog.png` — catálogo con los 10 productos sembrados.
- `iter_1_new_product.png` — diálogo de alta de producto.
- `iter_1_switch.png` — diálogo de cambio rápido de operador.
- `iter_2_caja.png` — diálogo de apertura de turno de caja.
- `iter_2_venta.png` — venta con carrito de 4 productos (total $120.00).
- `iter_2_pago.png` — diálogo de pago mixto (efectivo $100 + tarjeta $30, cambio $10).
- `iter_2_ticket.png` — ticket final de la venta.
- `iter_3_caja_abierta.png` — Caja con turno abierto e historial de cortes.
- `iter_3_cierre.png` — diálogo de corte con resumen y diferencia.
- `iter_3_caja_cerrada.png` — Caja tras cerrar (sin turno activo, historial actualizado).
- `iter_3_detalle_corte.png` — detalle de un corte (resumen + ventas del turno).
- `iter_4_reportes.png` — dashboard de reportes con datos de ejemplo (gráficas + resumen).

## Reportes (dashboard)

- `src/db/reports.ts` expone agregaciones **puras**: `salesPerDay` (últimos 7 días),
  `topProducts` (top 5 por cantidad) y `methodTotals` (por forma de pago). Dinero en centavos.
- `check.js` incluye el **check #25**: `GET /reportes → 200` (best-effort; hace SKIP si no
  hay servidor levantado, para no romper la ejecución standalone). Con preview/dev arriba
  responde 200.

## Última ejecución

`node check.js` (con preview) → **TODO OK**, exit 0 (incluye `GET /reportes -> 200`).
`npx vitest run` → **16 passed** (4 archivos), exit 0.
`npm run build` → compila sin errores.
