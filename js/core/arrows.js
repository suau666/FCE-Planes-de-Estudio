// Flechas de correlatividad del Ciclo Profesional.
//
// El conjunto de flechas sale de `prereqs` (ver rules.arrowsDe). Acá sólo se
// decide POR DÓNDE sale y entra cada una: por defecto se reparten a lo ancho de
// la tarjeta cuando hay varias, y la carrera puede fijar una fracción concreta
// con `arrowHints`.

import { arrowsDe, keyOf } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';
const MLEN = 9;   // largo de la punta de flecha

export function drawArrows(carrera, estados) {
  const svg = document.getElementById('arrows-svg');
  if (!svg) return;
  svg.innerHTML = '';

  const flechas = arrowsDe(carrera);
  if (!flechas.length) return;

  const pRect = svg.parentElement.getBoundingClientRect();
  const claro = ['theme-white', 'theme-aqua', 'theme-cream']
    .some(c => document.body.classList.contains(c));
  const cPend = claro ? 'rgba(100,105,140,.65)' : 'rgba(130,130,185,.85)';
  const cAppr = claro ? 'rgba(18,135,65,.70)'   : 'rgba(46,204,113,.75)';
  const cReg  = claro ? 'rgba(200,160,0,.75)'   : 'rgba(230,184,0,.75)';

  const defs = document.createElementNS(NS, 'defs');
  defs.appendChild(marcador('ad', cPend));
  defs.appendChild(marcador('ao', cAppr));
  defs.appendChild(marcador('ar', cReg));
  svg.appendChild(defs);

  const rect = el => {
    const r = el.getBoundingClientRect();
    const ox = pRect.left, oy = pRect.top;
    return { l: r.left - ox, r: r.right - ox, t: r.top - oy, b: r.bottom - oy,
             cx: r.left - ox + r.width / 2, cy: r.top - oy + r.height / 2,
             w: r.width, h: r.height };
  };

  // Flechas con recorrido propio: no salen por abajo y entran por arriba, así
  // que quedan fuera del reparto horizontal. Las declara `arrowShapes`.
  const formas = carrera.arrowShapes || {};

  // Orden de salidas de cada origen y de entradas de cada destino: define el
  // reparto horizontal para que dos flechas no se pisen.
  const salidas = {}, entradas = {};
  flechas.forEach(([f, t]) => {
    if (formas[`${f}-${t}`]) return;
    (salidas[f] ??= []).push(t);
    (entradas[t] ??= []).push(f);
  });

  // Reparte `n` conectores a lo ancho de la tarjeta, sesgado hacia el punto
  // que apunta al otro extremo.
  const reparto = (caja, objetivoX, i, n) => {
    const ideal = Math.max(caja.l + 6, Math.min(caja.r - 6, objetivoX));
    if (n === 1) return ideal;
    const base = caja.cx + (i / (n - 1) - 0.5) * caja.w * 0.52;
    return base * 0.4 + ideal * 0.6;
  };

  const hints = carrera.arrowHints || {};

  for (const [fId, tId] of flechas) {
    const fEl = document.getElementById('card-' + fId);
    const tEl = document.getElementById('card-' + tId);
    if (!fEl || !tEl) continue;

    const f = rect(fEl), t = rect(tEl);
    const hint = hints[`${fId}-${tId}`] || {};
    const forma = formas[`${fId}-${tId}`];

    let x1, y1, x2, y2, c1x, c1y, c2x, c2y;

    if (forma === 'arco') {
      // Sale por arriba a la derecha, pasa por encima de lo que haya en el
      // medio y entra por el costado izquierdo del destino.
      x1 = f.r;         y1 = f.t + f.h * 0.28;
      x2 = t.l + MLEN;  y2 = t.t + t.h * 0.35;
      const alto = Math.min(f.t, t.t) - 44;
      c1x = f.r + 52; c1y = alto;
      c2x = t.l - 30; c2y = alto;
    } else if (forma === 'lateral') {
      // Sale por abajo a la derecha y entra por el costado izquierdo.
      x1 = f.r;         y1 = f.b - f.h * 0.28;
      x2 = t.l + MLEN;  y2 = t.cy;
      const g = Math.max((x2 - x1) * 0.4, 20);
      c1x = x1 + g; c1y = y1; c2x = x2 - g; c2y = y2;
    } else if (forma === 'horizontal') {
      // Derecha → izquierda, a la misma altura.
      x1 = f.r;         y1 = f.cy;
      x2 = t.l + MLEN;  y2 = t.cy;
      const g = Math.max((x2 - x1) * 0.3, 20);
      c1x = x1 + g; c1y = y1; c2x = x2 - g; c2y = y2;
    } else {
      x1 = hint.from !== undefined
        ? f.l + f.w * hint.from
        : reparto(f, t.cx, salidas[fId].indexOf(tId), salidas[fId].length);
      y1 = f.b;

      x2 = hint.to !== undefined
        ? t.l + t.w * hint.to
        : reparto(t, f.cx, entradas[tId].indexOf(fId), entradas[tId].length);
      y2 = t.t + MLEN;

      const dx = x2 - x1, dy = y2 - y1;
      const tension = Math.max(dy * 0.15, 12);
      c1x = x1 + dx * 0.1; c1y = y1 + tension;
      c2x = x2 - dx * 0.1; c2y = y2 - tension;
    }

    const estado = estados[keyOf(carrera, fId)];
    const color = estado === 'approved' ? cAppr : estado === 'regular' ? cReg : cPend;
    const marker = estado === 'approved' ? 'ao' : estado === 'regular' ? 'ar' : 'ad';

    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d',
      `M${x1.toFixed(1)},${y1.toFixed(1)} ` +
      `C${c1x.toFixed(1)},${c1y.toFixed(1)} ` +
      `${c2x.toFixed(1)},${c2y.toFixed(1)} ` +
      `${x2.toFixed(1)},${y2.toFixed(1)}`);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', `url(#${marker})`);
    svg.appendChild(path);
  }
}

function marcador(id, color) {
  const m = document.createElementNS(NS, 'marker');
  m.setAttribute('id', id);
  m.setAttribute('markerWidth', '10');
  m.setAttribute('markerHeight', '8');
  m.setAttribute('refX', '9');
  m.setAttribute('refY', '4');
  m.setAttribute('orient', 'auto');
  m.setAttribute('markerUnits', 'userSpaceOnUse');
  const pg = document.createElementNS(NS, 'polygon');
  pg.setAttribute('points', '0,0.5 9,4 0,7.5 2,4');
  pg.setAttribute('fill', color);
  m.appendChild(pg);
  return m;
}
