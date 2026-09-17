// Contador Público — FCE · UBA · Plan 2019 (Res. CS 1509/18) con su modificatoria
//
// Fuentes: Código UBA, Libro IV, Título 3, Cap. A (correlativas) y el gráfico
// del CECE "Plan de estudios 2025" (códigos). La modificatoria reemplaza
// Contabilidad Social y Ambiental (1330) y Contabilidad Gubernamental y
// Control de Gestión (1374) por una segunda optativa. Quienes entraron al
// segundo tramo en 2020 siguen con esas dos materias y una sola optativa.
//
// El Taller de Práctica Profesional en Organizaciones (1361) pide en el texto
// oficial 21, 25, 27 y 28; sin la 25 (1330) quedan 279, 273 y 355.
//
// Layout del Ciclo Profesional (grid 1-based, 6 columnas):
//   fila 1: 274(c1) 276(c2) 351(c3) 353(c4) 1359(c5) 278(c6)
//   fila 2: 275(c1) 279(c2) 1352(c3) 362(c4) 273(c5) 354(c6)
//   fila 3:                 356(c3)  355(c4)         1360(c6)
//   fila 4:         1361(c2) 357(c3)         1358(c5)

export default {
  id: 'contador',
  nombre: 'Contador Público',
  titulo: 'Contador',
  completo: true,

  ciclo: { cols: 6, gapY: 60 },

  tramos: [
    { id: 1, label: 'Primer<br>Tramo', cols: 6, gate: null,
      ids: [245, 241, 242, 246, 244, 243] },
    // El segundo tramo exige el primero completo y aprobado.
    { id: 2, label: 'Segundo<br>Tramo', cols: 6, gate: 1,
      ids: [248, 252, 250, 247, 249, 251] },
  ],

  cicloGate: 1,

  materias: {
    // Primer tramo
    245:  { name: 'Álgebra',                          tramo: 1 },
    241:  { name: 'Análisis Matemático I',            tramo: 1 },
    242:  { name: 'Economía',                         tramo: 1 },
    246:  { name: 'Historia Ec. y Social General',    tramo: 1 },
    244:  { name: 'Metodología de las Cs. Sociales',  tramo: 1 },
    243:  { name: 'Sociología',                       tramo: 1 },

    // Segundo tramo
    248:  { name: 'Estadística I',                    tramo: 2 },
    252:  { name: 'Administración General',           tramo: 2 },
    250:  { name: 'Microeconomía I',                  tramo: 2 },
    247:  { name: 'Teoría Contable',                  tramo: 2 },
    249:  { name: 'Historia Ec. y Social Arg.',       tramo: 2 },
    251:  { name: 'Inst. de Derecho Público',         tramo: 2 },

    // Ciclo Profesional
    274:  { name: 'Sistemas Administrativos',         tramo: 3, col: 1, row: 1, prereqs: [252] },
    276:  { name: 'Cálculo Financiero',               tramo: 3, col: 2, row: 1, prereqs: [248] },
    351:  { name: 'Sistemas Contables',               tramo: 3, col: 3, row: 1, prereqs: [247] },
    353:  { name: 'Sistemas de Costos',               tramo: 3, col: 4, row: 1, prereqs: [247] },
    1359: { name: 'Derecho Económico',                tramo: 3, col: 5, row: 1, prereqs: [] },
    278:  { name: 'Macroeconomía y Pol. Eco.',        tramo: 3, col: 6, row: 1, prereqs: [] },

    275:  { name: 'Tecnología de la Información',     tramo: 3, col: 1, row: 2, prereqs: [274] },
    279:  { name: 'Administración Financiera',        tramo: 3, col: 2, row: 2, prereqs: [276] },
    1352: { name: 'Contabilidad Financiera',          tramo: 3, col: 3, row: 2, prereqs: [351, 353] },
    362:  { name: 'Gestión y Costos p/Contadores',    tramo: 3, col: 4, row: 2, prereqs: [353] },
    273:  { name: 'Inst. de Derecho Privado',         tramo: 3, col: 5, row: 2, prereqs: [1359] },
    354:  { name: 'Dcho. del Trabajo y Seg. Social',  tramo: 3, col: 6, row: 2, prereqs: [251, 1359] },

    356:  { name: 'Teoría y Técnica Impositiva I',    tramo: 3, col: 3, row: 3, prereqs: [251, 1352] },
    355:  { name: 'Auditoría',                        tramo: 3, col: 4, row: 3, prereqs: [362, 1352] },
    1360: { name: 'Dcho. Crediticio, Bursátil e Insolv.', tramo: 3, col: 6, row: 3, prereqs: [273, 354] },

    1361: { name: 'Taller Práct. Prof. en Organizaciones', tramo: 3, col: 2, row: 4, prereqs: [279, 273, 355] },
    357:  { name: 'Teoría y Técnica Impositiva II',   tramo: 3, col: 3, row: 4, prereqs: [356] },
    1358: { name: 'Taller Actuación Prof. Judicial',  tramo: 3, col: 5, row: 4, prereqs: [355, 1360] },

    opt1: { label: 'Optativa 1', optional: true },
    opt2: { label: 'Optativa 2', optional: true },
  },

  arrowOrder: [
    [274, 275], [276, 279],
    [351, 1352], [353, 1352], [353, 362],
    [1359, 273], [1359, 354],
    [1352, 356], [1352, 355], [362, 355],
    [273, 1360], [354, 1360],
    [279, 1361], [273, 1361], [355, 1361],
    [356, 357],
    [355, 1358], [1360, 1358],
  ],
};
