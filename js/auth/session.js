// Sesión del usuario, contra Neon Auth (Better Auth administrado).
//
// Sin sesión la app sigue andando: el progreso queda en este dispositivo
// (js/storage/local.js). Con sesión pasa a la base y se comparte entre
// dispositivos. Quien quiera saber si hay alguien logueado usa `getUser()`.

import { getClient } from '../db/client.js';
import { hayNeon } from '../config.js';

let user = null;   // null = anónimo

const oyentes = new Set();
const avisar = () => oyentes.forEach(fn => fn(user));

// Better Auth devuelve el usuario con id (uuid), email y name.
function adoptar(u) {
  user = u ? { id: u.id, email: u.email, nombre: u.name || '' } : null;
  avisar();
  return user;
}

export function getUser() {
  return user;
}

export function esAnonimo() {
  return user === null;
}

export function nombreVisible() {
  return user?.nombre || user?.email || 'Invitado';
}

export function onCambioSesion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

// Busca una sesión abierta de antes (la cookie la guarda el navegador).
// Nunca tira error: si Neon no responde, se entra como anónimo.
export async function initSesion() {
  if (!hayNeon) return null;
  try {
    const client = await getClient();
    const { data } = await client.auth.getSession();
    return adoptar(data?.user ?? null);
  } catch (e) {
    console.warn('No pude verificar la sesión, entro como invitado:', e);
    return null;
  }
}

// ── Vuelta de Google ─────────────────────────────────────────────────────────
// Cuando el login social falla, Neon Auth no tira una excepción: redirige a la
// app con ?error=... en la URL. Si no se mira, la pantalla queda igual que
// siempre (como invitado) y el error se queda pegado en la barra de dirección.

const ERROR_REDIRECCION = {
  account_not_linked:
    'Ese mail ya tiene una cuenta con contraseña. Entrá con mail y contraseña, '
    + 'o permití vincular cuentas en la consola de Neon Auth.',
  access_denied: 'No le diste permiso a la app desde Google.',
  signup_disabled: 'Neon Auth no tiene habilitado crear cuentas con Google.',
  invalid_state: 'El link de vuelta de Google venció. Probá de nuevo.',
  state_not_found: 'El link de vuelta de Google venció. Probá de nuevo.',
  please_restart_the_process: 'Se cortó el login con Google. Probá de nuevo.',
};

// Devuelve el mensaje si la URL trae un error, y lo saca de la URL para que no
// quede dando vueltas ni se comparta por accidente.
export function errorDeRedireccion() {
  const url = new URL(location);
  const codigo = url.searchParams.get('error');
  if (!codigo) return null;

  const detalle = url.searchParams.get('error_description');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('error_uri');
  history.replaceState(null, '', url);

  return ERROR_REDIRECCION[codigo] || detalle || `Google no pudo entrar (${codigo}).`;
}

// Better Auth contesta { message, code, status } y el mensaje viene en inglés.
// Traducimos por código (estable) y, si no lo conocemos, por texto.
const POR_CODIGO = {
  INVALID_EMAIL_OR_PASSWORD: 'Mail o contraseña incorrectos.',
  INVALID_EMAIL: 'Ese mail no parece válido.',
  INVALID_PASSWORD: 'Mail o contraseña incorrectos.',
  USER_NOT_FOUND: 'No hay ninguna cuenta con ese mail. Podés crear una.',
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese mail. Probá entrar.',
  PASSWORD_TOO_SHORT: 'La contraseña necesita al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
  EMAIL_NOT_VERIFIED: 'Te falta verificar el mail. Revisá tu casilla.',
  TOO_MANY_REQUESTS: 'Demasiados intentos seguidos. Esperá un minuto.',
  SESSION_EXPIRED: 'Se venció la sesión. Entrá de nuevo.',
  INVALID_TOKEN: 'Ese link ya no sirve: vale 15 minutos. Pedí uno nuevo.',
  TOKEN_EXPIRED: 'Ese link ya venció. Pedí uno nuevo.',
  INVALID_ORIGIN: 'Neon Auth no tiene permitido este dominio. Agregalo en los '
    + 'orígenes permitidos de la consola de Neon.',
};

const POR_TEXTO = {
  'Invalid email or password': 'Mail o contraseña incorrectos.',
  'User already exists': 'Ya existe una cuenta con ese mail. Probá entrar.',
  'User not found': 'No hay ninguna cuenta con ese mail. Podés crear una.',
  'Password too short': 'La contraseña necesita al menos 8 caracteres.',
  'Invalid email': 'Ese mail no parece válido.',
  'Invalid origin': 'Neon Auth no tiene permitido este dominio. Agregalo en los '
    + 'orígenes permitidos de la consola de Neon.',
};

// Traduce cualquier cosa que haya salido mal a una frase que se pueda mostrar.
export function mensajeDeError(e) {
  if (!e) return 'Algo salió mal.';
  if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code];

  const texto = e.message || String(e);
  if (POR_TEXTO[texto]) return POR_TEXTO[texto];

  // Errores de red: el navegador dice "Failed to fetch" y no aclara nada más.
  if (/failed to fetch|networkerror|load failed/i.test(texto)) {
    return 'No pude conectarme a la base. Fijate si tenés internet.';
  }
  // Un token inválido o vencido en el mail de recuperación llega con 401 y
  // hay que distinguirlo de la sesión vencida: la acción a tomar es otra.
  if (/invalid or expired|invalid token|token.{0,12}expired/i.test(texto)) {
    return 'Ese link ya no sirve: los links duran 15 minutos. Pedí uno nuevo.';
  }
  if (e.status === 401 || /jwt|unauthorized|authentication/i.test(texto)) {
    return 'Se venció la sesión. Cerrá y volvé a entrar.';
  }
  if (/invalid origin/i.test(texto)) {
    return `Neon Auth no tiene permitido ${location.origin}. Agregalo en los `
      + 'orígenes permitidos de la consola de Neon.';
  }
  if (/permission denied/i.test(texto)) {
    return 'La base no me dejó hacer eso. Revisá los permisos del esquema.';
  }
  return texto;
}

function fallo(error) {
  const e = new Error(mensajeDeError(error));
  e.causa = error;
  throw e;
}

// Better Auth tira excepción si no hay red; el resto viene en `error`.
async function pedir(fn) {
  let res;
  try {
    res = await fn();
  } catch (e) {
    fallo(e);
  }
  if (res?.error) fallo(res.error);
  return res?.data;
}

export async function signIn({ email, password }) {
  const client = await getClient();
  const data = await pedir(() => client.auth.signIn.email({ email, password }));
  if (!data?.user) throw new Error('El servidor no devolvió la sesión. Probá de nuevo.');
  return adoptar(data.user);
}

export async function signUp({ email, password, nombre }) {
  const client = await getClient();
  const data = await pedir(() => client.auth.signUp.email({
    email, password, name: nombre || email.split('@')[0],
  }));
  // Si Neon Auth pide verificar el mail, la cuenta queda creada pero sin
  // sesión. Se avisa con un error claro en vez de dejar la pantalla igual.
  if (!data?.user) {
    throw new Error('Cuenta creada. Verificá el mail que te mandamos y después entrá.');
  }
  return adoptar(data.user);
}

// Google lo maneja Neon Auth: hay que habilitarlo en la consola del proyecto
// y poner ahí el dominio de la app. Redirige y vuelve con la sesión abierta.
export async function signInConGoogle() {
  const client = await getClient();
  await pedir(() => client.auth.signIn.social({
    provider: 'google',
    callbackURL: location.origin + location.pathname,
  }));
}

// ── Contraseña olvidada ──────────────────────────────────────────────────────
// Neon Auth manda el mail con un link a `paginaDeReset`, que llega con el
// token en la query. El link vale 15 minutos.

export async function pedirResetDeContrasena(email, paginaDeReset) {
  const client = await getClient();
  await pedir(() => client.auth.requestPasswordReset({ email, redirectTo: paginaDeReset }));
}

export async function cambiarContrasena(token, password) {
  const client = await getClient();
  await pedir(() => client.auth.resetPassword({ token, newPassword: password }));
}

export async function signOut() {
  if (hayNeon) {
    try {
      const client = await getClient();
      await client.auth.signOut();
    } catch (e) {
      console.warn('Error al cerrar sesión en el servidor:', e);
    }
  }
  adoptar(null);
}
