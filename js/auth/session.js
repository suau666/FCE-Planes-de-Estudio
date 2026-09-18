// Sesión del usuario.
//
// Por ahora hay un único usuario anónimo, con el progreso en este dispositivo.
// La interfaz ya es la definitiva para que enchufar el login real (Neon Auth
// con mail, Google, lo que sea) no toque el resto de la app:
// alcanza con que `getUser()` devuelva un usuario con id y que
// `storage/index.js` le dé el adapter remoto.

let user = null;   // null = anónimo

const oyentes = new Set();
const avisar = () => oyentes.forEach(fn => fn(user));

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

export async function signIn() {
  // TODO: login real. Cuando exista, setear `user` y avisar.
  throw new Error('El login todavía no está implementado');
}

export async function signOut() {
  user = null;
  avisar();
}
