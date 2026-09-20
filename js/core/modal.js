// Abrir y cerrar modales, con el fondo quieto.
//
// Mientras haya uno abierto, la página de atrás no se desliza: si no, al
// scrollear dentro del modal se termina moviendo la malla y se pierde de vista
// lo que se estaba leyendo. Se cuenta cuántos hay abiertos porque uno puede
// abrir a otro (la invitación abre el login).

const abiertos = new Set();

function pintarFondo() {
  document.body.classList.toggle('sin-scroll', abiertos.size > 0);
}

export function abrirOverlay(el, display = 'flex') {
  if (!el) return;
  el.style.display = display;
  abiertos.add(el);
  pintarFondo();
}

export function cerrarOverlay(el) {
  if (!el) return;
  el.style.display = 'none';
  abiertos.delete(el);
  pintarFondo();
}

export function hayModalAbierto() {
  return abiertos.size > 0;
}
