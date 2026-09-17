// Estado de la app y su persistencia.

import { adapterPara, DOC_VACIO, migrarDesdeAppsViejas } from '../storage/index.js';
import { getUser } from '../auth/session.js';

export const store = structuredClone(DOC_VACIO);

// { optNames, plan } de una carrera, creándolo si hace falta.
export function slotDe(carreraId) {
  return store.porCarrera[carreraId] ??= { optNames: {}, plan: {} };
}

export async function cargar() {
  const adapter = adapterPara(getUser());
  let doc = await adapter.load();

  if (!doc) {
    doc = migrarDesdeAppsViejas();
    if (doc) {
      Object.assign(store, doc);
      await adapter.save(store);   // fija la migración para no repetirla
      return { migrado: true };
    }
    return { migrado: false };
  }

  Object.assign(store, doc);
  return { migrado: false };
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
