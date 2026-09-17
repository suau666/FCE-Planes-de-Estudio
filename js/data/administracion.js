// Licenciatura en Administración — FCE · UBA · Plan 2024
//
// Fuentes: Código UBA, Libro IV, Título 4, Cap. A (correlativas) y el gráfico
// del CECE "Plan actualizado 2025" (códigos). Coinciden materia por materia.
//
// El texto oficial pone al segundo tramo dentro del ciclo profesional con
// requisito "Ciclo General aprobado"; acá se muestra como tramo aparte, igual
// que en el gráfico, y la regla es la misma (bloque del primer tramo).
//
// Práctica Profesional (473) pide 23 asignaturas regularizadas: `minRegulares`.
//
// Layout del Ciclo Profesional (grid 1-based, 5 columnas):
//   fila 1: 276(c1) 465(c2) 464(c3) 278(c4) 466(c5)
//   fila 2: 279(c1) 470(c2) 467(c3) 468(c4) 469(c5)
//   fila 3: 471(c1)         472(c3)         473(c5)

export default {
  id: 'administracion',
  nombre: 'Licenciatura en Administración',
  titulo: 'Administración',
  completo: true,

  ciclo: { cols: 5, gapY: 60 },

  tramos: [
    { id: 1, label: 'Primer<br>Tramo', cols: 6, gate: null,
      ids: [245, 241, 242, 246, 252, 254] },
    { id: 2, label: 'Segundo<br>Tramo', cols: 6, gate: 1,
      ids: [248, 247, 250, 463, 274, 462] },
  ],

  cicloGate: 1,

  materias: {
    // Primer tramo
    245: { name: 'Álgebra',                        tramo: 1 },
    241: { name: 'Análisis Matemático',            tramo: 1 },
    242: { name: 'Economía',                       tramo: 1 },
    246: { name: 'Historia Ec. y Social General',  tramo: 1 },
    252: { name: 'Administración General',         tramo: 1 },
    254: { name: 'Sociología de las Org.',         tramo: 1 },

    // Segundo tramo
    248: { name: 'Estadística I',                  tramo: 2 },
    247: { name: 'Teoría Contable',                tramo: 2 },
    250: { name: 'Microeconomía I',                tramo: 2 },
    463: { name: 'Gestión de Tec. Digitales',      tramo: 2 },
    274: { name: 'Sistemas Administrativos',       tramo: 2 },
    462: { name: 'Derecho Empresarial',            tramo: 2 },

    // Ciclo Profesional
    276: { name: 'Cálculo Financiero',             tramo: 3, col: 1, row: 1, prereqs: [] },
    465: { name: 'Métodos Predictivos p/la Gestión', tramo: 3, col: 2, row: 1, prereqs: [248] },
    464: { name: 'Gestión de Costos',              tramo: 3, col: 3, row: 1, prereqs: [247] },
    278: { name: 'Macroeconomía y Pol. Eco.',      tramo: 3, col: 4, row: 1, prereqs: [250] },
    466: { name: 'Adm. de Operaciones',            tramo: 3, col: 5, row: 1, prereqs: [274] },

    279: { name: 'Administración Financiera',      tramo: 3, col: 1, row: 2, prereqs: [276] },
    470: { name: 'Ciencias de la Decisión',        tramo: 3, col: 2, row: 2, prereqs: [465] },
    467: { name: 'Gestión del Talento',            tramo: 3, col: 3, row: 2, prereqs: [] },
    468: { name: 'Administración Tributaria',      tramo: 3, col: 4, row: 2, prereqs: [278] },
    469: { name: 'Marketing',                      tramo: 3, col: 5, row: 2, prereqs: [466] },

    471: { name: 'Planeamiento Estratégico',       tramo: 3, col: 1, row: 3, prereqs: [279] },
    472: { name: 'Dirección',                      tramo: 3, col: 3, row: 3, prereqs: [467, 470] },
    473: { name: 'Práctica Profesional',           tramo: 3, col: 5, row: 3, prereqs: [], minRegulares: 23 },

    // 2 optativas de orientación + 1 de competencias
    opt1: { label: 'Orientada 1', optional: true },
    opt2: { label: 'Orientada 2', optional: true },
    opt3: { label: 'Competencia', optional: true },
  },

  arrowOrder: [
    [276, 279], [465, 470], [278, 468], [466, 469],
    [279, 471], [470, 472], [467, 472],
  ],
};
