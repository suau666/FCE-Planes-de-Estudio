// Abrir y cerrar modales, con el fondo quieto.
//
// `overflow: hidden` en el body no alcanza: con el trackpad o en el celular el
// scroll se lo queda igual la página de atrás. Lo que sí funciona es sacar el
// body del flujo mientras hay un modal abierto (`position: fixed`), guardando
// a qué altura estaba para devolverlo ahí al cerrar.
//
// Se cuenta cuántos hay abiertos porque uno puede abrir a otro (la invitación
// abre el login) y cerrar el de arriba no tiene que soltar el fondo.

const abiertos = new Set();
let alturaGuardada = 0;

function congelar() {
  alturaGuardada = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${alturaGuardada}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('sin-scroll');
}

function descongelar() {
  document.body.classList.remove('sin-scroll');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, alturaGuardada);
}

export function abrirOverlay(el, display = 'flex') {
  if (!el) return;
  const primero = abiertos.size === 0;
  el.style.display = display;
  abiertos.add(el);
  if (primero) congelar();
}

export function cerrarOverlay(el) {
  if (!el) return;
  el.style.display = 'none';
  abiertos.delete(el);
  if (abiertos.size === 0) descongelar();
}

export function hayModalAbierto() {
  return abiertos.size > 0;
}
