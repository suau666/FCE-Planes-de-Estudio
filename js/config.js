// Conexión con Neon. Las dos URLs son públicas: lo que protege los datos es
// el RLS del esquema (db/schema.sql), no esconderlas.
//
// Si quedan vacías, la app funciona igual pero sin cuentas: el progreso se
// guarda sólo en este dispositivo.

export const NEON_AUTH_URL =
  'https://ep-square-mountain-au0qj9jm.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth';

export const NEON_DATA_API_URL =
  'https://ep-square-mountain-au0qj9jm.apirest.c-10.us-east-1.aws.neon.tech/neondb/rest/v1';

// Versión del SDK de Neon que carga el navegador. Sin bundler: se importa
// desde el CDN en js/db/client.js.
export const NEON_SDK = 'https://esm.sh/@neondatabase/neon-js@0.7.0-beta';

export const hayNeon = Boolean(NEON_AUTH_URL && NEON_DATA_API_URL);
