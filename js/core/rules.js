// Motor de correlatividades, común a las 5 carreras.
//
// Régimen FCE: para CURSAR una materia, sus correlativas directas tienen que
// estar al menos REGULARIZADAS, y las correlativas de esas, APROBADAS con final.
// Los tramos previos (CBC, segundo tramo) funcionan como BLOQUE: se exigen
// completos y aprobados. Qué tramo bloquea a qué lo declara cada carrera con
// `tramos[].gate` y `cicloGate`; si no declara ninguno, no hay bloqueo.

export const ESTADOS = ['pending', 'available', 'regular', 'approved'];

// Clave de progreso. Los códigos numéricos son GLOBALES: aprobar 241 vale para
// las 5 carreras, que comparten CBC y parte del segundo tramo. Las optativas,
// en cambio, son propias de cada carrera.
export function keyOf(carrera, id) {
  return carrera.materias[id]?.optional ? `${carrera.id}:${id}` : String(id);
}

function tramoDe(carrera, n) {
  return carrera.tramos.find(t => t.id === n);
}

function idsDeTramo(carrera, n) {
  if (!n) return [];
  return tramoDe(carrera, n)?.ids || [];
}

// Correlativas directas de una materia y con qué exigencia:
//   'cadena' → las propias (regular alcanza; las de ellas, aprobadas)
//   'bloque' → un tramo entero, todo aprobado
export function correlativas(carrera, id) {
  const m = carrera.materias[id];
  if (!m || m.optional) return { ids: [], modo: 'cadena' };
  if (m.prereqs?.length) return { ids: m.prereqs, modo: 'cadena' };
  const gate = m.tramo === 3 ? carrera.cicloGate : tramoDe(carrera, m.tramo)?.gate;
  return { ids: idsDeTramo(carrera, gate), modo: 'bloque' };
}

export function directPrereqs(carrera, id) {
  return correlativas(carrera, id).ids;
}

const esta = (carrera, estados, id, ...ok) => ok.includes(estados[keyOf(carrera, id)]);

// Las prácticas profesionales piden además una CANTIDAD de materias
// regularizadas (p. ej. "23 asignaturas regularizadas"): `minRegulares`.
// Cuentan las obligatorias de la carrera, sin contar la propia práctica.
export function regularesDe(carrera, id, estados) {
  return Object.keys(carrera.materias).filter(c =>
    c !== String(id) && !carrera.materias[c].optional &&
    esta(carrera, estados, c, 'regular', 'approved')).length;
}

export function prereqsMet(carrera, id, estados) {
  const minimo = carrera.materias[id]?.minRegulares;
  if (minimo && regularesDe(carrera, id, estados) < minimo) return false;
  const { ids, modo } = correlativas(carrera, id);
  if (!ids.length) return true;
  if (modo === 'bloque') return ids.every(c => esta(carrera, estados, c, 'approved'));
  return ids.every(c =>
    esta(carrera, estados, c, 'regular', 'approved') &&
    directPrereqs(carrera, c).every(g => esta(carrera, estados, g, 'approved'))
  );
}

// Qué falta para poder cursar `id`. Alimenta el tooltip.
export function faltantes(carrera, id, estados) {
  const { ids, modo } = correlativas(carrera, id);
  const nombre = c => `${c} – ${carrera.materias[c]?.name || c}`;
  const minimo = carrera.materias[id]?.minRegulares;
  const cantidad = minimo
    ? Math.max(0, minimo - regularesDe(carrera, id, estados))
    : 0;
  if (modo === 'bloque') {
    return {
      regularizar: [],
      aprobar: ids.filter(c => !esta(carrera, estados, c, 'approved')).map(nombre),
      cantidad,
    };
  }
  const abuelas = [...new Set(ids.flatMap(c => directPrereqs(carrera, c)))];
  return {
    regularizar: ids.filter(c => !esta(carrera, estados, c, 'regular', 'approved')).map(nombre),
    aprobar: abuelas.filter(g => !esta(carrera, estados, g, 'approved')).map(nombre),
    cantidad,
  };
}

// Deja `estados` consistente: lo aprobado/regular no se toca, el resto pasa a
// available o pending según las correlativas.
export function recalc(carrera, estados) {
  for (const id in carrera.materias) {
    const k = keyOf(carrera, id);
    if (estados[k] === 'approved' || estados[k] === 'regular') continue;
    estados[k] = prereqsMet(carrera, id, estados) ? 'available' : 'pending';
  }
}

export function initEstados(carrera, estados) {
  for (const id in carrera.materias) {
    const k = keyOf(carrera, id);
    if (estados[k] === undefined) estados[k] = 'pending';
  }
  recalc(carrera, estados);
}

export function cycleEstado(estado) {
  return estado === 'available' ? 'regular'
       : estado === 'regular'   ? 'approved'
       : 'available';
}

// Flechas del ciclo profesional, derivadas de `prereqs` — una sola fuente de
// verdad, así el dibujo no puede desincronizarse de la regla que se aplica.
// `arrowOrder` sólo reordena (el orden decide el reparto horizontal).
export function arrowsDe(carrera) {
  const enCiclo = id => carrera.materias[id]?.tramo === 3 && !carrera.materias[id].optional;
  const derivadas = [];
  for (const id in carrera.materias) {
    if (!enCiclo(id)) continue;
    for (const p of carrera.materias[id].prereqs || []) {
      if (enCiclo(p)) derivadas.push([Number(p), Number(id)]);
    }
  }
  const orden = carrera.arrowOrder || [];
  const rank = new Map(orden.map(([a, b], i) => [`${a}-${b}`, i]));
  const sobrantes = orden.filter(([a, b]) =>
    !derivadas.some(([x, y]) => x === a && y === b));
  if (sobrantes.length) {
    console.warn(`[${carrera.id}] arrowOrder declara flechas que no son correlativas:`, sobrantes);
  }
  return derivadas.sort((p, q) =>
    (rank.get(`${p[0]}-${p[1]}`) ?? 1e6) - (rank.get(`${q[0]}-${q[1]}`) ?? 1e6));
}
