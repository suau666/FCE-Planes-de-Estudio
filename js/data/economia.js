// Licenciatura en Economía — FCE · UBA · Plan 2024 (RESCS-2024-1696-UBA-REC)
//
// Fuentes: Código UBA, Libro IV, Título 2, Cap. A (correlativas) y el gráfico
// del CECE "Plan actualizado 2026" (códigos). Donde difieren, manda el texto
// oficial: el CECE le pone a Epistemología (545) sólo 262, a Estructura (547)
// le suma 543 y 556, y a Dinero y Bancos (548) y Crecimiento (554) les saca
// 255 y 544.
//
// Las 4 optativas son las de la mención Empresarial o Gobierno y Políticas
// Públicas. La mención Análisis e Investigación lleva 3 + Seminario de
// Integración; en ese caso la 4ª cuenta como el seminario.
//
// Layout del Ciclo Profesional (grid 1-based, 6 columnas). Hecho a mano:
// historia/macro a la izquierda, micro al medio, matemática/econometría a la
// derecha, para que las flechas no crucen toda la grilla.
//   fila 1: 541(c1) 262(c2)         542(c4)         540(c6)
//   fila 2: 547(c1)         291(c3)         544(c5)
//   fila 3: 545(c1) 556(c2) 549(c3) 283(c4) 543(c5) 286(c6)
//   fila 4:         559(c2)         554(c4) 546(c5) 558(c6)
//   fila 5:                 548(c3)         555(c5)

export default {
  id: 'economia',
  nombre: 'Licenciatura en Economía',
  titulo: 'Economía',
  completo: true,

  ciclo: { cols: 6, gapY: 60 },

  tramos: [
    { id: 1, label: 'Ciclo<br>General', cols: 6, gate: null,
      ids: [245, 241, 242, 246, 255, 256] },
  ],

  // Todo el ciclo profesional arranca con el Ciclo General aprobado.
  cicloGate: 1,

  materias: {
    // Ciclo General
    245: { name: 'Álgebra',                          tramo: 1 },
    241: { name: 'Análisis Matemático',              tramo: 1 },
    242: { name: 'Economía',                         tramo: 1 },
    246: { name: 'Historia Ec. y Social General',    tramo: 1 },
    255: { name: 'Análisis Contable',                tramo: 1 },
    256: { name: 'Inst. Gobierno y Ec. Política',    tramo: 1 },

    // Ciclo Profesional
    540: { name: 'Análisis Estadístico',             tramo: 3, col: 6, row: 1, prereqs: [] },
    542: { name: 'Matemática Aplicada I',            tramo: 3, col: 4, row: 1, prereqs: [] },
    262: { name: 'Macroeconomía I',                  tramo: 3, col: 2, row: 1, prereqs: [] },
    541: { name: 'Hist. de la Ec. y Pol. Ec. Arg.',  tramo: 3, col: 1, row: 1, prereqs: [] },

    544: { name: 'Matemática Aplicada II',           tramo: 3, col: 5, row: 2, prereqs: [542] },
    291: { name: 'Microeconomía p/Economistas',      tramo: 3, col: 3, row: 2, prereqs: [542] },
    547: { name: 'Estructura y Pol. Ec. y Soc. Arg.', tramo: 3, col: 1, row: 2, prereqs: [541, 262] },

    543: { name: 'Econometría I',                    tramo: 3, col: 5, row: 3, prereqs: [540, 544] },
    283: { name: 'Macroeconomía II',                 tramo: 3, col: 4, row: 3, prereqs: [262, 544] },
    286: { name: 'Microeconomía II',                 tramo: 3, col: 6, row: 3, prereqs: [544, 291] },
    549: { name: 'Economía Financiera',              tramo: 3, col: 3, row: 3, prereqs: [291, 262] },
    545: { name: 'Epistemología e Hist. Pens. Ec.',  tramo: 3, col: 1, row: 3, prereqs: [262, 291] },
    556: { name: 'Finanzas Públicas',                tramo: 3, col: 2, row: 3, prereqs: [291] },

    546: { name: 'Econometría II',                   tramo: 3, col: 5, row: 4, prereqs: [543] },
    554: { name: 'Crecimiento Económico',            tramo: 3, col: 4, row: 4, prereqs: [544, 291, 283] },
    555: { name: 'Organización Industrial',          tramo: 3, col: 5, row: 5, prereqs: [286] },
    558: { name: 'Economía Internacional',           tramo: 3, col: 6, row: 4, prereqs: [262, 286] },
    559: { name: 'Desarrollo Económico',             tramo: 3, col: 2, row: 4, prereqs: [543, 291, 262] },

    548: { name: 'Dinero y Bancos',                  tramo: 3, col: 3, row: 5, prereqs: [283, 546, 255, 549] },

    opt1: { label: 'Optativa 1', optional: true },
    opt2: { label: 'Optativa 2', optional: true },
    opt3: { label: 'Optativa 3', optional: true },
    opt4: { label: 'Optativa 4', optional: true },
  },

  arrowOrder: [
    [540, 543],
    [542, 544], [542, 291],
    [262, 283], [262, 549], [262, 545], [262, 547], [262, 558], [262, 559],
    [541, 547],
    [544, 543], [544, 283], [544, 286], [544, 554],
    [291, 286], [291, 554], [291, 549], [291, 545], [291, 559], [291, 556],
    [543, 546], [543, 559],
    [283, 554], [283, 548],
    [286, 555], [286, 558],
    [549, 548], [546, 548],
  ],
};
