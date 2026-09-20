// Chips para elegir carrera: una principal y, si hace las dos, una segunda.
//
// Se usa en dos lados con el mismo comportamiento: al crear la cuenta y en
// "Mi cuenta". El orden importa y se ve: la primera dice PRINCIPAL, porque es
// la que abre la app y la que cuenta en las estadísticas.

export function montarChips(cont, opciones, { max = 2, alPasarse, alCambiar } = {}) {
  let elegidas = [];

  function pintar() {
    for (const chip of cont.querySelectorAll('.auth-chip')) {
      const puesto = elegidas.indexOf(chip.dataset.valor);
      const orden = chip.querySelector('.auth-chip-orden');
      chip.classList.toggle('elegida', puesto >= 0);
      orden.textContent = puesto === 0 ? 'principal' : puesto === 1 ? '2ª' : '';
      chip.title = puesto === 0
        ? 'Tu carrera principal: es la que se abre al entrar'
        : puesto > 0 ? 'Tu segunda carrera. Tocá la otra para hacerla principal.'
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
      if (i >= 0) elegidas.splice(i, 1);
      else if (elegidas.length < max) elegidas.push(o.id);
      else return alPasarse?.(max);
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
