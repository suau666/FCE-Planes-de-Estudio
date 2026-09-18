// Genera `db/seed.sql` desde los planes de `js/data/`.
//
// El catálogo de materias es la parte importante: el código es global, así que
// una materia compartida (241 Análisis Matemático, por ejemplo) entra UNA vez y
// las 5 carreras la referencian. Eso es lo que después deja preguntar cosas como
// "qué materia es la menos aprobada" sin importar de qué carrera venga cada uno.
//
// Correr con: npm run db:seed

import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CARRERAS } from '../js/data/index.js';

// Cuando una misma materia aparece con nombres distintos en cada plan (los
// planes nuevos acortaron varios), el catálogo necesita uno solo. Si aparece un
// código nuevo con nombres distintos y no está acá, la generación falla a
// propósito: hay que elegir el nombre a mano, no que lo adivine el script.
export const NOMBRES_CANONICOS = {
  241: 'Análisis Matemático',
  246: 'Historia Económica y Social General',
  249: 'Historia Económica y Social Argentina',
  252: 'Administración General',
  274: 'Sistemas Administrativos',
  542: 'Matemática Aplicada I',
};

const cita = s => `'${String(s).replace(/'/g, "''")}'`;

// { código → { nombre, variantes: { carrera → nombre } } }
export function catalogoDeMaterias(carreras = CARRERAS) {
  const porCodigo = {};
  for (const c of carreras) {
    for (const [id, m] of Object.entries(c.materias)) {
      if (m.optional) continue;
      (porCodigo[id] ??= {})[c.id] = m.name;
    }
  }

  const catalogo = [];
  const ambiguos = [];
  for (const codigo of Object.keys(porCodigo).sort((a, b) => a - b)) {
    const variantes = porCodigo[codigo];
    const nombres = [...new Set(Object.values(variantes))];
    let nombre = nombres[0];
    if (nombres.length > 1) {
      nombre = NOMBRES_CANONICOS[codigo];
      if (!nombre) { ambiguos.push({ codigo, nombres }); continue; }
    }
    catalogo.push({ codigo: Number(codigo), nombre, variantes });
  }

  if (ambiguos.length) {
    const detalle = ambiguos
      .map(a => `  ${a.codigo}: ${a.nombres.map(n => `"${n}"`).join(' / ')}`)
      .join('\n');
    throw new Error(
      'Estos códigos aparecen con nombres distintos y no tienen nombre canónico.\n' +
      'Agregalos a NOMBRES_CANONICOS en scripts/gen-db-seed.js:\n' + detalle);
  }
  return catalogo;
}

export function construirSeed(carreras = CARRERAS) {
  const catalogo = catalogoDeMaterias(carreras);
  const l = [];

  l.push('-- Generado por scripts/gen-db-seed.js — no editar a mano.');
  l.push('-- Regenerar con: npm run db:seed');
  l.push('');
  l.push('begin;');
  l.push('');

  l.push('-- Carreras ------------------------------------------------------------');
  l.push('insert into carreras (id, nombre, titulo, orden, optativas) values');
  l.push(carreras.map((c, i) => {
    const optativas = Object.values(c.materias).filter(m => m.optional).length;
    return `  (${cita(c.id)}, ${cita(c.nombre)}, ${cita(c.titulo)}, ${i + 1}, ${optativas})`;
  }).join(',\n') + '\non conflict (id) do update set');
  l.push('  nombre = excluded.nombre, titulo = excluded.titulo,');
  l.push('  orden = excluded.orden, optativas = excluded.optativas;');
  l.push('');

  l.push('-- Catálogo de materias: el código es global, la materia entra una sola vez.');
  l.push('insert into materias (codigo, nombre) values');
  l.push(catalogo.map(m => `  (${m.codigo}, ${cita(m.nombre)})`).join(',\n'));
  l.push('on conflict (codigo) do update set nombre = excluded.nombre;');
  l.push('');

  l.push('-- Qué materia cursa cada carrera, en qué tramo y dónde va en la grilla --');
  const filas = [];
  for (const c of carreras) {
    for (const [id, m] of Object.entries(c.materias)) {
      if (m.optional) continue;
      filas.push(`  (${cita(c.id)}, ${id}, ${m.tramo}, ` +
        `${m.col ?? 'null'}, ${m.row ?? 'null'}, ${cita(m.name)})`);
    }
  }
  l.push('insert into carrera_materias (carrera_id, codigo, tramo, col, fila, nombre_en_plan) values');
  l.push(filas.join(',\n'));
  l.push('on conflict (carrera_id, codigo) do update set');
  l.push('  tramo = excluded.tramo, col = excluded.col, fila = excluded.fila,');
  l.push('  nombre_en_plan = excluded.nombre_en_plan;');
  l.push('');

  l.push('-- Correlativas directas, por carrera (la misma materia puede pedir');
  l.push('-- distintas correlativas en cada plan). ----------------------------------');
  const correl = [];
  for (const c of carreras) {
    for (const [id, m] of Object.entries(c.materias)) {
      for (const p of m.prereqs || []) correl.push(`  (${cita(c.id)}, ${id}, ${p})`);
    }
  }
  l.push('delete from correlativas;');
  l.push('insert into correlativas (carrera_id, codigo, requiere_codigo) values');
  l.push(correl.join(',\n') + ';');
  l.push('');

  l.push('commit;');
  l.push('');
  return l.join('\n');
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sql = construirSeed();
  mkdirSync('db', { recursive: true });
  writeFileSync('db/seed.sql', sql);
  const catalogo = catalogoDeMaterias();
  const compartidas = catalogo.filter(m => Object.keys(m.variantes).length > 1);
  console.log(`db/seed.sql escrito: ${CARRERAS.length} carreras, ` +
    `${catalogo.length} materias (${compartidas.length} compartidas entre carreras).`);
}
