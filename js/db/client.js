// Cliente de Neon: login (Better Auth) y consultas al Data API con el mismo
// objeto. El token de la sesión lo adjunta el SDK solo.
//
// Se carga una sola vez y bajo demanda: si alguien nunca toca "Entrar", el
// navegador no descarga el SDK.

import { NEON_AUTH_URL, NEON_DATA_API_URL, NEON_SDK, hayNeon } from '../config.js';

let promesa = null;

export function getClient() {
  if (!hayNeon) return Promise.reject(new Error('Falta configurar Neon en js/config.js'));
  return promesa ??= import(/* @vite-ignore */ NEON_SDK).then(({ createClient }) =>
    createClient({
      // El Data API exige un token siempre, incluso para el catálogo público.
      // `allowAnonymous` consigue uno para el rol `anonymous` cuando no hay
      // sesión, que es lo que deja leer carreras y estadísticas sin cuenta.
      auth: { url: NEON_AUTH_URL, allowAnonymous: true },
      dataApi: { url: NEON_DATA_API_URL },
    }));
}

// El SDK devuelve { data, error } en vez de tirar excepción. Casi siempre
// queremos lo contrario: que un error corte el guardado y lo vea el indicador.
export function chequear(res, queHacia) {
  if (res?.error) {
    const e = new Error(`${queHacia}: ${res.error.message || res.error}`);
    e.causa = res.error;
    throw e;
  }
  return res?.data;
}
