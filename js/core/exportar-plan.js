// Llevarse el plan: copiado al portapapeles para pegarlo donde sea, o como
// imagen para compartirla.
//
// La imagen se dibuja en un canvas a mano. Alcanza y sobra para una lista de
// períodos con sus materias, y así no hace falta ninguna librería.

const FUENTE = "'Syne', sans-serif";

// Claro y con buen contraste, más allá del tema que tenga puesto la app: la
// imagen se comparte y se imprime, no se mira sobre el fondo del sitio.
const TINTA = '#1a1a26';
const SUAVE = '#6b6b80';
const ACENTO = '#e85520';
const FONDO = '#ffffff';
const LINEA = '#e2e2ea';

// [{ label, materias: [nombre] }] con los períodos que tienen algo.
function periodosConMaterias(periodos, plan, nombreDe) {
  return periodos
    .map(p => ({
      label: p.label,
      materias: Object.keys(plan).filter(id => plan[id] === p.key).map(nombreDe),
    }))
    .filter(p => p.materias.length);
}

export function planEnTexto(carrera, periodos, plan, nombreDe) {
  const bloques = periodosConMaterias(periodos, plan, nombreDe);
  if (!bloques.length) return null;

  const lineas = [`Plan de cuatrimestres · ${carrera.titulo} · FCE · UBA`, ''];
  for (const p of bloques) {
    lineas.push(`${p.label}:`);
    for (const m of p.materias) lineas.push(`• ${m}`);
    lineas.push('');
  }
  return lineas.join('\n').trimEnd();
}

function bajar(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const archivoDe = (carrera, ext) => `plan-${carrera.id}-${new Date().toISOString().slice(0, 10)}.${ext}`;

// 'vacio' si no hay nada que copiar, 'ok' si se copió, 'error' si el
// navegador no dejó tocar el portapapeles (pasa sin HTTPS o sin permiso).
export async function copiarTexto(carrera, periodos, plan, nombreDe) {
  const texto = planEnTexto(carrera, periodos, plan, nombreDe);
  if (!texto) return 'vacio';

  try {
    await navigator.clipboard.writeText(texto);
    return 'ok';
  } catch {
    return copiarAlaVieja(texto) ? 'ok' : 'error';
  }
}

// Sin permiso para el portapapeles moderno queda este camino: un textarea
// suelto, seleccionar y copiar.
function copiarAlaVieja(texto) {
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function bajarImagen(carrera, periodos, plan, nombreDe) {
  const bloques = periodosConMaterias(periodos, plan, nombreDe);
  if (!bloques.length) return false;

  // Medidas en px lógicos; el canvas se dibuja al doble para que no salga
  // borroso en pantallas retina ni al hacerle zoom.
  const escala = 2;
  const ancho = 720;
  const margen = 40;
  const altoTitulo = 34;
  const altoPeriodo = 30;
  const altoMateria = 26;
  const espacioEntre = 18;

  let alto = margen + altoTitulo + 14;
  for (const p of bloques) alto += altoPeriodo + p.materias.length * altoMateria + espacioEntre;
  alto += margen - espacioEntre;

  const canvas = document.createElement('canvas');
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  const ctx = canvas.getContext('2d');
  ctx.scale(escala, escala);

  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.textBaseline = 'alphabetic';

  // Un solo título, y si la carrera tiene nombre largo se achica la letra
  // hasta que entre en el ancho en vez de cortarse.
  const titulo = `Plan de cuatrimestres · ${carrera.titulo} · FCE · UBA`;
  let y = margen + 18;
  ctx.fillStyle = TINTA;
  let cuerpo = 22;
  do {
    ctx.font = `800 ${cuerpo}px ${FUENTE}`;
    cuerpo -= 1;
  } while (ctx.measureText(titulo).width > ancho - margen * 2 && cuerpo > 12);
  ctx.fillText(titulo, margen, y);

  y += 30;
  for (const p of bloques) {
    ctx.fillStyle = ACENTO;
    ctx.font = `700 15px ${FUENTE}`;
    ctx.fillText(p.label, margen, y);

    ctx.strokeStyle = LINEA;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margen, y + 8);
    ctx.lineTo(ancho - margen, y + 8);
    ctx.stroke();

    y += altoPeriodo;
    ctx.fillStyle = TINTA;
    ctx.font = `400 14px ${FUENTE}`;
    for (const m of p.materias) {
      ctx.fillText(`•  ${m}`, margen + 6, y);
      y += altoMateria;
    }
    y += espacioEntre - 6;
  }

  canvas.toBlob(blob => bajar(blob, archivoDe(carrera, 'png')), 'image/png');
  return true;
}
