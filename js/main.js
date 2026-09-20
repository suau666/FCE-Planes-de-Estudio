import { CARRERAS, getCarrera } from './data/index.js';
import { store, cargar, scheduleSave, indicador, onSinCuenta } from './core/state.js';
import { initEstados } from './core/rules.js';
import { renderAll } from './core/render.js';
import { drawArrows } from './core/arrows.js';
import { openPlanner, initPlannerUI } from './core/planner.js';
import {
  initSesion, signIn, signUp, signInConGoogle, signOut, pedirResetDeContrasena,
  cambiarContrasenaConLaActual, vincularGoogle, mandarCodigo, verificarCodigo,
  formasDeEntrar, mandarCodigoDeContrasena, ponerContrasenaConCodigo, eliminarCuenta,
  errorDeRedireccion, getUser, nombreVisible, mensajeDeError,
} from './auth/session.js';
import { PAGINA_RESET } from './auth/reset-url.js';
import { initOjos, ocultarOjos } from './auth/ojo.js';
import { montarChips } from './core/chips.js';
import { abrirOverlay, cerrarOverlay } from './core/modal.js';
import { hayNeon } from './config.js';

let carrera = null;

// ── Temas ────────────────────────────────────────────────────────────────────
// El blanco es el predeterminado, así que va primero.
const TEMAS = ['white', 'dark', 'aqua', 'cream'];

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
  $('cuenta-btn').style.display = getUser() ? '' : 'none';
  $('auth-btn').textContent = getUser() ? 'Salir' : 'Entrar';
  $('auth-btn').title = getUser()
    ? `Cerrar la sesión de ${nombreVisible()}`
    : 'Guardar el progreso en tu cuenta';
  $('cuenta-btn').title = getUser() ? `Tu cuenta: ${nombreVisible()}` : '';
  $('planner-btn').title = getUser()
    ? 'Armar tu plan de cuatrimestres'
    : 'Necesitás una cuenta para planificar cuatrimestres';
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
    sub: 'Lo que marcaste en esta visita se sube a la cuenta nueva.',
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

// Los chips de "¿qué estudiás?". La primera elegida es la principal: es la que
// se abre al entrar, y la que cuenta en las estadísticas de la carrera.
const MAX_CARRERAS = 2;
let chipsRegistro = null;

function initChips() {
  chipsRegistro = montarChips($('auth-carreras'), CARRERAS, {
    max: MAX_CARRERAS,
    min: 1,
    alQuedarseCorto: () => {
      $('auth-error').textContent =
        'Elegí al menos una carrera. Si te equivocaste, tocá la correcta y esta se saca sola.';
    },
    alPasarse: max => {
      $('auth-error').textContent =
        `${max} carreras como máximo. Sacá una si querés cambiarla.`;
    },
    alCambiar: () => { $('auth-error').textContent = ''; },
  });
}

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
    if (!chipsRegistro.valor().length) return 'Elegí qué carrera estudiás.';
  }
  return null;
}

function abrirModal(enModo = ENTRAR) {
  modo = enModo;
  chipsRegistro.poner(store.carreras);
  ocultarOjos($('auth-form'));
  pintarModo();
  abrirOverlay($('auth-overlay'));
  $('auth-email').focus();
}

function cerrarModal() {
  cerrarOverlay($('auth-overlay'));
  $('auth-form').reset();
  $('auth-error').textContent = '';
}

// La carrera que eligió al registrarse es la que abre siempre; `carreraActiva`
// es sólo la última que miró y no pisa a la principal.
function carreraDeArranque() {
  return store.carreras?.[0] || store.carreraActiva;
}

// La URL no sigue a la carrera que se mira: siempre abre la principal. Si
// viene un ?c= de un link viejo, se limpia para que no confunda.
function limpiarUrlDeCarrera() {
  const url = new URL(location);
  if (!url.searchParams.has('c')) return;
  url.searchParams.delete('c');
  history.replaceState(null, '', url);
}

// Después de entrar o salir, el progreso es otro: hay que traerlo y redibujar.
async function recargarProgreso() {
  const { subido, error } = await cargar();
  pintarSesion();
  aplicarTema(store.tema);
  irA(carreraDeArranque());
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
  initChips();

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
    try {
      await mandarCodigo(mailAVerificar);
      mostrarExito('Código reenviado',
        `Te mandamos otro código de 6 dígitos a ${mailAVerificar}.`);
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
    try {
      if (modo === RECUPERAR) {
        await pedirResetDeContrasena(datos.email, PAGINA_RESET);
        cerrarModal();
        // A propósito no decimos si el mail existe o no.
        mostrarExito('Revisá tu casilla',
          'Si hay una cuenta con ese mail, te mandamos un link para elegir una '
          + 'contraseña nueva. Dura 15 minutos.');
      } else if (modo === VERIFICAR) {
        await verificarCodigo(mailAVerificar, datos.codigo);
        cerrarModal();
        await recargarProgreso();
      } else {
        // Lo que eligió viaja con el resto del progreso: `cargar()` sube todo
        // junto cuando la cuenta queda abierta.
        if (modo === REGISTRO) {
          store.carreras = chipsRegistro.valor();
          store.carreraActiva = store.carreras[0] || store.carreraActiva;
        }
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

// ── Modal de "listo" ─────────────────────────────────────────────────────────
// Cuando algo sale bien y conviene salir de la pantalla donde se estaba (la
// contraseña, por ejemplo), el cartel va en su propio modal: así no queda un
// mensaje verde perdido entre campos que ya no hacen falta.

const TILDE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

function mostrarExito(titulo, texto) {
  $('exito-tilde').innerHTML = TILDE;
  $('exito-titulo').textContent = titulo;
  $('exito-texto').textContent = texto;
  abrirOverlay($('exito-overlay'));
}

function initExito() {
  $('exito-cerrar').addEventListener('click', () => cerrarOverlay($('exito-overlay')));
  $('exito-overlay').addEventListener('click', e => {
    if (e.target === $('exito-overlay')) cerrarOverlay($('exito-overlay'));
  });
}

// ── Mi cuenta ────────────────────────────────────────────────────────────────
// Muestra sólo lo que falta: si ya tiene contraseña ofrece cambiarla, si no,
// crearla; y Google aparece únicamente si todavía no está vinculado. La lista
// viene de Better Auth (`list-accounts`).

let chipsCuenta = null;

function pintarFormasDeEntrar({ clave, google, incierto = false }) {
  const formas = [];
  if (clave) formas.push('mail y contraseña');
  if (google) formas.push('Google');

  $('cuenta-formas').textContent = incierto
    ? 'No pude confirmar cómo entrás a esta cuenta, así que te dejo las dos opciones.'
    : formas.length ? `Hoy entrás con ${formas.join(' y ')}.`
    : 'Todavía no tenés forma de entrar configurada.';

  $('cuenta-clave-btn').textContent = clave
    ? 'Cambiar mi contraseña'
    : 'Mandarme un mail para crear una contraseña';
  $('cuenta-clave-btn').dataset.tiene = clave ? 'si' : 'no';

  $('cuenta-vincular').style.display = google ? 'none' : '';
}

async function abrirCuenta() {
  const user = getUser();
  if (!user) return;
  $('cuenta-mail').textContent = user.email || '';
  chipsCuenta.poner(store.carreras);
  $('cuenta-error').textContent = '';
  $('cuenta-formas').textContent = 'Viendo cómo entrás…';
  abrirOverlay($('cuenta-overlay'));

  try {
    const formas = await formasDeEntrar();
    pintarFormasDeEntrar({
      clave: formas.includes('credential'),
      google: formas.includes('google'),
    });
  } catch (e) {
    console.warn('No pude leer las formas de entrar:', e);
    pintarFormasDeEntrar({ clave: true, google: false, incierto: true });
  }
}

function cerrarCuenta() {
  cerrarOverlay($('cuenta-overlay'));
}

// ── Contraseña, en su propio modal ───────────────────────────────────────────
// Dos caminos en la misma pantalla. Si sabe la actual, se cambia al toque. Si
// no —porque entró con Google, o porque se la olvidó—, Neon manda un código de
// 6 dígitos y se completa acá mismo, sin ir a buscar ningún link.

const CON_ACTUAL = 'actual', CON_CODIGO = 'codigo';
let modoClave = CON_ACTUAL;

function pintarModoClave() {
  const conCodigo = modoClave === CON_CODIGO;
  const mail = getUser()?.email || 'tu mail';

  $('clave-titulo').innerHTML = conCodigo
    ? 'Tu contraseña <span>·</span> Con un código'
    : 'Cambiar <span>·</span> Mi contraseña';
  $('clave-sub').textContent = conCodigo
    ? `Te mandamos un código de 6 dígitos a ${mail}. Ponelo acá junto con la contraseña que quieras.`
    : 'Para cambiarla hay que saber la de ahora.';

  $('clave-actual-campo').style.display = conCodigo ? 'none' : '';
  $('clave-codigo-campo').style.display = conCodigo ? '' : 'none';
  $('clave-cambiar-texto').textContent = conCodigo
    ? '¿No te llegó?' : '¿No te acordás la actual?';
  $('clave-cambiar').textContent = conCodigo
    ? 'Mandalo de nuevo' : 'Mandame un código';

  $('clave-error').textContent = '';
}

async function pedirCodigoDeClave() {
  const user = getUser();
  if (!user?.email) return;
  try {
    await mandarCodigoDeContrasena(user.email);
    modoClave = CON_CODIGO;
    pintarModoClave();
    mostrarExito('Código enviado',
      `Te mandamos un código de 6 dígitos a ${user.email}. Ponelo junto con la `
      + 'contraseña nueva.');
    $('clave-codigo').focus();
  } catch (err) {
    $('clave-error').textContent = mensajeDeError(err);
  }
}

async function abrirClave(conCodigo = false) {
  $('clave-form').reset();
  ocultarOjos($('clave-form'));
  modoClave = CON_ACTUAL;
  pintarModoClave();
  abrirOverlay($('clave-overlay'));

  if (conCodigo) await pedirCodigoDeClave();
  else $('cuenta-actual').focus();
}

function cerrarClave() {
  cerrarOverlay($('clave-overlay'));
  $('clave-form').reset();
}

function revisarCambio({ actual, codigo, nueva, nueva2 }) {
  if (modoClave === CON_CODIGO) {
    if (!codigo) return 'Escribí el código que te llegó por mail.';
    if (!/^\d{6}$/.test(codigo)) return 'El código son 6 dígitos.';
  } else if (!actual) {
    return 'Escribí tu contraseña actual.';
  }
  if (!nueva) return 'Escribí la contraseña nueva.';
  if (nueva.length < 8) return 'La contraseña nueva necesita al menos 8 caracteres.';
  if (nueva !== nueva2) return 'Las dos contraseñas nuevas no son iguales.';
  if (modoClave === CON_ACTUAL && nueva === actual) {
    return 'La contraseña nueva es igual a la de ahora.';
  }
  return null;
}

// ── Eliminar la cuenta ───────────────────────────────────────────────────────

function abrirBorrar() {
  $('borrar-form').reset();
  $('borrar-error').textContent = '';
  abrirOverlay($('borrar-overlay'));
  $('borrar-palabra').focus();
}

function cerrarBorrar() {
  cerrarOverlay($('borrar-overlay'));
  $('borrar-form').reset();
}

function initCuentaUI() {
  initOjos($('clave-form'));

  // Cambiar de carrera se aplica al toque: no hay botón de guardar para esto.
  chipsCuenta = montarChips($('cuenta-carreras'), CARRERAS, {
    max: MAX_CARRERAS,
    min: 1,
    alPasarse: max => {
      $('cuenta-error').textContent =
        `${max} carreras como máximo. Sacá una si querés cambiarla.`;
    },
    alQuedarseCorto: () => {
      $('cuenta-error').textContent =
        'Tenés que estudiar al menos una carrera. Elegí la otra y esta se saca sola.';
    },
    alCambiar: elegidas => {
      $('cuenta-error').textContent = '';
      store.carreras = elegidas;
      if (elegidas[0] && elegidas[0] !== store.carreraActiva) irA(elegidas[0]);
      else scheduleSave();
    },
  });

  $('cuenta-btn').addEventListener('click', abrirCuenta);
  $('cuenta-cerrar').addEventListener('click', cerrarCuenta);
  $('cuenta-overlay').addEventListener('click', e => {
    if (e.target === $('cuenta-overlay')) cerrarCuenta();
  });

  // Con contraseña, se pide la actual. Sin contraseña, arranca directo por el
  // código: `set-password` no existe para el navegador, pero el código sí.
  $('cuenta-clave-btn').addEventListener('click', () => {
    cerrarCuenta();
    abrirClave($('cuenta-clave-btn').dataset.tiene !== 'si');
  });

  $('cuenta-eliminar').addEventListener('click', () => {
    cerrarCuenta();
    abrirBorrar();
  });

  $('clave-cambiar').addEventListener('click', pedirCodigoDeClave);

  $('borrar-cerrar').addEventListener('click', cerrarBorrar);
  $('borrar-overlay').addEventListener('click', e => {
    if (e.target === $('borrar-overlay')) cerrarBorrar();
  });

  $('borrar-form').addEventListener('submit', async e => {
    e.preventDefault();
    if ($('borrar-palabra').value.trim().toUpperCase() !== 'ELIMINAR') {
      $('borrar-error').textContent = 'Escribí ELIMINAR para confirmar.';
      return;
    }
    $('borrar-confirmar').disabled = true;
    $('borrar-error').textContent = '';
    try {
      await eliminarCuenta();
      cerrarBorrar();
      await recargarProgreso();
      mostrarExito('Cuenta eliminada',
        'Se borró tu cuenta y todo tu progreso. Seguís pudiendo usar la app sin '
        + 'cuenta, pero lo que marques no se guarda.');
    } catch (err) {
      $('borrar-error').textContent = mensajeDeError(err);
    } finally {
      $('borrar-confirmar').disabled = false;
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

  $('clave-cerrar').addEventListener('click', cerrarClave);
  $('clave-overlay').addEventListener('click', e => {
    if (e.target === $('clave-overlay')) cerrarClave();
  });

  $('clave-form').addEventListener('submit', async e => {
    e.preventDefault();
    const datos = {
      actual: $('cuenta-actual').value,
      codigo: $('clave-codigo').value.trim(),
      nueva: $('cuenta-nueva').value,
      nueva2: $('cuenta-nueva2').value,
    };

    const problema = revisarCambio(datos);
    if (problema) { $('clave-error').textContent = problema; return; }

    $('clave-guardar').disabled = true;
    $('clave-error').textContent = '';
    try {
      if (modoClave === CON_CODIGO) {
        await ponerContrasenaConCodigo(getUser().email, datos.codigo, datos.nueva);
      } else {
        await cambiarContrasenaConLaActual(datos.actual, datos.nueva);
      }
      cerrarClave();
      mostrarExito('Contraseña cambiada',
        'Ya podés entrar con la nueva. La vas a necesitar la próxima vez que '
        + 'inicies sesión en otro dispositivo.');
    } catch (err) {
      $('clave-error').textContent = mensajeDeError(err);
    } finally {
      $('clave-guardar').disabled = false;
    }
  });
}

// ── Invitación a tener cuenta ────────────────────────────────────────────────
// Dos momentos, un solo modal. Al marcar la primera materia se avisa que sin
// cuenta no se guarda nada; si lo cierran, no se insiste más en toda la
// visita. El planificador es aparte: ahí la cuenta no es un consejo, es el
// requisito, así que se muestra siempre.

const INVITACIONES = {
  progreso: {
    titulo: 'Guardá tu progreso <span>·</span> Es gratis',
    texto: 'Lo que marcás no queda guardado: si cerrás o recargás la página se '
      + 'pierde. Con una cuenta tu progreso te sigue a cualquier dispositivo, y '
      + 'las materias que compartís entre carreras se cuentan solas.',
  },
  planificador: {
    titulo: 'Planificador <span>·</span> Sólo con cuenta',
    texto: 'Armar los cuatrimestres es para quienes tienen cuenta: el plan se '
      + 'guarda ahí, no en este dispositivo. Creala y lo tenés siempre, con tu '
      + 'progreso al día.',
  },
};

// Que no vuelva a aparecer si ya la cerraron. Dura lo que dura la pestaña:
// no se guarda nada en el navegador.
const YA_LA_VIO = 'fce_invitacion_cerrada';

function yaCerroLaInvitacion() {
  try {
    return sessionStorage.getItem(YA_LA_VIO) === '1';
  } catch {
    return false;
  }
}

function recordarQueLaCerro() {
  try {
    sessionStorage.setItem(YA_LA_VIO, '1');
  } catch {
    // Modo incógnito con el almacenamiento bloqueado: paciencia, se vuelve a
    // mostrar en la próxima visita.
  }
}

function invitar(tipo) {
  if (getUser()) return;
  if (tipo === 'progreso' && yaCerroLaInvitacion()) return;

  const t = INVITACIONES[tipo];
  $('invitar-titulo').innerHTML = t.titulo;
  $('invitar-texto').textContent = t.texto;
  abrirOverlay($('invitar-overlay'));
}

function cerrarInvitacion({ recordar = true } = {}) {
  cerrarOverlay($('invitar-overlay'));
  if (recordar) recordarQueLaCerro();
}

function initInvitacion() {
  // Al marcar la primera materia sin cuenta.
  onSinCuenta(() => invitar('progreso'));

  $('invitar-cerrar').addEventListener('click', () => cerrarInvitacion());
  $('invitar-overlay').addEventListener('click', e => {
    if (e.target === $('invitar-overlay')) cerrarInvitacion();
  });

  $('invitar-crear').addEventListener('click', () => {
    cerrarInvitacion({ recordar: false });
    abrirModal(REGISTRO);
  });
  $('invitar-entrar').addEventListener('click', () => {
    cerrarInvitacion({ recordar: false });
    abrirModal(ENTRAR);
  });
  $('invitar-google').addEventListener('click', async () => {
    try {
      await signInConGoogle();
    } catch (err) {
      cerrarInvitacion({ recordar: false });
      abrirModal(ENTRAR);
      $('auth-error').textContent = mensajeDeError(err);
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
  initInvitacion();
  initExito();
  document.getElementById('planner-btn')
    .addEventListener('click', () => {
      // El planificador arma un plan para varios cuatrimestres: sin cuenta se
      // perdería al recargar, así que pide entrar antes.
      if (!getUser()) return invitar('planificador');
      openPlanner(carrera);
    });

  limpiarUrlDeCarrera();
  irA(carreraDeArranque());

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
