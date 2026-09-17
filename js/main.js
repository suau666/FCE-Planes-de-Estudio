import { CARRERAS, getCarrera } from './data/index.js';
import { store, cargar, scheduleSave } from './core/state.js';
import { initEstados } from './core/rules.js';
import { renderAll } from './core/render.js';
import { drawArrows } from './core/arrows.js';
import { openPlanner, initPlannerUI } from './core/planner.js';
import { nombreVisible } from './auth/session.js';

let carrera = null;

// ── Temas ────────────────────────────────────────────────────────────────────
const TEMAS = ['dark', 'white', 'aqua', 'cream'];

function aplicarTema(nombre) {
  document.body.className = nombre === 'dark' ? '' : `theme-${nombre}`;
  document.querySelectorAll('.theme-swatch')
    .forEach(s => s.classList.toggle('active', s.dataset.tema === nombre));
  if (carrera) requestAnimationFrame(() => drawArrows(carrera, store.estados));
}

function initTemas() {
  const cont = document.getElementById('theme-switcher');
  for (const t of TEMAS) {
    const s = document.createElement('div');
    s.className = `theme-swatch swatch-${t}`;
    s.dataset.tema = t;
    s.title = t;
    s.addEventListener('click', () => {
      store.tema = t;
      aplicarTema(t);
      scheduleSave();
    });
    cont.appendChild(s);
  }
}

// ── Selector de carrera ──────────────────────────────────────────────────────
function initSelector() {
  const cont = document.getElementById('carrera-tabs');
  for (const c of CARRERAS) {
    const b = document.createElement('button');
    b.className = 'carrera-tab';
    b.dataset.carrera = c.id;
    b.textContent = c.titulo;
    if (!c.completo) b.classList.add('pendiente');
    b.title = c.completo ? c.nombre : `${c.nombre} — plan pendiente de carga`;
    b.addEventListener('click', () => irA(c.id));
    cont.appendChild(b);
  }
}

function irA(id) {
  carrera = getCarrera(id);
  store.carreraActiva = carrera.id;

  document.querySelectorAll('.carrera-tab')
    .forEach(b => b.classList.toggle('active', b.dataset.carrera === carrera.id));
  document.getElementById('titulo').innerHTML =
    `${carrera.titulo} <span>·</span> Plan de Estudios`;
  document.getElementById('subtitulo').textContent = `${carrera.nombre} — FCE · UBA`;

  const url = new URL(location);
  url.searchParams.set('c', carrera.id);
  history.replaceState(null, '', url);

  const hayPlan = carrera.completo;
  document.getElementById('malla').style.display = hayPlan ? 'block' : 'none';
  document.getElementById('sin-plan').style.display = hayPlan ? 'none' : 'block';
  document.getElementById('planner-btn').style.display = hayPlan ? 'block' : 'none';

  if (hayPlan) {
    initEstados(carrera, store.estados);
    renderAll(carrera);
  }
  scheduleSave();
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  initTemas();
  initSelector();
  initPlannerUI();

  const { migrado } = await cargar();

  aplicarTema(store.tema);
  document.getElementById('usuario').textContent = nombreVisible();
  document.getElementById('planner-btn')
    .addEventListener('click', () => openPlanner(carrera));

  const pedida = new URL(location).searchParams.get('c');
  irA(pedida || store.carreraActiva);

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  if (migrado) {
    console.info('Progreso importado desde las apps separadas de Actuario y Sistemas.');
  }
}

window.addEventListener('resize', () => {
  if (carrera?.completo) requestAnimationFrame(() => drawArrows(carrera, store.estados));
});

boot();
