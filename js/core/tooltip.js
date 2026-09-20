let el = null;
let visible = false;

function nodo() {
  return el ??= document.getElementById('tooltip');
}

export function showTip(e, texto) {
  // Sin nada para decir no hay tooltip: si no, queda un cuadradito vacío
  // siguiendo al mouse por las materias ya aprobadas.
  if (!texto) return hideTip();

  const t = nodo();
  t.innerHTML = texto.replace(/\n/g, '<br>');
  t.classList.add('visible');
  visible = true;
  moveTip(e);
}

export function moveTip(e) {
  if (!visible) return;
  const t = nodo();
  t.style.left = (e.clientX + 16) + 'px';
  t.style.top = (e.clientY - 8) + 'px';
}

export function hideTip() {
  nodo().classList.remove('visible');
  visible = false;
}
