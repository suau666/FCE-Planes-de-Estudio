// Chips para elegir carrera: se pueden marcar todas las que curse, pero
// siempre hay una principal.
//
// Se usa en dos lados con el mismo comportamiento: al crear la cuenta y en
// "Mi cuenta". El orden importa y se ve: la primera dice PRINCIPAL, porque es
// la que abre la app y la que cuenta en las estadísticas; las demás quedan
// numeradas en el orden en que se eligieron.

export function montarChips(cont, opciones, { max = Infinity, min = 0, alPasarse, alQuedarseCorto, alCambiar } = {}) {
  let elegidas = [];

  function pintar() {
    for (const chip of cont.querySelectorAll('.auth-chip')) {
      const puesto = elegidas.indexOf(chip.dataset.valor);
      const orden = chip.querySelector('.auth-chip-orden');
      chip.classList.toggle('elegida', puesto >= 0);
      orden.textContent = puesto === 0 ? 'principal' : puesto > 0 ? `${puesto + 1}ª` : '';
      chip.title = puesto === 0
        ? 'Tu carrera principal: es la que se abre al entrar'
        : puesto > 0 ? 'Sacá la principal para que esta tome su lugar'
        : 'Tocá para elegirla';
    }
  }

  for (const o of opciones) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'auth-chip';
    chip.dataset.valor = o.id;

    const texto = document.createElement('span');
    texto.textContent = o.titulo;
    const orden = document.createElement('span');
    orden.className = 'auth-chip-orden';
    chip.append(texto, orden);

    chip.addEventListener('click', () => {
      const i = elegidas.indexOf(o.id);
      if (i >= 0) {
        // Sacar la última dejaría a la cuenta sin carrera principal, y eso no
        // puede pasar: para cambiarla se elige la otra primero.
        if (elegidas.length <= min) return alQuedarseCorto?.(min);
        elegidas.splice(i, 1);
      } else if (elegidas.length < max) {
        elegidas.push(o.id);
      } else {
        return alPasarse?.(max);
      }
      pintar();
      alCambiar?.([...elegidas]);
    });
    cont.appendChild(chip);
  }

  pintar();

  return {
    valor: () => [...elegidas],
    poner(ids) {
      elegidas = (ids || []).slice(0, max);
      pintar();
    },
  };
}
