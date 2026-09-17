// Actuario — FCE · UBA
//
// Layout del Ciclo Profesional (grid 1-based, 5 columnas):
//   fila 1: 544(c1) 602(c2) 601(c3) 279(c4) 291(c5)
//   fila 2: 752(c1) 751(c2)         548(c4) 603(c5)
//   fila 3:         753(c2) 758(c3) 755(c4)
//   fila 4:         754(c2)         756(c4) 757(c5)
//   fila 5:         746(c2) 717(c3) 728(c4)

export default {
  id: 'actuario',
  nombre: 'Actuario',
  titulo: 'Actuario',
  completo: true,

  ciclo: { cols: 5, gapY: 80 },

  tramos: [
    { id: 1, label: 'Primer<br>Tramo', cols: 6, gate: null,
      ids: [245, 241, 242, 246, 255, 256] },
    { id: 2, label: 'Segundo<br>Tramo', cols: 6, gate: null,
      ids: [540, 542, 262, 274, 462] },
  ],

  materias: {
    // Primer tramo
    245: { name: 'Álgebra',                        tramo: 1 },
    241: { name: 'Análisis Matemático I',          tramo: 1 },
    242: { name: 'Economía',                       tramo: 1 },
    246: { name: 'Historia Ec. y Social',          tramo: 1 },
    255: { name: 'Análisis Contable',              tramo: 1 },
    256: { name: 'Inst. Gobierno y Ec. Política',  tramo: 1 },

    // Segundo tramo
    540: { name: 'Análisis Estadístico',           tramo: 2 },
    542: { name: 'Matemática Aplicada',            tramo: 2 },
    262: { name: 'Macroeconomía I',                tramo: 2 },
    274: { name: 'Sistemas Administrativos',       tramo: 2 },
    462: { name: 'Derecho Empresarial',            tramo: 2 },

    // Ciclo Profesional
    544: { name: 'Matemática Aplicada II',           tramo: 3, col: 1, row: 1, prereqs: [542] },
    602: { name: 'Análisis Estadístico II',          tramo: 3, col: 2, row: 1, prereqs: [540, 542] },
    601: { name: 'Mat. Financiera y Actuarial',      tramo: 3, col: 3, row: 1, prereqs: [540, 542] },
    279: { name: 'Administración Financiera',        tramo: 3, col: 4, row: 1, prereqs: [601] },
    291: { name: 'Microeconomía p/Economistas',      tramo: 3, col: 5, row: 1, prereqs: [542] },

    752: { name: 'Análisis Numérico',                tramo: 3, col: 1, row: 2, prereqs: [544] },
    751: { name: 'Estadística Actuarial',            tramo: 3, col: 2, row: 2, prereqs: [544, 602] },
    548: { name: 'Dinero y Bancos',                  tramo: 3, col: 4, row: 2, prereqs: [279, 602] },
    603: { name: 'Dcho. Financiero, Seg. y S.S.',    tramo: 3, col: 5, row: 2, prereqs: [462] },

    753: { name: 'Biometría Actuarial',              tramo: 3, col: 2, row: 3, prereqs: [601, 751, 752] },
    758: { name: 'Bases Act. Inversiones (A5)',      tramo: 3, col: 3, row: 3, prereqs: [601, 751] },
    755: { name: 'T. Act. Seguros Patrimoniales (A2)', tramo: 3, col: 4, row: 3, prereqs: [601, 751, 752] },

    754: { name: 'T. Act. Seguros Personales (A1)',  tramo: 3, col: 2, row: 4, prereqs: [753] },
    756: { name: 'T. Act. Fond. y Plan Jub. (A4)',   tramo: 3, col: 4, row: 4, prereqs: [754] },
    757: { name: 'T. Equilibrio Actuarial (A3)',     tramo: 3, col: 5, row: 4, prereqs: [754, 755] },

    746: { name: 'Computación Científica Actuarial', tramo: 3, col: 2, row: 5, prereqs: [540, 542] },
    717: { name: 'Modelos y Proyecciones Actuariales', tramo: 3, col: 3, row: 5, prereqs: [757, 758, 746] },
    728: { name: 'Práctica Profesional del Actuario', tramo: 3, col: 4, row: 5, prereqs: [754, 755, 756] },

    // Optativas — se renderizan aparte, el nombre lo escribe el usuario
    opt1: { label: 'Optativa 1', optional: true },
    opt2: { label: 'Optativa 2', optional: true },
  },

  // Flechas del ciclo, copiadas tal cual de la app original de Actuario: es un
  // dibujo hecho a mano y el orden decide el reparto horizontal (la primera
  // sale y entra más a la izquierda). Ojo: no son exactamente las correlativas
  // que declara `prereqs` — la app original dibujaba 601→548 y 601→603, y no
  // dibujaba 601→279 ni 602→548. Queda así a propósito; si el plan real dice
  // otra cosa, hay que corregir `prereqs` y esta lista juntas.
  arrows: [
    // 752 ← 544
    [544, 752],
    // 751 ← 544, 602
    [544, 751], [602, 751],
    // 601 sale de izq. a der. en este orden: 753, 758, 755, 548, 603
    [601, 753], [601, 758], [601, 755], [601, 548], [601, 603],
    // 548 ← 279 (después de 601)
    [279, 548],
    // 753 entra de izq. a der.: 752, 751, 601
    [752, 753], [751, 753],
    // 755 entra: 752, 751 (601 ya está arriba)
    [752, 755], [751, 755],
    // 758 ← 751
    [751, 758],
    // 754 ← 753
    [753, 754],
    // 756 ← 754
    [754, 756],
    // 755 sale de izq. a der.: 728, 757
    [755, 728], [755, 757],
    // 754 sale: 757, 728
    [754, 757], [754, 728],
    // 756 → 728
    [756, 728],
    // 717 ← 758 (izq.), 757 (der.), 746 (horizontal)
    [758, 717], [757, 717], [746, 717],
  ],

  // Las tres que no salen por abajo y entran por arriba.
  arrowShapes: {
    '754-757': 'arco',        // pasa por encima de 756
    '754-756': 'lateral',
    '746-717': 'horizontal',
  },
};
