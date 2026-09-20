// Estado de la app y su persistencia.

import { adapterPara, local, DOC_VACIO, migrarDesdeAppsViejas } from '../storage/index.js';
import { getUser, mensajeDeError } from '../auth/session.js';

export const store = structuredClone(DOC_VACIO);

// { optNames, plan } de una carrera, creándolo si hace falta.
export function slotDe(carreraId) {
  return store.porCarrera[carreraId] ??= { optNames: {}, plan: {} };
}

// `initEstados` deja en `estados` también las pendientes y las que se pueden
// cursar, así que la presencia de claves no dice nada: progreso es haber
// marcado algo a mano.
export function hayProgreso(doc = store) {
  return Object.values(doc.estados || {}).some(e => e === 'regular' || e === 'approved');
}

// Deja `store` con el contenido de `doc` y nada de lo anterior: al entrar o
// salir de una cuenta el progreso tiene que cambiar entero, no mezclarse.
function reemplazar(doc) {
  for (const k of Object.keys(store)) delete store[k];
  Object.assign(store, structuredClone(DOC_VACIO), doc);
}

// Trae el progreso del adapter que corresponda a la sesión actual.
//   migrado → vino de las apps separadas de Actuario y Sistemas
//   subido  → cuenta nueva: se llevó lo que había en este dispositivo
export async function cargar() {
  const user = getUser();
  const adapter = adapterPara(user);
  let doc = null;
  let error = null;
  let migrado = false;
  let subido = false;

  try {
    doc = await adapter.load();
  } catch (e) {
    // La base no contestó: se sigue con lo que haya en este dispositivo para
    // no dejar la pantalla en blanco, pero se avisa.
    console.error('Error al traer el progreso:', e);
    error = mensajeDeError(e);
    // Se deja lo que ya estaba en pantalla: perder lo marcado por un error de
    // red sería peor que seguir mostrándolo.
    return { migrado, subido, error };
  }

  if (!doc && user) {
    // Cuenta recién creada. Se lleva, en orden: lo que la persona acaba de
    // marcar en esta visita, lo que hubiera quedado guardado en el navegador
    // de antes, y por último lo de las apps separadas.
    if (hayProgreso() || store.carreras?.length) doc = structuredClone(store);
    if (!doc) doc = await local.load();
    if (!doc) { doc = migrarDesdeAppsViejas(); migrado = Boolean(doc); }
    subido = Boolean(doc);
  }

  reemplazar(doc || {});

  // Fija la migración o la subida para no repetirlas.
  if (migrado || subido) {
    try {
      await adapter.save(store);
    } catch (e) {
      console.error('Error al subir el progreso:', e);
      error = mensajeDeError(e);
      subido = false;
    }
  }
  return { migrado, subido, error };
}

// ── Guardado con debounce ────────────────────────────────────────────────────
let timer = null;

export function scheduleSave() {
  clearTimeout(timer);
  timer = setTimeout(guardar, 800);
}

// Sin cuenta no hay nada que guardar. En vez de un cartel cada vez, se avisa
// una sola vez con un modal: lo hace main.js, que es quien lo sabe mostrar.
const oyentesSinCuenta = new Set();

export function onSinCuenta(fn) {
  oyentesSinCuenta.add(fn);
  return () => oyentesSinCuenta.delete(fn);
}

async function guardar() {
  if (!getUser()) {
    if (hayProgreso()) oyentesSinCuenta.forEach(fn => fn());
    return;
  }
  try {
    // Guardar bien no se anuncia: es lo que tiene que pasar siempre. El
    // cartelito queda sólo para cuando algo falla.
    await adapterPara(getUser()).save(store);
  } catch (e) {
    console.error('Error al guardar:', e);
    indicador(`✗ ${mensajeDeError(e)}`, 'error', 6000);
  }
}

// Lo usa también main.js para avisar de un error al abrir la app.
export function indicador(texto, clase, ms) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = texto;
  el.className = `save-indicator ${clase}`;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, ms);
}
