// Adapter de persistencia contra Neon. Misma interfaz que `local.js`:
// `load()` devuelve el documento de progreso (o null), `save(doc)` lo guarda.
//
// El documento de la app es un objeto plano; en la base se reparte en tablas
// para poder consultarlo (db/consultas.sql):
//
//   doc.estados["241"]            → progreso            (código global)
//   doc.estados["actuario:opt1"]  → progreso_optativas  (slot por carrera)
//   doc.porCarrera[c].optNames    → progreso_optativas.nombre
//   doc.porCarrera[c].plan        → progreso_plan.plan  (jsonb)
//   doc.carreras                  → perfil_carreras     (la que estudia)
//   doc.tema, doc.carreraActiva   → perfiles            (la última que miró)
//
// Sólo viajan las materias en regular o aprobada: "pendiente" y "puedo cursar"
// se calculan con las correlativas.

import { getClient, chequear } from '../db/client.js';
import { getUser } from '../auth/session.js';
import { DOC_VACIO } from './doc.js';

const A_DB = { approved: 'aprobada', regular: 'regular' };
const A_APP = { aprobada: 'approved', regular: 'regular' };

const esOptativa = clave => clave.includes(':');
const partirOptativa = clave => {
  const [carreraId, slot] = clave.split(':');
  return { carreraId, slot };
};

// Evita reescribir tablas que no cambiaron: el guardado corre cada vez que se
// toca una materia. Se reinicia al cambiar de usuario.
const CACHE_VACIA = { progreso: '', optativas: '', planes: '', perfil: '', carreras: '' };
let cache = { uid: null, ...CACHE_VACIA };

function distinto(campo, uid, valor) {
  const s = JSON.stringify(valor);
  if (cache.uid !== uid) cache = { uid, ...CACHE_VACIA };
  if (cache[campo] === s) return false;
  cache[campo] = s;
  return true;
}

function idUsuario() {
  const user = getUser();
  if (!user) throw new Error('No hay sesión abierta');
  return user.id;
}

export default {
  id: 'neon',
  etiqueta: 'Mi cuenta',

  async load() {
    const uid = idUsuario();
    const client = await getClient();

    const [perfil, progreso, optativas, planes, carreras] = await Promise.all([
      client.from('perfiles').select('carrera_id, tema').eq('id', uid).maybeSingle(),
      client.from('progreso').select('codigo, estado').eq('usuario_id', uid),
      client.from('progreso_optativas').select('carrera_id, slot, nombre, estado')
        .eq('usuario_id', uid),
      client.from('progreso_plan').select('carrera_id, plan').eq('usuario_id', uid),
      client.from('perfil_carreras').select('carrera_id, orden').eq('usuario_id', uid)
        .order('orden'),
    ]);

    const fila = chequear(perfil, 'leer el perfil');
    const materias = chequear(progreso, 'leer el progreso') || [];
    const opts = chequear(optativas, 'leer las optativas') || [];
    const mapas = chequear(planes, 'leer el planificador') || [];
    const estudia = chequear(carreras, 'leer tus carreras') || [];

    // Cuenta nueva: no hay nada que traer. `null` hace que state.js suba lo
    // que haya en este dispositivo.
    if (!fila && !materias.length && !opts.length && !mapas.length && !estudia.length) {
      return null;
    }

    const doc = structuredClone(DOC_VACIO);
    if (fila?.tema) doc.tema = fila.tema;
    if (fila?.carrera_id) doc.carreraActiva = fila.carrera_id;
    doc.carreras = estudia.map(c => c.carrera_id);

    for (const m of materias) doc.estados[m.codigo] = A_APP[m.estado] || 'pending';

    const slotDe = id => doc.porCarrera[id] ??= { optNames: {}, plan: {} };
    for (const o of opts) {
      const slot = slotDe(o.carrera_id);
      if (o.nombre) slot.optNames[o.slot] = o.nombre;
      if (o.estado) doc.estados[`${o.carrera_id}:${o.slot}`] = A_APP[o.estado];
    }
    for (const p of mapas) slotDe(p.carrera_id).plan = p.plan || {};

    cachearDesde(uid, doc);
    return doc;
  },

  async save(doc) {
    const uid = idUsuario();
    const client = await getClient();
    const { progreso, optativas, planes, perfil, carreras } = aFilas(uid, doc);

    // Cada bloque: primero borra lo que ya no está, después inserta el resto.
    // Las tres tablas son independientes entre sí.
    if (distinto('perfil', uid, perfil)) {
      chequear(await client.from('perfiles').upsert(perfil), 'guardar el perfil');
    }

    if (distinto('carreras', uid, carreras)) {
      chequear(await client.from('perfil_carreras').delete().eq('usuario_id', uid),
        'limpiar tus carreras');
      if (carreras.length) {
        chequear(await client.from('perfil_carreras').upsert(carreras,
          { onConflict: 'usuario_id,carrera_id' }), 'guardar tus carreras');
      }
    }

    if (distinto('progreso', uid, progreso)) {
      const codigos = progreso.map(p => p.codigo);
      let borrado = client.from('progreso').delete().eq('usuario_id', uid);
      if (codigos.length) borrado = borrado.not('codigo', 'in', `(${codigos.join(',')})`);
      chequear(await borrado, 'limpiar el progreso');
      if (progreso.length) {
        chequear(await client.from('progreso').upsert(progreso, { onConflict: 'usuario_id,codigo' }),
          'guardar el progreso');
      }
    }

    if (distinto('optativas', uid, optativas)) {
      chequear(await client.from('progreso_optativas').delete().eq('usuario_id', uid),
        'limpiar las optativas');
      if (optativas.length) {
        chequear(await client.from('progreso_optativas').upsert(optativas,
          { onConflict: 'usuario_id,carrera_id,slot' }), 'guardar las optativas');
      }
    }

    if (distinto('planes', uid, planes)) {
      chequear(await client.from('progreso_plan').delete().eq('usuario_id', uid),
        'limpiar el planificador');
      if (planes.length) {
        chequear(await client.from('progreso_plan').upsert(planes,
          { onConflict: 'usuario_id,carrera_id' }), 'guardar el planificador');
      }
    }
  },
};

// ── Documento → filas ────────────────────────────────────────────────────────

export function aFilas(uid, doc) {
  const perfil = {
    id: uid,
    carrera_id: doc.carreraActiva || null,
    tema: doc.tema || 'white',
  };

  // El orden es el que eligió: `orden` 1 es la principal.
  const carreras = (doc.carreras || []).map((carreraId, i) => ({
    usuario_id: uid, carrera_id: carreraId, orden: i + 1,
  }));

  const progreso = [];
  const estadoOpt = {};   // "carrera:slot" → estado
  for (const [clave, estado] of Object.entries(doc.estados || {})) {
    const enDb = A_DB[estado];
    if (!enDb) continue;                       // pendiente / puedo cursar no se guardan
    if (esOptativa(clave)) estadoOpt[clave] = enDb;
    else progreso.push({ usuario_id: uid, codigo: Number(clave), estado: enDb });
  }

  const optativas = [];
  const vistas = new Set();
  for (const [carreraId, slot] of Object.entries(doc.porCarrera || {})) {
    for (const [nombreSlot, nombre] of Object.entries(slot.optNames || {})) {
      const clave = `${carreraId}:${nombreSlot}`;
      vistas.add(clave);
      optativas.push({
        usuario_id: uid, carrera_id: carreraId, slot: nombreSlot,
        nombre: nombre || null, estado: estadoOpt[clave] || null,
      });
    }
  }
  // Optativas marcadas pero sin nombre escrito.
  for (const [clave, estado] of Object.entries(estadoOpt)) {
    if (vistas.has(clave)) continue;
    const { carreraId, slot } = partirOptativa(clave);
    optativas.push({ usuario_id: uid, carrera_id: carreraId, slot, nombre: null, estado });
  }

  const planes = [];
  for (const [carreraId, slot] of Object.entries(doc.porCarrera || {})) {
    if (Object.keys(slot.plan || {}).length) {
      planes.push({ usuario_id: uid, carrera_id: carreraId, plan: slot.plan });
    }
  }

  return { progreso, optativas, planes, perfil, carreras };
}

function cachearDesde(uid, doc) {
  const filas = aFilas(uid, doc);
  cache = { uid, ...Object.fromEntries(
    Object.entries(filas).map(([k, v]) => [k, JSON.stringify(v)])) };
}
