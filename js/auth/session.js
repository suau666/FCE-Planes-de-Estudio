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
