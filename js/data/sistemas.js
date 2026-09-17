// Sistemas de Información de las Organizaciones — FCE · UBA
//
// Layout del Ciclo Profesional (grid 1-based, 5 columnas):
//   fila 1: 661(c1)         464(c2) 278(c3) 276(c4)
//   fila 2: 1652(c1) 663(c2) 1601(c3) 1603(c4) 1653(c5)
//   fila 3: 1654(c1) 662(c2) 658(c3) 1604(c4) 655(c5)
//   fila 4:                  1799(c3)        740(c5)
//   fila 5:                  1660(c3)

export default {
  id: 'sistemas',
  nombre: 'Sistemas de Información de las Organizaciones',
  titulo: 'Sistemas',
  completo: true,

  ciclo: { cols: 5, gapY: 60 },

  tramos: [
    { id: 1, label: 'CBC', cols: 6, gate: null,
      ids: [241, 242, 245, 246, 252, 254] },
    // El segundo tramo y el ciclo exigen el CBC completo y aprobado.
    { id: 2, label: 'Segundo<br>Tramo', cols: 6, gate: 1,
      ids: [248, 274, 250, 247, 249, 1275] },
  ],

  // El ciclo profesional también depende del CBC cuando la materia no
  // declara correlativas propias.
  cicloGate: 1,

  materias: {
    // CBC
    241:  { name: 'Análisis Matemático I',     tramo: 1 },
    242:  { name: 'Economía',                  tramo: 1 },
    245:  { name: 'Álgebra',                   tramo: 1 },
    246:  { name: 'HESG',                      tramo: 1 },
    252:  { name: 'Administración Gral.',      tramo: 1 },
    254:  { name: 'Sociología de las Org.',    tramo: 1 },

    // Segundo tramo
    248:  { name: 'Estadística I',             tramo: 2 },
    274:  { name: 'Sistemas Adm.',             tramo: 2 },
    250:  { name: 'Microeconomía I',           tramo: 2 },
    247:  { name: 'Teoría Contable',           tramo: 2 },
    249:  { name: 'HESA',                      tramo: 2 },
    1275: { name: 'ITIC',                      tramo: 2 },

    // Ciclo Profesional
    661:  { name: 'Lógica y Teoría de la Decisión', tramo: 3, col: 1, row: 1, prereqs: [] },
    464:  { name: 'Gestión de Costos',              tramo: 3, col: 2, row: 1, prereqs: [247] },
    278:  { name: 'Macroeconomía y Pol. Eco.',      tramo: 3, col: 3, row: 1, prereqs: [] },
    276:  { name: 'Cálculo Financiero',             tramo: 3, col: 4, row: 1, prereqs: [] },

    1652: { name: 'TYLA',                           tramo: 3, col: 1, row: 2, prereqs: [661] },
    663:  { name: 'Sistemas de Datos',              tramo: 3, col: 2, row: 2, prereqs: [661] },
    1601: { name: 'Ingeniería de Software',         tramo: 3, col: 3, row: 2, prereqs: [1275] },
    1603: { name: 'Derecho Informático I',          tramo: 3, col: 4, row: 2, prereqs: [1275] },
    1653: { name: 'TICSO',                          tramo: 3, col: 5, row: 2, prereqs: [1275] },

    1654: { name: 'CAI',                            tramo: 3, col: 1, row: 3, prereqs: [1652] },
    662:  { name: 'Seg. Inf. y Princ. de Auditoría', tramo: 3, col: 2, row: 3, prereqs: [663] },
    658:  { name: 'MetSI',                          tramo: 3, col: 3, row: 3, prereqs: [1601] },
    1604: { name: 'Derecho Informático II',         tramo: 3, col: 4, row: 3, prereqs: [1603] },
    655:  { name: 'Tecnología de Comunicaciones',   tramo: 3, col: 5, row: 3, prereqs: [1653] },

    279:  { name: 'Administración Financiera',      tramo: 3, col: 4, row: 4, prereqs: [276] },
    1799: { name: 'Gestión de RR Informáticos',     tramo: 3, col: 3, row: 4, prereqs: [658, 662] },
    740:  { name: 'Redes Informáticas',             tramo: 3, col: 5, row: 4, prereqs: [655] },

    1660: { name: 'Actuación Profesional',          tramo: 3, col: 3, row: 5, prereqs: [740, 1654] },

    opt1: { label: 'Optativa 1', optional: true },
    opt2: { label: 'Optativa 2', optional: true },
  },

  arrowOrder: [
    [661, 1652], [661, 663],
    [1652, 1654], [663, 662], [1601, 658], [1603, 1604], [1653, 655],
    [658, 1799], [662, 1799], [655, 740],
    [1654, 1660], [740, 1660],
    [276, 279],
  ],

  // Ajustes finos de trazado. `from`/`to` son la fracción del ancho de la
  // tarjeta por donde sale/entra la flecha (0 = borde izq., 1 = borde der.).
  // Si se omite `to`, se usa el reparto automático.
  arrowHints: {
    '661-1652':  { from: 0.50, to: 0.50 },
    '661-663':   { from: 0.75, to: 0.50 },
    '658-1799':  { from: 0.50, to: 0.50 },
    '662-1799':  { from: 0.75, to: 0.50 },
    '740-1660':  { from: 0.25, to: 0.75 },
    '1654-1660': { from: 0.50 },
  },
};
