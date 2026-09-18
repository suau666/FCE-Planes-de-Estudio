// Registro de carreras. El orden es el del selector.
//
// Forma de cada plan (ver `actuario.js` o `contador.js`):
//   tramos[]      → los tramos previos al ciclo, con sus ids en orden de display
//                   y `gate` (id del tramo que hay que tener aprobado entero, o null)
//   cicloGate     → id del tramo exigido a las materias del ciclo sin correlativas propias
//   materias{}    → { código: { name, tramo, col, row, prereqs:[códigos], minRegulares? } }
//                   col/row son 1-based (posición en el grid del ciclo)
//   arrowOrder[]  → opcional, ordena el reparto de flechas
// Los códigos son globales: si una materia ya figura en otro plan, reusá su
// código y el progreso se comparte entre carreras.

import actuario from './actuario.js';
import administracion from './administracion.js';
import contador from './contador.js';
import economia from './economia.js';
import sistemas from './sistemas.js';

// Orden alfabético: es el del selector y el de la base de datos.
export const CARRERAS = [actuario, administracion, contador, economia, sistemas];

const byId = Object.fromEntries(CARRERAS.map(c => [c.id, c]));

export function getCarrera(id) {
  return byId[id] || CARRERAS[0];
}

// Todas las materias con código numérico, de todas las carreras. Se usa para
// mostrar de dónde viene una materia compartida.
export function carrerasDe(codigo) {
  return CARRERAS.filter(c => c.materias[codigo]).map(c => c.titulo);
}
