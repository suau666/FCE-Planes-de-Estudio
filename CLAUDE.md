# FCE Planes de Estudio

Planes de estudio interactivos de las cinco carreras de la FCE · UBA. Sitio
estático (HTML + módulos ES, sin bundler), con progreso guardado en Neon
(Neon Auth + Data API) o en el dispositivo cuando no hay sesión.

## Convenciones de UI

- Íconos: siempre SVG inline con el path de Lucide (lucide.dev), nunca texto o
  emoji como reemplazo de un ícono real.
- Inputs, botones, modales, dropdowns: usar los patrones estándar más comunes
  en web (los que verías en shadcn/ui) — no inventar variantes propias salvo
  que se pida explícitamente.
- Mantener consistencia con lo que ya existe en `css/theme.css` y
  `css/app.css` — no introducir gradientes, sombras o estilos nuevos sin que
  encajen con la paleta ya definida.
- Antes de armar un componente de cero, revisar si ya hay uno parecido en el
  proyecto y reusar ese patrón.

## Dónde está cada cosa

- `js/data/` — los planes de las cinco carreras. El código de materia es
  global: una materia compartida vale para todas las carreras.
- `js/core/` — motor de correlativas, dibujo de la malla, flechas, planificador.
- `js/auth/`, `js/storage/`, `js/db/` — sesión, adapters de progreso y cliente
  de Neon. `local.js` y `remote.js` tienen la misma interfaz (`load`/`save`).
- `db/` — esquema, seed generado y consultas de estadísticas.
- `npm test` corre los tests de reglas; `npm start` levanta el sitio en 8080;
  `npm run db:seed` regenera `db/seed.sql` desde los planes.
