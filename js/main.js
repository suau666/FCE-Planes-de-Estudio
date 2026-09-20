import { CARRERAS, getCarrera } from './data/index.js';
import { store, cargar, scheduleSave, indicador } from './core/state.js';
import { initEstados } from './core/rules.js';
import { renderAll } from './core/render.js';
import { drawArrows } from './core/arrows.js';
import { openPlanner, initPlannerUI } from './core/planner.js';
import {
  initSesion, signIn, signUp, signInConGoogle, signOut, pedirResetDeContrasena,
  cambiarContrasenaConLaActual, vincularGoogle, mandarCodigo, verificarCodigo,
  errorDeRedireccion, getUser, nombreVisible, mensajeDeError,
} from './auth/session.js';
import { PAGINA_RESET } from './auth/reset-url.js';
import { initOjos, ocultarOjos } from './auth/ojo.js';
import { hayNeon } from './config.js';

let carrera = null;

// ── Temas ────────────────────────────────────────────────────────────────────
const TEMAS = ['dark', 'white', 'aqua', 'cream'];

function aplicarTema(nombre) {
  document.body.className = nombre === 'dark' ? '' : `theme-${nombre}`;
  document.querySelectorAll('.theme-swatch')
    .forEach(s => s.classList.toggle('active', s.dataset.tema === nombre));
  if (carrera) requestAnimationFrame(() => drawArrows(carrera, store.estados));
}

function initTemas() {
  const cont = document.getElementById('theme-switcher');
  for (const t of TEMAS) {
    const s = document.createElement('div');
    s.className = `theme-swatch swatch-${t}`;
    s.dataset.tema = t;
    s.title = t;
    s.addEventListener('click', () => {
      store.tema = t;
      aplicarTema(t);
      scheduleSave();
    });
    cont.appendChild(s);
  }
}

// ── Selector de carrera ──────────────────────────────────────────────────────
function initSelector() {
  const cont = document.getElementById('carrera-tabs');
  for (const c of CARRERAS) {
    const b = document.createElement('button');
    b.className = 'carrera-tab';
    b.dataset.carrera = c.id;
    b.textContent = c.titulo;
    if (!c.completo) b.classList.add('pendiente');
    b.title = c.completo ? c.nombre : `${c.nombre} — plan pendiente de carga`;
    b.addEventListener('click', () => irA(c.id));
    cont.appendChild(b);
  }
}

function irA(id) {
  carrera = getCarrera(id);
  store.carreraActiva = carrera.id;

  document.querySelectorAll('.carrera-tab')
    .forEach(b => b.classList.toggle('active', b.dataset.carrera === carrera.id));
  document.getElementById('titulo').innerHTML =
    `${carrera.titulo} <span>·</span> Plan de Estudios`;
  document.getElementById('subtitulo').textContent = `${carrera.nombre} — FCE · UBA`;

  const url = new URL(location);
  url.searchParams.set('c', carrera.id);
  history.replaceState(null, '', url);

  const hayPlan = carrera.completo;
  document.getElementById('malla').style.display = hayPlan ? 'block' : 'none';
  document.getElementById('sin-plan').style.display = hayPlan ? 'none' : 'block';
  document.getElementById('planner-btn').style.display = hayPlan ? 'block' : 'none';

  if (hayPlan) {
    initEstados(carrera, store.estados);
    renderAll(carrera);
  }
  scheduleSave();
}

// ── Login ────────────────────────────────────────────────────────────────────
// Un solo modal con tres modos: entrar, crear cuenta y pedir el mail para
// recuperar la contraseña. Cambia qué campos se ven y a qué función llama.

const ENTRAR = 'entrar', REGISTRO = 'registro';
const RECUPERAR = 'recuperar', VERIFICAR = 'verificar';
let modo = ENTRAR;
let mailAVerificar = '';

const $ = id => document.getElementById(id);

function pintarSesion() {
  $('usuario').textContent = nombreVisible();
  $('cuenta-btn').style.display = getUser() ? '' : 'none';
  $('auth-btn').textContent = getUser() ? 'Salir' : 'Entrar';
  $('auth-btn').title = getUser()
    ? `Cerrar la sesión de ${nombreVisible()}`
    : 'Guardar el progreso en tu cuenta';
}

const TEXTOS = {
  [ENTRAR]: {
    titulo: 'Entrar <span>·</span> Mi progreso',
    sub: 'Con una cuenta, el progreso te sigue a cualquier dispositivo.',
    submit: 'Entrar',
    cambiarTexto: '¿Todavía no tenés cuenta?',
    cambiar: 'Crear una',
  },
  [REGISTRO]: {
    titulo: 'Crear cuenta <span>·</span> Mi progreso',
    sub: 'Lo que ya marcaste en este dispositivo se sube a la cuenta nueva.',
    submit: 'Crear cuenta',
    cambiarTexto: '¿Ya tenés cuenta?',
    cambiar: 'Entrar',
  },
  [RECUPERAR]: {
    titulo: 'Recuperar <span>·</span> Mi contraseña',
    sub: 'Poné tu mail y te mandamos un link para elegir una nueva. Dura 15 minutos.',
    submit: 'Mandarme el link',
    cambiarTexto: '¿Te acordaste?',
    cambiar: 'Entrar',
  },
  [VERIFICAR]: {
    titulo: 'Verificar <span>·</span> Tu mail',
    sub: '',   // lo arma pintarModo con el mail al que fue el código
    submit: 'Verificar',
    cambiarTexto: '¿Otro mail?',
    cambiar: 'Volver',
  },
};

function mostrar(selector, si) {
  for (const el of document.querySelectorAll(selector)) {
    el.style.display = si ? '' : 'none';
  }
}

function pintarModo() {
  const t = TEXTOS[modo];
  $('auth-titulo').innerHTML = t.titulo;
  $('auth-sub').textContent = t.sub;
  $('auth-submit').textContent = t.submit;
  $('auth-cambiar-texto').textContent = t.cambiarTexto;
  $('auth-cambiar').textContent = t.cambiar;

  if (modo === VERIFICAR) {
    $('auth-sub').textContent =
      `Te mandamos un código de 6 dígitos a ${mailAVerificar}. Ponelo acá para `
      + 'terminar de crear la cuenta.';
  }

  mostrar('.auth-solo-registro', modo === REGISTRO);
  mostrar('.auth-solo-clave', modo === ENTRAR || modo === REGISTRO);
  mostrar('.auth-solo-codigo', modo === VERIFICAR);
  $('auth-email-campo').style.display = modo === VERIFICAR ? 'none' : '';
  $('auth-olvide-fila').style.display = modo === ENTRAR ? '' : 'none';
  $('auth-password').autocomplete = modo === REGISTRO ? 'new-password' : 'current-password';

  $('auth-error').textContent = '';
  $('auth-ok').textContent = '';
}

// Revisa el formulario antes de molestar al servidor. Devuelve el mensaje a
// mostrar, o null si está todo bien.
function revisarDatos({ email, password, password2, codigo }) {
  if (modo === VERIFICAR) {
    if (!codigo) return 'Escribí el código que te llegó por mail.';
    if (!/^\d{6}$/.test(codigo)) return 'El código son 6 dígitos.';
    return null;
  }
  if (!email) return 'Escribí tu mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ese mail no parece válido.';
  if (modo === RECUPERAR) return null;
  if (!password) return 'Escribí tu contraseña.';
  if (password.length < 8) return 'La contraseña necesita al menos 8 caracteres.';
  if (modo === REGISTRO) {
    if (!password2) return 'Repetí la contraseña para confirmarla.';
    if (password !== password2) return 'Las dos contraseñas no son iguales.';
  }
  return null;
}

function abrirModal(enModo = ENTRAR) {
  modo = enModo;
  ocultarOjos($('auth-form'));
  pintarModo();
  $('auth-overlay').style.display = 'flex';
  $('auth-email').focus();
}

function cerrarModal() {
  $('auth-overlay').style.display = 'none';
  $('auth-form').reset();
  $('auth-error').textContent = '';
  $('auth-ok').textContent = '';
}

// Después de entrar o salir, el progreso es otro: hay que traerlo y redibujar.
async function recargarProgreso() {
  const { subido, error } = await cargar();
  pintarSesion();
  aplicarTema(store.tema);
  irA(store.carreraActiva);
  if (error) indicador(`✗ ${error}`, 'error', 6000);
  else if (subido) indicador('✓ Tu progreso quedó en la cuenta', 'saved', 4000);
}

// Vuelve de Google sin sesión: se abre el modal con el motivo a la vista.
function mostrarFalloDeGoogle(motivo) {
  abrirModal(ENTRAR);
  $('auth-error').textContent = motivo;
}

function initAuthUI() {
  pintarSesion();
  initOjos($('auth-form'));

  // Sin Neon configurado no hay cuentas: el progreso vive en el dispositivo.
  if (!hayNeon) { $('auth-btn').style.display = 'none'; return; }

  $('auth-btn').addEventListener('click', async () => {
    if (!getUser()) return abrirModal();
    try {
      await signOut();
    } catch (err) {
      indicador(`✗ ${mensajeDeError(err)}`, 'error', 6000);
    }
    await recargarProgreso();
  });

  $('auth-cerrar').addEventListener('click', cerrarModal);
  $('auth-overlay').addEventListener('click', e => {
    if (e.target === $('auth-overlay')) cerrarModal();
  });
  $('auth-cambiar').addEventListener('click', () => {
    modo = modo === ENTRAR ? REGISTRO : ENTRAR;
    pintarModo();
  });

  $('auth-reenviar').addEventListener('click', async () => {
    $('auth-error').textContent = '';
    $('auth-ok').textContent = '';
    try {
      await mandarCodigo(mailAVerificar);
      $('auth-ok').textContent = `Te mandamos otro código a ${mailAVerificar}.`;
    } catch (err) {
      $('auth-error').textContent = mensajeDeError(err);
    }
  });
  $('auth-olvide').addEventListener('click', () => {
    modo = RECUPERAR;
    pintarModo();
  });

  $('auth-google').addEventListener('click', async () => {
    $('auth-error').textContent = '';
    try {
      await signInConGoogle();
    } catch (err) {
      $('auth-error').textContent = mensajeDeError(err);
    }
  });

  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const datos = {
      email: $('auth-email').value.trim(),
      password: $('auth-password').value,
      password2: $('auth-password2').value,
      nombre: $('auth-nombre').value.trim(),
      codigo: $('auth-codigo').value.trim(),
    };

    const problema = revisarDatos(datos);
    if (problema) { $('auth-error').textContent = problema; return; }

    $('auth-submit').disabled = true;
    $('auth-error').textContent = '';
    $('auth-ok').textContent = '';
    try {
      if (modo === RECUPERAR) {
        await pedirResetDeContrasena(datos.email, PAGINA_RESET);
        // A propósito no decimos si el mail existe o no.
        $('auth-ok').textContent =
          'Si hay una cuenta con ese mail, ya te mandamos el link. Revisá tu casilla.';
      } else if (modo === VERIFICAR) {
        await verificarCodigo(mailAVerificar, datos.codigo);
        cerrarModal();
        await recargarProgreso();
      } else {
        const r = await (modo === REGISTRO ? signUp(datos) : signIn(datos));
        // Neon quedó esperando el código del mail: no hay sesión todavía.
        if (r?.verificar) {
          mailAVerificar = r.email;
          modo = VERIFICAR;
          pintarModo();
          $('auth-codigo').focus();
        } else {
          cerrarModal();
          await recargarProgreso();
        }
      }
    } catch (err) {
      $('auth-error').textContent = mensajeDeError(err);
    } finally {
      $('auth-submit').disabled = false;
    }
  });
}

// ── Mi cuenta ────────────────────────────────────────────────────────────────
// Cambiar la contraseña sabiendo la actual, o pedir un mail para crear una
// cuando se entró con Google y nunca hubo contraseña. Poner una contraseña sin
// saber la anterior no se puede desde el navegador: Better Auth sólo expone
// `set-password` del lado del servidor, y esta app no tiene servidor propio.

function abrirCuenta() {
  const user = getUser();
  if (!user) return;
  $('cuenta-mail').textContent = user.email || '';
  $('cuenta-form').reset();
  ocultarOjos($('cuenta-form'));
  $('cuenta-error').textContent = '';
  $('cuenta-ok').textContent = '';
  $('cuenta-overlay').style.display = 'flex';
  $('cuenta-actual').focus();
}

function cerrarCuenta() {
  $('cuenta-overlay').style.display = 'none';
  $('cuenta-form').reset();
}

function revisarCambio(actual, nueva, nueva2) {
  if (!actual) return 'Escribí tu contraseña actual. Si no tenés, usá el botón de abajo.';
  if (!nueva) return 'Escribí la contraseña nueva.';
  if (nueva.length < 8) return 'La contraseña nueva necesita al menos 8 caracteres.';
  if (nueva !== nueva2) return 'Las dos contraseñas nuevas no son iguales.';
  if (nueva === actual) return 'La contraseña nueva es igual a la de ahora.';
  return null;
}

function initCuentaUI() {
  initOjos($('cuenta-form'));

  $('cuenta-btn').addEventListener('click', abrirCuenta);
  $('cuenta-cerrar').addEventListener('click', cerrarCuenta);
  $('cuenta-overlay').addEventListener('click', e => {
    if (e.target === $('cuenta-overlay')) cerrarCuenta();
  });

  $('cuenta-form').addEventListener('submit', async e => {
    e.preventDefault();
    const actual = $('cuenta-actual').value;
    const nueva = $('cuenta-nueva').value;
    const nueva2 = $('cuenta-nueva2').value;

    const problema = revisarCambio(actual, nueva, nueva2);
    if (problema) { $('cuenta-error').textContent = problema; return; }

    $('cuenta-guardar').disabled = true;
    $('cuenta-error').textContent = '';
    $('cuenta-ok').textContent = '';
    try {
      await cambiarContrasenaConLaActual(actual, nueva);
      $('cuenta-form').reset();
      ocultarOjos($('cuenta-form'));
      $('cuenta-ok').textContent = 'Listo, ya tenés contraseña nueva.';
    } catch (err) {
      $('cuenta-error').textContent = mensajeDeError(err);
    } finally {
      $('cuenta-guardar').disabled = false;
    }
  });

  // Sin contraseña previa: el mail de "me olvidé" sirve igual para crearla.
  $('cuenta-mail-clave').addEventListener('click', async () => {
    const user = getUser();
    if (!user?.email) return;
    $('cuenta-error').textContent = '';
    $('cuenta-ok').textContent = '';
    try {
      await pedirResetDeContrasena(user.email, PAGINA_RESET);
      $('cuenta-ok').textContent =
        `Te mandamos un mail a ${user.email} con el link para elegir la contraseña.`;
    } catch (err) {
      $('cuenta-error').textContent = mensajeDeError(err);
    }
  });

  $('cuenta-vincular').addEventListener('click', async () => {
    $('cuenta-error').textContent = '';
    try {
      await vincularGoogle();
    } catch (err) {
      $('cuenta-error').textContent = mensajeDeError(err);
    }
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  initTemas();
  initSelector();
  initPlannerUI();

  await initSesion();
  const { migrado, subido, error } = await cargar();

  aplicarTema(store.tema);
  initAuthUI();
  initCuentaUI();
  document.getElementById('planner-btn')
    .addEventListener('click', () => openPlanner(carrera));

  const pedida = new URL(location).searchParams.get('c');
  irA(pedida || store.carreraActiva);

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Si Google no pudo entrar, volvió con ?error= en la URL y hay que decirlo:
  // si no, la pantalla se ve igual que siempre y parece que no pasó nada. Va
  // en el modal, no en el cartelito de abajo: el cartelito lo pisa el próximo
  // "Guardado" y encima acá hay algo para leer y decidir.
  const falloGoogle = errorDeRedireccion();

  if (falloGoogle) mostrarFalloDeGoogle(falloGoogle);
  else if (error) indicador(`✗ ${error}`, 'error', 7000);
  else if (subido) indicador('✓ Tu progreso quedó en la cuenta', 'saved', 4000);
  else if (migrado) indicador('✓ Progreso importado de las apps viejas', 'saved', 4000);
}

// Si el arranque se rompe (un import que no carga, la base caída), lo peor que
// puede pasar es quedarse mirando los puntitos: mejor mostrar qué pasó.
function bootRoto(e) {
  console.error('Error al arrancar:', e);
  const pantalla = document.getElementById('loading-screen');
  pantalla.innerHTML = '';
  const aviso = document.createElement('p');
  aviso.className = 'boot-error';
  aviso.textContent = `No pude arrancar la app. ${mensajeDeError(e)} Probá recargar la página.`;
  pantalla.appendChild(aviso);
}

window.addEventListener('resize', () => {
  if (carrera?.completo) requestAnimationFrame(() => drawArrows(carrera, store.estados));
});

boot().catch(bootRoto);
