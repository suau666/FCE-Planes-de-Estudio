// La forma del documento de progreso. Vive aparte para que los dos adapters
// puedan usarla sin importarse entre ellos.

export const DOC_VACIO = {
  version: 1,
  tema: 'dark',
  carreraActiva: 'actuario',
  estados: {},      // código global o "carrera:optN" → estado
  porCarrera: {},   // id de carrera → { optNames, plan }
};
