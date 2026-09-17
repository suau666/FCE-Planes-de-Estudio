// Verifica que el motor unificado reproduzca exactamente la lógica de las dos
// apps separadas de las que sale, y que los datos de cada carrera cierren.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CARRERAS, getCarrera } from '../js/data/index.js';
import { keyOf, prereqsMet, directPrereqs, arrowsDe, correlativas, faltantes } from '../js/core/rules.js';

const actuario = getCarrera('actuario');
const sistemas = getCarrera('sistemas');
const ESTADOS = ['pending', 'available', 'regular', 'approved'];

// Estados al azar, deterministas, con las claves que usa el motor.
function estadosAlAzar(carrera, seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out = {};
  for (const id in carrera.materias) {
    out[keyOf(carrera, id)] = ESTADOS[Math.floor(rnd() * ESTADOS.length)];
  }
  return out;
}

// ── Implementaciones originales, copiadas de las apps viejas ─────────────────

// actuario-plandeestudios/index.html
function prereqsMetActuarioOriginal(id, st) {
  const subjects = actuario.materias;
  const s = subjects[id];
  const atLeastRegular = x => st[x] === 'regular' || st[x] === 'approved';
  if (s.optional || s.tramo <= 2) return true;
  if (!s.prereqs.length) return true;
  return s.prereqs.every(p =>
    atLeastRegular(p) && (subjects[p].prereqs || []).every(gp => st[gp] === 'approved'));
}

// sistemas-plandeestudios/index.html
const CBC_IDS = [241, 242, 245, 246, 252, 254];
function prereqsMetSistemasOriginal(id, st) {
  const subjects = sistemas.materias;
  const s = subjects[id];
  const cbcCompleto = () => CBC_IDS.every(x => st[x] === 'approved');
  const allApproved = ids => ids.every(x => st[x] === 'approved');
  const allRegularOAprobada = ids =>
    ids.every(x => st[x] === 'regular' || st[x] === 'approved');
  const directOriginal = x => {
    const m = subjects[x];
    if (!m || m.optional || m.tramo === 1) return [];
    if (m.tramo === 2) return CBC_IDS;
    if (m.tramo === 3 && !m.prereqs.length) return CBC_IDS;
    return m.prereqs;
  };
  if (s.optional) return true;
  if (s.tramo === 1) return true;
  if (s.tramo === 2) return cbcCompleto();
  if (!s.prereqs.length) return cbcCompleto();
  if (!allRegularOAprobada(s.prereqs)) return false;
  return s.prereqs.every(p => allApproved(directOriginal(p)));
}

// ── Equivalencia ─────────────────────────────────────────────────────────────

test('Actuario: el motor unificado da lo mismo que la app original', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const st = estadosAlAzar(actuario, seed);
    for (const id in actuario.materias) {
      assert.equal(
        prereqsMet(actuario, id, st),
        prereqsMetActuarioOriginal(id, st),
        `actuario · materia ${id} · seed ${seed}`);
    }
  }
});

test('Sistemas: el motor unificado da lo mismo que la app original', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const st = estadosAlAzar(sistemas, seed);
    for (const id in sistemas.materias) {
      assert.equal(
        prereqsMet(sistemas, id, st),
        prereqsMetSistemasOriginal(id, st),
        `sistemas · materia ${id} · seed ${seed}`);
    }
  }
});

test('Sistemas exige el CBC completo; Actuario no tiene bloqueo de tramo', () => {
  const vacio = {};
  assert.equal(prereqsMet(sistemas, 248, vacio), false, 'tramo 2 sin CBC');
  assert.equal(prereqsMet(sistemas, 661, vacio), false, 'ciclo sin correlativas propias, sin CBC');

  const cbc = Object.fromEntries(CBC_IDS.map(id => [String(id), 'approved']));
  assert.equal(prereqsMet(sistemas, 248, cbc), true, 'tramo 2 con CBC aprobado');
  assert.equal(prereqsMet(sistemas, 661, cbc), true, 'ciclo con CBC aprobado');

  assert.equal(prereqsMet(actuario, 540, vacio), true, 'Actuario no bloquea el 2º tramo');
});

test('Regla en cadena: la directa alcanza regular, la abuela tiene que estar aprobada', () => {
  // 752 ← 544 ← 542.  542 es de tramo 2 (sin bloqueo en Actuario).
  assert.equal(prereqsMet(actuario, 752, { 544: 'regular', 542: 'approved' }), true);
  assert.equal(prereqsMet(actuario, 752, { 544: 'approved', 542: 'regular' }), false,
    'la abuela regularizada no alcanza');
  assert.equal(prereqsMet(actuario, 752, { 544: 'available', 542: 'approved' }), false,
    'la directa tiene que estar al menos regular');
});

// ── Claves de progreso ───────────────────────────────────────────────────────

test('los códigos numéricos son globales y las optativas propias de la carrera', () => {
  assert.equal(keyOf(actuario, 241), '241');
  assert.equal(keyOf(sistemas, 241), '241', 'una materia compartida usa la misma clave');
  assert.equal(keyOf(actuario, 'opt1'), 'actuario:opt1');
  assert.equal(keyOf(sistemas, 'opt1'), 'sistemas:opt1');
});

test('Actuario y Sistemas comparten materias por código', () => {
  const compartidas = Object.keys(actuario.materias)
    .filter(id => !isNaN(id) && sistemas.materias[id]);
  assert.ok(compartidas.length >= 4,
    `esperaba materias compartidas, encontré ${compartidas.length}`);
  for (const id of compartidas) {
    assert.equal(keyOf(actuario, id), keyOf(sistemas, id));
  }
});

// ── Flechas ──────────────────────────────────────────────────────────────────

test('las flechas se derivan de las correlativas del ciclo', () => {
  for (const carrera of CARRERAS.filter(c => c.completo)) {
    const flechas = arrowsDe(carrera);
    const esperadas = [];
    for (const id in carrera.materias) {
      const m = carrera.materias[id];
      if (m.tramo !== 3 || m.optional) continue;
      for (const p of m.prereqs || []) {
        if (carrera.materias[p]?.tramo === 3) esperadas.push(`${p}-${id}`);
      }
    }
    assert.deepEqual(
      [...flechas.map(([a, b]) => `${a}-${b}`)].sort(),
      esperadas.sort(),
      carrera.id);
  }
});

test('arrowOrder y arrowHints sólo mencionan flechas que existen', () => {
  for (const carrera of CARRERAS.filter(c => c.completo)) {
    const reales = new Set(arrowsDe(carrera).map(([a, b]) => `${a}-${b}`));
    for (const [a, b] of carrera.arrowOrder || []) {
      assert.ok(reales.has(`${a}-${b}`),
        `${carrera.id}: arrowOrder tiene ${a}-${b}, que no es correlativa`);
    }
    for (const k of Object.keys(carrera.arrowHints || {})) {
      assert.ok(reales.has(k), `${carrera.id}: arrowHints tiene ${k}, que no es correlativa`);
    }
  }
});

// ── Integridad de los datos ──────────────────────────────────────────────────

test('toda correlativa apunta a una materia que existe', () => {
  for (const carrera of CARRERAS) {
    for (const [id, m] of Object.entries(carrera.materias)) {
      for (const p of m.prereqs || []) {
        assert.ok(carrera.materias[p],
          `${carrera.id}: ${id} depende de ${p}, que no está en el plan`);
      }
    }
  }
});

test('los ids de cada tramo existen y coinciden con el tramo declarado', () => {
  for (const carrera of CARRERAS) {
    for (const tramo of carrera.tramos) {
      for (const id of tramo.ids) {
        const m = carrera.materias[id];
        assert.ok(m, `${carrera.id}: el tramo ${tramo.id} lista ${id}, que no existe`);
        assert.equal(m.tramo, tramo.id, `${carrera.id}: ${id} está en el tramo equivocado`);
      }
    }
  }
});

test('toda materia de un tramo previo está listada en su tramo', () => {
  for (const carrera of CARRERAS) {
    const listados = new Set(carrera.tramos.flatMap(t => t.ids.map(String)));
    for (const [id, m] of Object.entries(carrera.materias)) {
      if (m.optional || m.tramo === 3) continue;
      assert.ok(listados.has(id),
        `${carrera.id}: ${id} es del tramo ${m.tramo} pero no lo lista ningún tramo`);
    }
  }
});

test('las materias del ciclo tienen posición y no se pisan', () => {
  for (const carrera of CARRERAS) {
    const ocupadas = new Map();
    for (const [id, m] of Object.entries(carrera.materias)) {
      if (m.tramo !== 3 || m.optional) continue;
      assert.ok(Number.isInteger(m.col) && m.col >= 1,
        `${carrera.id}: ${id} sin columna válida (el grid es 1-based)`);
      assert.ok(Number.isInteger(m.row) && m.row >= 1,
        `${carrera.id}: ${id} sin fila válida (el grid es 1-based)`);
      assert.ok(m.col <= carrera.ciclo.cols,
        `${carrera.id}: ${id} está en la columna ${m.col} y el ciclo tiene ${carrera.ciclo.cols}`);
      const celda = `${m.col},${m.row}`;
      assert.ok(!ocupadas.has(celda),
        `${carrera.id}: ${id} y ${ocupadas.get(celda)} caen en la misma celda (${celda})`);
      ocupadas.set(celda, id);
    }
  }
});

// Pares en la misma fila: la flecha sale y entra casi a la misma altura y se
// dibuja como un rulo. No rompe nada y el layout original ya los tenía, pero
// cualquiera NUEVO conviene verlo antes de que se cuele.
const HORIZONTALES_CONOCIDAS = new Set([
  // Ya estaban así en la app original de Actuario: el ciclo tiene cadenas de
  // 6 niveles metidas en 5 filas, así que algunas quedaron acostadas.
  'actuario:754-756',
  'actuario:754-757',
  'actuario:746-717',
  // Nueva: 279 declara 601 como correlativa pero la app original no dibujaba
  // esa flecha. Queda pendiente de confirmar contra el plan real (ver README).
  'actuario:601-279',
]);

test('ninguna flecha del ciclo apunta hacia arriba', () => {
  for (const carrera of CARRERAS) {
    for (const [id, m] of Object.entries(carrera.materias)) {
      if (m.tramo !== 3 || m.optional) continue;
      for (const p of m.prereqs || []) {
        const pm = carrera.materias[p];
        if (pm?.tramo !== 3) continue;
        assert.ok(pm.row <= m.row,
          `${carrera.id}: ${id} (fila ${m.row}) depende de ${p} (fila ${pm.row}); ` +
          `la flecha iría hacia arriba`);
      }
    }
  }
});

test('no aparecieron flechas horizontales nuevas', () => {
  const encontradas = [];
  for (const carrera of CARRERAS) {
    for (const [id, m] of Object.entries(carrera.materias)) {
      if (m.tramo !== 3 || m.optional) continue;
      for (const p of m.prereqs || []) {
        const pm = carrera.materias[p];
        if (pm?.tramo === 3 && pm.row === m.row) encontradas.push(`${carrera.id}:${p}-${id}`);
      }
    }
  }
  const nuevas = encontradas.filter(k => !HORIZONTALES_CONOCIDAS.has(k));
  assert.deepEqual(nuevas, [],
    'materias con una correlativa en su misma fila: movelas una fila más abajo');
});

test('no hay ciclos de correlatividad', () => {
  for (const carrera of CARRERAS) {
    const visitando = new Set(), listo = new Set();
    const bajar = id => {
      if (listo.has(id)) return;
      assert.ok(!visitando.has(id), `${carrera.id}: ciclo de correlativas en ${id}`);
      visitando.add(id);
      for (const p of directPrereqs(carrera, id)) bajar(String(p));
      visitando.delete(id);
      listo.add(id);
    };
    for (const id in carrera.materias) bajar(id);
  }
});

test('las carreras sin plan quedan consistentes', () => {
  for (const carrera of CARRERAS.filter(c => !c.completo)) {
    assert.deepEqual(carrera.materias, {}, `${carrera.id}: marcada incompleta pero tiene materias`);
    assert.equal(correlativas(carrera, 999).ids.length, 0);
  }
});

test('cada carrera tiene id, nombre y título únicos', () => {
  const ids = CARRERAS.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  const titulos = CARRERAS.map(c => c.titulo);
  assert.equal(new Set(titulos).size, titulos.length, 'títulos repetidos');
});

// ── Contador, Administración y Economía ──────────────────────────────────────

const aprobadas = ids => Object.fromEntries(ids.map(id => [String(id), 'approved']));

test('las 5 carreras tienen su plan cargado', () => {
  assert.deepEqual(CARRERAS.filter(c => !c.completo).map(c => c.id), []);
});

test('Contador: el segundo tramo y el ciclo exigen el primer tramo aprobado', () => {
  const contador = getCarrera('contador');
  const primero = aprobadas(contador.tramos[0].ids);
  assert.equal(prereqsMet(contador, 248, {}), false);
  assert.equal(prereqsMet(contador, 248, primero), true);
  assert.equal(prereqsMet(contador, 278, {}), false, 'Macro no tiene correlativas propias');
  assert.equal(prereqsMet(contador, 278, primero), true);
  // 1352 ← 351 y 353, que a su vez piden 247 aprobada.
  assert.equal(prereqsMet(contador, 1352, { 351: 'regular', 353: 'regular', 247: 'approved' }), true);
  assert.equal(prereqsMet(contador, 1352, { 351: 'regular', 353: 'regular', 247: 'regular' }), false);
});

test('Economía: todo el ciclo profesional arranca con el Ciclo General', () => {
  const economia = getCarrera('economia');
  assert.equal(economia.tramos.length, 1);
  for (const id of [540, 542, 262, 541]) {
    assert.equal(prereqsMet(economia, id, {}), false, `${id} sin Ciclo General`);
    assert.equal(prereqsMet(economia, id, aprobadas(economia.tramos[0].ids)), true, `${id} con Ciclo General`);
  }
  assert.deepEqual(directPrereqs(economia, 548).map(Number).sort(), [255, 283, 546, 549]);
});

test('Administración: la Práctica Profesional pide 23 materias regularizadas', () => {
  const adm = getCarrera('administracion');
  const primero = adm.tramos[0].ids.map(String);
  const resto = Object.keys(adm.materias)
    .filter(id => !adm.materias[id].optional && id !== '473' && !primero.includes(id));
  // n materias en total: el primer tramo aprobado y el resto regularizadas.
  const conN = n => ({
    ...Object.fromEntries(resto.slice(0, n - primero.length).map(id => [id, 'regular'])),
    ...aprobadas(primero),
  });
  assert.equal(prereqsMet(adm, 473, conN(22)), false);
  assert.equal(faltantes(adm, 473, conN(22)).cantidad, 1);
  assert.equal(prereqsMet(adm, 473, conN(23)), true);
  assert.equal(faltantes(adm, 473, conN(23)).cantidad, 0);
  // las optativas no cuentan
  const conOptativas = { ...conN(22), 'administracion:opt1': 'approved' };
  assert.equal(prereqsMet(adm, 473, conOptativas), false);
});
