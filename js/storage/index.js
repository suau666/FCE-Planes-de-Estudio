// Elige dónde se guarda el progreso y recupera lo que haya quedado guardado
// en este dispositivo de antes.
//
// Con sesión abierta el progreso va a Neon. Sin sesión no se guarda: se puede
// probar la app, pero al volver no queda nada. El resto de la app no se
// entera; los tres adapters tienen `load()` y `save()`.

import local from './local.js';
import memoria from './memoria.js';
import remoto from './remote.js';
import { DOC_VACIO } from './doc.js';

export { DOC_VACIO, local, memoria, remoto };

export function adapterPara(user) {
  return user ? remoto : memoria;
}

// ── Migración de las apps separadas ──────────────────────────────────────────
// `actuario_progress` y `sistemas_progress` guardaban { states, opt_names,
// theme, plan }. Los códigos numéricos pasan al progreso global; si una materia
// compartida (el CBC, por ejemplo) figura en las dos con estados distintos,
// gana el más avanzado.

const RANK = { pending: 0, available: 1, regular: 2, approved: 3 };
const VIEJAS = [
  ['actuario', 'actuario_progress'],
  ['sistemas', 'sistemas_progress'],
];

export function migrarDesdeAppsViejas() {
  const doc = structuredClone(DOC_VACIO);
  let encontrado = false;

  for (const [carreraId, key] of VIEJAS) {
    let row;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      row = JSON.parse(raw);
    } catch { continue; }

    encontrado = true;
    const slot = doc.porCarrera[carreraId] = { optNames: {}, plan: {} };

    for (const [id, estado] of Object.entries(row.states || {})) {
      const k = id.startsWith('opt') ? `${carreraId}:${id}` : id;
      if ((RANK[estado] ?? 0) > (RANK[doc.estados[k]] ?? -1)) doc.estados[k] = estado;
    }
    if (row.opt_names) slot.optNames = { ...row.opt_names };
    if (row.plan) slot.plan = { ...row.plan };
    if (row.theme) doc.tema = row.theme;
    doc.carreraActiva = carreraId;
  }

  return encontrado ? doc : null;
}
