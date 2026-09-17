// Adapter de persistencia local. Misma interfaz que tendrá el remoto:
// `load()` devuelve el documento de progreso (o null), `save(doc)` lo guarda.

const KEY = 'fce_planes_v1';

export default {
  id: 'local',
  etiqueta: 'Este dispositivo',

  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('No pude leer el progreso guardado:', e);
      return null;
    }
  },

  async save(doc) {
    localStorage.setItem(KEY, JSON.stringify(doc));
  },
};
