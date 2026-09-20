import { CARRERAS, getCarrera } from './data/index.js';
import { store, cargar, scheduleSave, indicador } from './core/state.js';
import { initEstados } from './core/rules.js';
import { renderAll } from './core/render.js';
import { drawArrows } from './core/arrows.js';
import { openPlanner, initPlannerUI } from './core/planner.js';
import {
  initSesion, signIn, signUp, signOut, getUser, nombreVisible, mensajeDeError,
} from './auth/session.js';
import { hayNeon } from './config.js';

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

// ── Login ────────────────────────────────────────────────────────────────────
// El modal hace las dos cosas: entrar y crear cuenta. Cambia de modo con el
// link de abajo; lo único distinto es el campo de nombre y a qué función llama.

let modoRegistro = false;

const $ = id => document.getElementById(id);

function pintarSesion() {
  $('usuario').textContent = nombreVisible();
  $('auth-btn').textContent = getUser() ? 'Salir' : 'Entrar';
  $('auth-btn').title = getUser()
    ? `Cerrar la sesión de ${nombreVisible()}`
    : 'Guardar el progreso en tu cuenta';
}

function pintarModo() {
  $('auth-titulo').innerHTML = modoRegistro
    ? 'Crear cuenta <span>·</span> Mi progreso'
    : 'Entrar <span>·</span> Mi progreso';
  $('auth-sub').textContent = modoRegistro
    ? 'Lo que ya marcaste en este dispositivo se sube a la cuenta nueva.'
    : 'Con una cuenta, el progreso te sigue a cualquier dispositivo.';
  $('auth-nombre-campo').style.display = modoRegistro ? 'flex' : 'none';
  $('auth-submit').textContent = modoRegistro ? 'Crear cuenta' : 'Entrar';
  $('auth-cambiar-texto').textContent = modoRegistro
    ? '¿Ya tenés cuenta?' : '¿Todavía no tenés cuenta?';
  $('auth-cambiar').textContent = modoRegistro ? 'Entrar' : 'Crear una';
  $('auth-password').autocomplete = modoRegistro ? 'new-password' : 'current-password';
  $('auth-error').textContent = '';
}

// Revisa el formulario antes de molestar al servidor. Devuelve el mensaje a
// mostrar, o null si está todo bien.
function revisarDatos({ email, password }) {
  if (!email) return 'Escribí tu mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ese mail no parece válido.';
  if (!password) return 'Escribí tu contraseña.';
  if (password.length < 8) return 'La contraseña necesita al menos 8 caracteres.';
  return null;
}

function abrirModal() {
  pintarModo();
  $('auth-overlay').style.display = 'flex';
  $('auth-email').focus();
}

function cerrarModal() {
  $('auth-overlay').style.display = 'none';
  $('auth-form').reset();
  $('auth-error').textContent = '';
}

// Después de entrar o salir, el progreso es otro: hay que traerlo y redibujar.
async function recargarProgreso() {
  const { subido, error } = await cargar();
  pintarSesion();
  aplicarTema(store.tema);
  irA(store.carreraActiva);
  if (error) indicador(`✗ ${error}`, 'error', 6000);
  else if (subido) indicador('✓ Tu progreso quedó en la cuenta', 'saved', 4000);
}

function initAuthUI() {
  pintarSesion();

  // Sin Neon configurado no hay cuentas: el progreso vive en el dispositivo.
  if (!hayNeon) { $('auth-btn').style.display = 'none'; return; }

  $('auth-btn').addEventListener('click', async () => {
    if (!getUser()) return abrirModal();
    try {
      await signOut();
    } catch (err) {
      indicador(`✗ ${mensajeDeError(err)}`, 'error', 6000);
    }
    await recargarProgreso();
  });

  $('auth-cerrar').addEventListener('click', cerrarModal);
  $('auth-overlay').addEventListener('click', e => {
    if (e.target === $('auth-overlay')) cerrarModal();
  });
  $('auth-cambiar').addEventListener('click', () => {
    modoRegistro = !modoRegistro;
    pintarModo();
  });

  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const datos = {
      email: $('auth-email').value.trim(),
      password: $('auth-password').value,
      nombre: $('auth-nombre').value.trim(),
    };

    const problema = revisarDatos(datos);
    if (problema) { $('auth-error').textContent = problema; return; }

    $('auth-submit').disabled = true;
    $('auth-error').textContent = '';
    try {
      await (modoRegistro ? signUp(datos) : signIn(datos));
      cerrarModal();
      await recargarProgreso();
    } catch (err) {
      $('auth-error').textContent = mensajeDeError(err);
    } finally {
      $('auth-submit').disabled = false;
    }
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  initTemas();
  initSelector();
  initPlannerUI();

  await initSesion();
  const { migrado, subido, error } = await cargar();

  aplicarTema(store.tema);
  initAuthUI();
  document.getElementById('planner-btn')
    .addEventListener('click', () => openPlanner(carrera));

  const pedida = new URL(location).searchParams.get('c');
  irA(pedida || store.carreraActiva);

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  if (error) indicador(`✗ ${error}`, 'error', 7000);
  else if (subido) indicador('✓ Tu progreso quedó en la cuenta', 'saved', 4000);
  else if (migrado) indicador('✓ Progreso importado de las apps viejas', 'saved', 4000);
}

// Si el arranque se rompe (un import que no carga, la base caída), lo peor que
// puede pasar es quedarse mirando los puntitos: mejor mostrar qué pasó.
function bootRoto(e) {
  console.error('Error al arrancar:', e);
  const pantalla = document.getElementById('loading-screen');
  pantalla.innerHTML = '';
  const aviso = document.createElement('p');
  aviso.className = 'boot-error';
  aviso.textContent = `No pude arrancar la app. ${mensajeDeError(e)} Probá recargar la página.`;
  pantalla.appendChild(aviso);
}

window.addEventListener('resize', () => {
  if (carrera?.completo) requestAnimationFrame(() => drawArrows(carrera, store.estados));
});

boot().catch(bootRoto);
