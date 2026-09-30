# Project Guidance

## User Preferences

- Idioma español en toda la interfaz
- Uso principal en celular Android; diseño mobile-first
- Web app instalable (PWA) que funcione sin internet
- Color principal azul denim y acento mostaza
- Modo oscuro automático según el sistema
- Botones grandes y áreas táctiles amplias
- Moneda en soles (S/)
- Sin datos de ejemplo
- Accesible: etiquetas en botones y campos, foco visible

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- App local-first: todos los datos viven en IndexedDB en el dispositivo; el backend Motoko no se usa. El asistente es un parser local en español, no un LLM.
- El resumen del mes (MonthSummary) debe renderizarse en la parte superior de cada una de las cuatro pestañas.
- Producto usa stockPorTalla: Record<string, number>; normalizarProducto() migra el campo escalar legado al leer de IndexedDB y al importar respaldos.
- Sobre el degradado azul del resumen, el rojo legible es text-red-300; text-destructive-foreground es casi blanco en tema claro.
- El asistente local no tiene rama para consultas producto+talla (p. ej. '¿nos queda talla 32 del jean azul?'); cae al fallback aunque el botón de sugerencia se ofrezca.
- El CSV de ventas no incluye la columna de método de pago.
- El service worker debe precachear íconos y manifest además del shell, y la navegación offline debe caer a /index.html.
- sharp está disponible en node_modules y permite redimensionar PNG a dimensiones exactas sin herramientas de imagen del sistema.
