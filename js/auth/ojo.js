// El ojito que muestra la contraseña, dentro de la misma caja de texto.
//
// Cada `.auth-input-ojo` tiene un input y su botón; el botón cambia sólo el
// input que lo acompaña. Se usa igual en el modal de login y en la página de
// contraseña nueva.

// Íconos `eye` y `eye-off` de Lucide (lucide.dev), con el path copiado acá
// para no depender de un CDN ni sumar una librería por dos dibujos.
const svg = interior => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">${interior}</svg>`;

const OJO = svg(`
  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
  <circle cx="12" cy="12" r="3"/>`);

const OJO_TACHADO = svg(`
  <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
  <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
  <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
  <path d="m2 2 20 20"/>`);

function pintar(boton, visible) {
  boton.innerHTML = visible ? OJO_TACHADO : OJO;
  const texto = visible ? 'Ocultar la contraseña' : 'Ver la contraseña';
  boton.title = texto;
  boton.setAttribute('aria-label', texto);
  boton.setAttribute('aria-pressed', String(visible));
}

// Deja todos los ojitos de `raiz` listos y en estado oculto.
export function initOjos(raiz = document) {
  for (const caja of raiz.querySelectorAll('.auth-input-ojo')) {
    const input = caja.querySelector('input');
    const boton = caja.querySelector('.auth-ojo');
    if (!input || !boton) continue;

    pintar(boton, false);
    boton.addEventListener('click', () => {
      const mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      pintar(boton, mostrar);
      input.focus();
    });
  }
}

// Vuelve a ocultar todo: al abrir el modal no se arrastra lo de la vez pasada.
export function ocultarOjos(raiz = document) {
  for (const caja of raiz.querySelectorAll('.auth-input-ojo')) {
    const input = caja.querySelector('input');
    const boton = caja.querySelector('.auth-ojo');
    if (!input || !boton) continue;
    input.type = 'password';
    pintar(boton, false);
  }
}
