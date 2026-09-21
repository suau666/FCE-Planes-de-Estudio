// Confirmar dentro de la app, sin los carteles del navegador.
//
// `confirm()` abre un cuadro del sistema: rompe el diseño, no se puede traducir
// y en algunos navegadores queda arriba de todo bloqueando la página. Este
// modal usa los mismos estilos que el resto y devuelve una promesa.

import { abrirOverlay, cerrarOverlay } from './modal.js';

const EQUIS = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

const $ = id => document.getElementById(id);

let resolver = null;

function cerrar(respuesta) {
  cerrarOverlay($('confirmar-overlay'));
  resolver?.(respuesta);
  resolver = null;
}

let listo = false;

function init() {
  if (listo) return;
  listo = true;

  $('confirmar-x').innerHTML = EQUIS;
  $('confirmar-x').title = 'Cerrar';
  $('confirmar-x').setAttribute('aria-label', 'Cerrar');

  $('confirmar-x').addEventListener('click', () => cerrar(false));
  $('confirmar-no').addEventListener('click', () => cerrar(false));
  $('confirmar-si').addEventListener('click', () => cerrar(true));
  $('confirmar-overlay').addEventListener('click', e => {
    if (e.target === $('confirmar-overlay')) cerrar(false);
  });
}

// { titulo, texto, aceptar, cancelar, peligro } → Promise<boolean>
export function confirmar({ titulo, texto, aceptar = 'Sí', cancelar = 'Mejor no', peligro = false }) {
  init();
  $('confirmar-titulo').textContent = titulo;
  $('confirmar-texto').textContent = texto || '';
  $('confirmar-si').textContent = aceptar;
  $('confirmar-no').textContent = cancelar;
  $('confirmar-si').classList.toggle('auth-peligro', peligro);
  $('confirmar-si').classList.toggle('primary', !peligro);
  abrirOverlay($('confirmar-overlay'));
  $('confirmar-no').focus();

  return new Promise(res => { resolver = res; });
}
