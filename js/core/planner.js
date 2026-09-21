// Planificador de cuatrimestres.
//
// Supuestos: una materia planificada en el período N cuenta como regularizada y
// aprobada a partir del período N+1 (optimista). Las materias hoy en estado
// regular se asumen con final rendido antes de arrancar el plan.
//
// El plan es propio de cada carrera (a diferencia del progreso, que es global).

import { store, slotDe, scheduleSave } from './state.js';
import { abrirOverlay, cerrarOverlay } from './modal.js';
import { keyOf, directPrereqs } from './rules.js';
import { confirmar } from './confirmar.js';
import { copiarTexto, bajarImagen } from './exportar-plan.js';

const CAP_CUATRI = 4, CAP_INTENSIVO = 2;

const PERIOD_KINDS = [
  { kind: 'VER', label: y => `Verano ${y}`,    intensivo: true  },
  { kind: '1C',  label: y => `1º Cuatri ${y}`, intensivo: false },
  { kind: 'INV', label: y => `Invierno ${y}`,  intensivo: true  },
  { kind: '2C',  label: y => `2º Cuatri ${y}`, intensivo: false },
];

let carrera = null;
let plan = {};              // id de materia → clave de período ("2026-2C")
let periodos = [];          // [{key,label,intensivo,cap}]
let autoMaxPerCuatri = 3;
let autoMaxPorIntensivo = 0;

const nombre = id => {
  const m = carrera.materias[id];
  return m.optional ? (slotDe(carrera.id).optNames[id] || m.label) : m.name;
};
const estado = id => store.estados[keyOf(carrera, id)];
const pendientes = () =>
  Object.keys(carrera.materias).filter(id => ['pending', 'available'].includes(estado(id)));

// ── Períodos ─────────────────────────────────────────────────────────────────
// ene-feb Verano · mar-jun 1C · jul Invierno · ago-dic 2C
function primerPeriodoDe(fecha) {
  const m = fecha.getMonth();
  return m <= 1 ? 0 : m <= 5 ? 1 : m === 6 ? 2 : 3;
}

function buildPeriods(nCuatris) {
  const out = [];
  const hoy = new Date();
  let y = hoy.getFullYear(), k = primerPeriodoDe(hoy), cuatris = 0;
  while (cuatris < nCuatris) {
    const def = PERIOD_KINDS[k];
    out.push({
      key: `${y}-${def.kind}`, label: def.label(y), intensivo: def.intensivo,
      cap: def.intensivo ? CAP_INTENSIVO : CAP_CUATRI,
    });
    if (!def.intensivo) cuatris++;
    if (++k === 4) { k = 0; y++; }
  }
  return out;
}

const periodIdx = key => periodos.findIndex(p => p.key === key);
const periodCount = (key, excluir) =>
  Object.keys(plan).filter(id => plan[id] === key && id !== String(excluir)).length;

// ¿`id` está hecha antes del período `idx`? (aprobada/regular hoy, o planificada antes)
function hechaAntesDe(id, idx) {
  if (['approved', 'regular'].includes(estado(id))) return true;
  const k = plan[id];
  return k !== undefined && periodIdx(k) < idx;
}

function canPlace(id, key) {
  const idx = periodIdx(key);
  const per = periodos[idx];
  if (periodCount(key, id) >= per.cap) {
    return { ok: false, msg: `«${per.label}» ya está completo (máx. ${per.cap} materia${per.cap > 1 ? 's' : ''})` };
  }
  const falta = [];
  for (const p of directPrereqs(carrera, id)) {
    if (!hechaAntesDe(p, idx)) falta.push(nombre(p));
    for (const gp of directPrereqs(carrera, p)) {
      if (!hechaAntesDe(gp, idx)) falta.push(nombre(gp));
    }
  }
  const uniq = [...new Set(falta)];
  if (uniq.length) {
    return { ok: false, msg: `No podés cursar «${nombre(id)}» en ${per.label} — antes necesitás: ${uniq.join(', ')}` };
  }
  return { ok: true };
}

// Tras cada movimiento, lo que quedó mal ubicado vuelve al listado, en cascada.
function revalidatePlan() {
  const devueltas = [];
  let cambio = true;
  while (cambio) {
    cambio = false;
    const entradas = Object.entries(plan).sort((a, b) => periodIdx(a[1]) - periodIdx(b[1]));
    for (const [id, key] of entradas) {
      if (!canPlace(id, key).ok) { delete plan[id]; devueltas.push(nombre(id)); cambio = true; }
    }
  }
  return devueltas;
}

function tryPlace(id, key) {
  if (plan[id] === key) return;
  const chk = canPlace(id, key);
  if (!chk.ok) return toast(chk.msg);
  plan[id] = key;
  const devueltas = revalidatePlan();
  if (devueltas.length) toast(`Volvieron al listado por correlatividades: ${devueltas.join(', ')}`);
  renderPlanner(); scheduleSave();
}

function unplace(id) {
  if (plan[id] === undefined) return;
  delete plan[id];
  const devueltas = revalidatePlan();
  if (devueltas.length) toast(`Volvieron al listado por correlatividades: ${devueltas.join(', ')}`);
  renderPlanner(); scheduleSave();
}

// ── Auto-acomodo ─────────────────────────────────────────────────────────────
// Respeta lo ya puesto a mano y arranca por las materias que más destraban.
function autoArrange(maxPer, maxPorIntensivo) {
  const memo = {};
  const dependientes = id => {
    if (memo[id]) return memo[id];
    memo[id] = new Set();                      // corta ciclos
    const set = new Set();
    for (const otra in carrera.materias) {
      if (directPrereqs(carrera, otra).map(String).includes(String(id))) {
        set.add(otra);
        dependientes(otra).forEach(x => set.add(x));
      }
    }
    return memo[id] = set;
  };

  let sueltas = pendientes().filter(id => plan[id] === undefined)
    .sort((a, b) => dependientes(b).size - dependientes(a).size);

  let pi = 0, guard = 0;
  while (sueltas.length && guard++ < 100) {
    while (pi >= periodos.length) {
      periodos = buildPeriods(periodos.filter(p => !p.intensivo).length + 1);
    }
    const per = periodos[pi];
    const cap = per.intensivo ? Math.min(maxPorIntensivo, CAP_INTENSIVO) : maxPer;
    if (cap > 0) {
      let puso = true;
      while (puso && periodCount(per.key) < cap) {
        puso = false;
        for (const id of sueltas) {
          if (canPlace(id, per.key).ok) {
            plan[id] = per.key;
            sueltas = sueltas.filter(x => x !== id);
            puso = true;
            break;
          }
        }
      }
    }
    pi++;
  }
  if (sueltas.length) toast(`No pude ubicar: ${sueltas.map(nombre).join(', ')}`);
  trimTrailingPeriods();
  renderPlanner(); scheduleSave();
}

// ── Drag por Pointer Events (anda con mouse y con pantalla táctil) ───────────
function beginCardDrag(id, el, ev) {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  const x0 = ev.clientX, y0 = ev.clientY;
  let ghost = null, movio = false, zonaActiva = null;

  const marcar = z => {
    if (zonaActiva && zonaActiva !== z) zonaActiva.classList.remove('dragover');
    if (z) z.classList.add('dragover');
    zonaActiva = z;
  };

  const onMove = e => {
    if (!movio && Math.hypot(e.clientX - x0, e.clientY - y0) < 6) return;
    if (!movio) {
      movio = true;
      ghost = el.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = el.offsetWidth + 'px';
      document.body.appendChild(ghost);
      el.classList.add('dragging');
    }
    e.preventDefault();
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    const bajo = document.elementFromPoint(e.clientX, e.clientY);
    marcar(bajo && (bajo.closest('[data-period-key]') || bajo.closest('#planner-pool')));
  };

  const onUp = e => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    marcar(null);
    el.classList.remove('dragging');
    ghost?.remove();
    if (!movio) return;
    const bajo = document.elementFromPoint(e.clientX, e.clientY);
    if (!bajo) return;
    const per = bajo.closest('[data-period-key]');
    if (per) tryPlace(id, per.getAttribute('data-period-key'));
    else if (bajo.closest('#planner-pool')) unplace(id);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

// ── Render ───────────────────────────────────────────────────────────────────
function makePlannerCard(id) {
  const d = document.createElement('div');
  d.className = 'p-card';
  const code = document.createElement('span');
  code.className = 'p-code';
  code.textContent = carrera.materias[id].optional ? 'Opt' : id;
  const name = document.createElement('span');
  name.textContent = nombre(id) || 'Sin nombre aún';
  d.append(code, name);
  d.addEventListener('pointerdown', e => beginCardDrag(id, d, e));
  if (plan[id] !== undefined) {
    d.title = 'Arrastrala al listado (o doble click) para devolverla';
    d.addEventListener('dblclick', () => unplace(id));
  }
  return d;
}

function renderPlanner() {
  const pool = document.getElementById('planner-pool');
  pool.innerHTML = '';
  const restantes = pendientes().filter(id => plan[id] === undefined);
  restantes.forEach(id => pool.appendChild(makePlannerCard(id)));
  document.getElementById('pool-count').textContent = `(${restantes.length})`;

  const cont = document.getElementById('planner-periods');
  cont.innerHTML = '';
  for (const per of periodos) {
    const box = document.createElement('div');
    box.className = 'p-period' + (per.intensivo ? ' intensivo' : '');
    box.dataset.periodKey = per.key;
    const ids = Object.keys(plan).filter(id => plan[id] === per.key);
    const title = document.createElement('div');
    title.className = 'p-period-title';
    title.innerHTML = `<span>${per.label}</span><span class="p-cap">${ids.length}/${per.cap}</span>`;
    box.appendChild(title);
    ids.forEach(id => box.appendChild(makePlannerCard(id)));
    cont.appendChild(box);
  }

  const add = document.createElement('button');
  add.className = 'p-add';
  add.textContent = '＋ Cuatrimestre';
  add.title = 'Agregar un cuatrimestre más al final';
  add.addEventListener('click', () => {
    periodos = buildPeriods(periodos.filter(p => !p.intensivo).length + 1);
    renderPlanner();
  });
  cont.appendChild(add);
}

// Recorta los cuatrimestres vacíos del final, dejando lugar para lo que queda
// en el listado más un colchón. Evita una pila enorme de períodos vacíos.
function trimTrailingPeriods() {
  const usados = new Set(Object.values(plan));
  let ultimoUsado = -1;
  periodos.forEach((p, i) => { if (usados.has(p.key)) ultimoUsado = i; });
  const restantes = pendientes().filter(id => plan[id] === undefined).length;
  const colchon = Math.max(2, Math.ceil(restantes / CAP_CUATRI));
  let vacios = 0, corte = periodos.length;
  for (let i = ultimoUsado + 1; i < periodos.length; i++) {
    if (!periodos[i].intensivo && ++vacios >= colchon) { corte = i + 1; break; }
  }
  periodos = periodos.slice(0, corte);
}

export function openPlanner(carreraActual) {
  carrera = carreraActual;
  plan = slotDe(carrera.id).plan;

  // Saca del plan lo que ya no está pendiente de cursar
  for (const id in plan) {
    if (!carrera.materias[id] || !['pending', 'available'].includes(estado(id))) delete plan[id];
  }

  const base = Math.max(2, Math.ceil(pendientes().length / CAP_CUATRI));
  periodos = buildPeriods(base);
  // Extiende hasta cubrir asignaciones guardadas en períodos más lejanos
  let extra = 0;
  while (extra < 40 && Object.values(plan).some(k => periodIdx(k) < 0)) {
    periodos = buildPeriods(base + ++extra);
  }
  // Descarta asignaciones a períodos que ya pasaron
  const vencidas = [];
  for (const id in plan) {
    if (periodIdx(plan[id]) < 0) { vencidas.push(nombre(id)); delete plan[id]; }
  }
  const devueltas = revalidatePlan();
  trimTrailingPeriods();
  renderPlanner();

  abrirOverlay(document.getElementById('planner-overlay'));
  const msgs = [];
  if (vencidas.length) msgs.push(`Volvieron al listado (período pasado): ${vencidas.join(', ')}`);
  if (devueltas.length) msgs.push(`Volvieron al listado por correlatividades: ${devueltas.join(', ')}`);
  if (msgs.length) toast(msgs.join(' · '));
}

export function closePlanner() {
  document.getElementById('auto-menu').style.display = 'none';
  cerrarOverlay(document.getElementById('planner-overlay'));
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('planner-toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Cableado de los controles del modal ──────────────────────────────────────
export function initPlannerUI() {
  const menu = () => document.getElementById('auto-menu');

  document.getElementById('auto-toggle').addEventListener('click', () => {
    const m = menu();
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
  });

  // Dos filas de botones: cuántas materias por cuatrimestre (1 a 4) y cuántas
  // por intensivo (0 a 2, donde 0 es no usarlos).
  const grupo = (contId, alElegir) => {
    const cont = document.getElementById(contId);
    cont.querySelectorAll('.auto-opt').forEach(b => {
      b.addEventListener('click', () => {
        alElegir(+b.dataset.n);
        cont.querySelectorAll('.auto-opt')
          .forEach(x => x.classList.toggle('active', x === b));
      });
    });
  };
  grupo('auto-cuatri', n => { autoMaxPerCuatri = n; });
  grupo('auto-intensivos', n => { autoMaxPorIntensivo = n; });

  document.getElementById('auto-go').addEventListener('click', () => {
    menu().style.display = 'none';
    autoArrange(autoMaxPerCuatri, autoMaxPorIntensivo);
  });

  document.getElementById('planner-clear').addEventListener('click', async () => {
    if (!Object.keys(plan).length) return;
    const cuantas = Object.keys(plan).length;
    const ok = await confirmar({
      titulo: '¿Vaciar el plan?',
      texto: `Se van a soltar las ${cuantas} materias que acomodaste. Las `
        + 'materias aprobadas y regulares no se tocan.',
      aceptar: 'Vaciar',
      peligro: true,
    });
    if (!ok) return;
    for (const id in plan) delete plan[id];
    renderPlanner(); scheduleSave();
  });

  // Llevarse el plan afuera de la app.
  document.getElementById('planner-txt').addEventListener('click', async () => {
    const r = await copiarTexto(carrera, periodos, plan, nombre);
    toast(r === 'vacio' ? 'Acomodá al menos una materia para poder copiarlo'
        : r === 'ok' ? 'Plan copiado al portapapeles'
        : 'No pude copiarlo: el navegador no me dejó usar el portapapeles');
  });

  document.getElementById('planner-img').addEventListener('click', () => {
    if (!bajarImagen(carrera, periodos, plan, nombre)) {
      toast('Acomodá al menos una materia para poder guardarla');
    }
  });

  document.getElementById('planner-close').addEventListener('click', closePlanner);

  document.getElementById('planner-overlay').addEventListener('mousedown', e => {
    if (e.target === e.currentTarget) closePlanner();
  });

  document.addEventListener('mousedown', e => {
    if (!document.getElementById('auto-menu-wrap').contains(e.target)) {
      menu().style.display = 'none';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' &&
        document.getElementById('planner-overlay').style.display !== 'none') closePlanner();
  });
}
