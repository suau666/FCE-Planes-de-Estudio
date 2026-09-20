// Adapter para quien no tiene cuenta: no guarda nada.
//
// Se puede probar la app entera —marcar materias, ver el porcentaje, cambiar
// de carrera— pero al volver no queda nada. Guardar el progreso de verdad es
// lo que da la cuenta. Misma interfaz que los otros: `load()` y `save()`.

export default {
  id: 'memoria',
  etiqueta: 'Sin guardar',

  async load() {
    return null;
  },

  async save() {
    // A propósito no hace nada: el progreso vive en `store` mientras la
    // pestaña esté abierta y se pierde al recargar.
  },
};
