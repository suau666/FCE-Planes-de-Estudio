// Dibujo de la malla: tarjetas, tramos, ciclo profesional y stats.

import { store, slotDe, scheduleSave } from './state.js';
import { keyOf, recalc, cycleEstado, faltantes } from './rules.js';
import { drawArrows } from './arrows.js';
import { carrerasDe } from '../data/index.js';
import { showTip, moveTip, hideTip } from './tooltip.js';

export function renderAll(carrera) {
  renderStats(carrera);
  renderTramos(carrera);
  renderCiclo(carrera);
}

export function toggle(carrera, id) {
  const k = keyOf(carrera, id);
  if (store.estados[k] === 'pending') return;
  store.estados[k] = cycleEstado(store.estados[k]);
  recalc(carrera, store.estados);
  renderAll(carrera);
  scheduleSave();
}

// ── Tarjeta ──────────────────────────────────────────────────────────────────
function makeCard(carrera, id) {
  const m = carrera.materias[id];
  const estado = store.estados[keyOf(carrera, id)];

  const div = document.createElement('div');
  div.className = `subject ${estado}${estado !== 'pending' ? ' clickable' : ''}`;
  div.id = `card-${id}`;

  const code = document.createElement('span');
  code.className = 'subject-code';
  code.textContent = m.optional ? (m.label || 'Opt') : id;

  let nameEl;
  if (m.optional) {
    const optNames = slotDe(carrera.id).optNames;
    nameEl = document.createElement('input');
    nameEl.type = 'text';
    nameEl.className = 'opt-name-input';
    nameEl.placeholder = 'Escribí la materia...';
    nameEl.value = optNames[id] || '';
    nameEl.addEventListener('input', e => { optNames[id] = e.target.value; scheduleSave(); });
    nameEl.addEventListener('click', e => e.stopPropagation());
  } else {
    nameEl = document.createElement('span');
    nameEl.className = 'subject-name';
    nameEl.textContent = m.name;
  }

  const pip = document.createElement('div');
  pip.className = 'status-pip';

  div.append(code, nameEl, pip);
  if (estado !== 'pending') div.addEventListener('click', () => toggle(carrera, id));

  if (!m.optional) {
    div.addEventListener('mouseenter', e => showTip(e, textoTooltip(carrera, id, estado)));
    div.addEventListener('mousemove', moveTip);
    div.addEventListener('mouseleave', hideTip);
  }
  return div;
}

function textoTooltip(carrera, id, estado) {
  const partes = [];

  if (estado === 'pending') {
    const { regularizar, aprobar, cantidad } = faltantes(carrera, id, store.estados);
    if (regularizar.length) partes.push(`Falta regularizar o aprobar:\n${regularizar.join('\n')}`);
    if (aprobar.length) partes.push(`Falta aprobar:\n${aprobar.join('\n')}`);
    if (cantidad) partes.push(`Faltan ${cantidad} materia${cantidad === 1 ? '' : 's'} regularizada${cantidad === 1 ? '' : 's'}`);
  } else if (estado === 'available') {
    partes.push('Click → Regular · Click 2× → Aprobada');
  }

  // Las materias compartidas valen para varias carreras a la vez.
  const otras = carrerasDe(id).filter(t => t !== carrera.titulo);
  if (otras.length) partes.push(`También cuenta para: ${otras.join(', ')}`);

  return partes.join('\n');
}

// ── Tramos previos al ciclo ──────────────────────────────────────────────────
function renderTramos(carrera) {
  const cont = document.getElementById('tramos');
  cont.innerHTML = '';
  for (const tramo of carrera.tramos) {
    const row = document.createElement('div');
    row.className = 'section-row';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.innerHTML = tramo.label;

    const grid = document.createElement('div');
    grid.className = `section-subjects cols-${tramo.cols || 6}`;
    tramo.ids.forEach(id => grid.appendChild(makeCard(carrera, id)));

    row.append(label, grid);
    cont.appendChild(row);
  }
}

// ── Ciclo profesional + optativas ────────────────────────────────────────────
function renderCiclo(carrera) {
  const grid = document.getElementById('ciclo-grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${carrera.ciclo.cols}, 1fr)`;
  grid.style.rowGap = `${carrera.ciclo.gapY}px`;

  for (const id in carrera.materias) {
    const m = carrera.materias[id];
    if (m.tramo !== 3 || m.optional) continue;
    const card = makeCard(carrera, id);
    card.style.gridColumn = m.col;
    card.style.gridRow = m.row;
    grid.appendChild(card);
  }

  const optRow = document.getElementById('optativas-row');
  optRow.innerHTML = '';
  const optativas = Object.keys(carrera.materias).filter(id => carrera.materias[id].optional);
  optativas.forEach(id => optRow.appendChild(makeCard(carrera, id)));
  document.getElementById('optativas-wrap').style.display = optativas.length ? 'flex' : 'none';

  requestAnimationFrame(() => requestAnimationFrame(() => drawArrows(carrera, store.estados)));
}

// ── Stats ────────────────────────────────────────────────────────────────────
function renderStats(carrera) {
  const ids = Object.keys(carrera.materias);
  const total = ids.length;
  const c = { approved: 0, regular: 0, available: 0, pending: 0 };
  ids.forEach(id => c[store.estados[keyOf(carrera, id)] ?? 'pending']++);
  const pct = total ? Math.round(c.approved / total * 100) : 0;

  document.getElementById('stats').innerHTML = `
    <div class="stat s-approved"><div class="stat-number">${c.approved}</div><div class="stat-label">Aprobadas</div></div>
    <div class="stat s-regular"><div class="stat-number">${c.regular}</div><div class="stat-label">Regulares</div></div>
    <div class="stat s-available"><div class="stat-number">${c.available}</div><div class="stat-label">Puedo cursar</div></div>
    <div class="stat s-pending"><div class="stat-number">${c.pending}</div><div class="stat-label">Pendientes</div></div>
    <div class="stat s-pct"><div class="stat-number">${pct}%</div><div class="stat-label">Aprobado</div></div>
    <div class="stat s-total"><div class="stat-number">${total}</div><div class="stat-label">Total materias</div></div>`;
}
