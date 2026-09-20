// A dónde lleva el link que manda Neon Auth para elegir una contraseña nueva.
// Se arma desde la página actual para que ande igual en localhost y en Vercel.

export const PAGINA_RESET =
  new URL('nueva-contrasena.html', location.origin + location.pathname).href;
