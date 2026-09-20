// Pantalla de "elegí una contraseña nueva". Es la página a la que lleva el
// link del mail que manda Neon Auth; el token viene en la query y vale 15
// minutos. Si no hay token, no hay nada que hacer acá.

import { cambiarContrasena, mensajeDeError } from './auth/session.js';
import { initOjos } from './auth/ojo.js';

const $ = id => document.getElementById(id);
const params = new URL(location).searchParams;
const token = params.get('token');

function revisar(password, password2) {
  if (!password) return 'Escribí la contraseña nueva.';
  if (password.length < 8) return 'La contraseña necesita al menos 8 caracteres.';
  if (!password2) return 'Repetí la contraseña para confirmarla.';
  if (password !== password2) return 'Las dos contraseñas no son iguales.';
  return null;
}

// El link puede llegar ya vencido: Neon avisa con ?error= en vez de token.
function sinToken() {
  const motivo = params.get('error');
  $('reset-sub').textContent = motivo
    ? 'Ese link ya no sirve: los links duran 15 minutos.'
    : 'Este link no trae el código que manda el mail.';
  $('reset-error').textContent =
    'Volvé al plan, tocá "Entrar" y después "Me olvidé la contraseña" para pedir uno nuevo.';
  $('reset-form').querySelectorAll('input, button')
    .forEach(el => { el.disabled = true; });
}

function init() {
  initOjos($('reset-form'));
  if (!token) return sinToken();

  $('reset-form').addEventListener('submit', async e => {
    e.preventDefault();
    const password = $('reset-password').value;
    const password2 = $('reset-password2').value;

    const problema = revisar(password, password2);
    if (problema) { $('reset-error').textContent = problema; return; }

    $('reset-submit').disabled = true;
    $('reset-error').textContent = '';
    try {
      await cambiarContrasena(token, password);
      $('reset-ok').textContent =
        'Listo, ya podés entrar con la contraseña nueva.';
      $('reset-form').querySelectorAll('input').forEach(el => { el.disabled = true; });
      setTimeout(() => { location.href = 'index.html'; }, 2500);
    } catch (err) {
      $('reset-error').textContent = mensajeDeError(err);
      $('reset-submit').disabled = false;
    }
  });
}

init();
