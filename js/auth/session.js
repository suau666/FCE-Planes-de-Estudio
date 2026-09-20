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

function fallo(error) {
  // Better Auth: { message, status, code }. El mensaje suele venir en inglés.
  const msg = error?.message || 'No pude completar la operación';
  const traduccion = {
    'Invalid email or password': 'Mail o contraseña incorrectos',
    'User already exists': 'Ya hay una cuenta con ese mail',
    'Password too short': 'La contraseña es muy corta',
  };
  throw new Error(traduccion[msg] || msg);
}

export async function signIn({ email, password }) {
  const client = await getClient();
  const { data, error } = await client.auth.signIn.email({ email, password });
  if (error) fallo(error);
  return adoptar(data?.user ?? null);
}

export async function signUp({ email, password, nombre }) {
  const client = await getClient();
  const { data, error } = await client.auth.signUp.email({
    email, password, name: nombre || email.split('@')[0],
  });
  if (error) fallo(error);
  // Según cómo esté configurado Neon Auth, puede pedir verificar el mail y no
  // devolver sesión. En ese caso probamos entrar directo.
  if (data?.user) return adoptar(data.user);
  return signIn({ email, password });
}

export async function signInConGoogle() {
  const client = await getClient();
  const { error } = await client.auth.signIn.social({
    provider: 'google',
    callbackURL: location.href,
  });
  if (error) fallo(error);
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
