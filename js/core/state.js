// Estado de la app y su persistencia.

import { adapterPara, local, DOC_VACIO, migrarDesdeAppsViejas } from '../storage/index.js';
import { getUser } from '../auth/session.js';

export const store = structuredClone(DOC_VACIO);

// { optNames, plan } de una carrera, creándolo si hace falta.
export function slotDe(carreraId) {
  return store.porCarrera[carreraId] ??= { optNames: {}, plan: {} };
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
  let doc = await adapter.load();
  let migrado = false;
  let subido = false;

  if (!doc) {
    // Cuenta recién creada: se lleva lo de este dispositivo, si hay algo.
    if (user) doc = await local.load();
    if (!doc) { doc = migrarDesdeAppsViejas(); migrado = Boolean(doc); }
    subido = Boolean(user && doc);
  }

  reemplazar(doc || {});
  // Fija la migración o la subida para no repetirlas.
  if (migrado || subido) await adapter.save(store);
  return { migrado, subido };
}

// ── Guardado con debounce ────────────────────────────────────────────────────
let timer = null;

export function scheduleSave() {
  clearTimeout(timer);
  timer = setTimeout(guardar, 800);
}

async function guardar() {
  try {
    await adapterPara(getUser()).save(store);
    indicador('✓ Guardado', 'saved', 1800);
  } catch (e) {
    console.error('Error al guardar:', e);
    indicador('✗ Error al guardar', 'error', 3000);
  }
}

function indicador(texto, clase, ms) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = texto;
  el.className = `save-indicator ${clase}`;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, ms);
}
