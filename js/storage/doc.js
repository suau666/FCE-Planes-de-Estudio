// La forma del documento de progreso. Vive aparte para que los dos adapters
// puedan usarla sin importarse entre ellos.

export const DOC_VACIO = {
  version: 1,
  tema: 'white',
  carreras: [],     // la que estudia, y una segunda si hace las dos
  carreraActiva: 'actuario',   // la última que miró, no la que estudia
  estados: {},      // código global o "carrera:optN" → estado
  porCarrera: {},   // id de carrera → { optNames, plan }
};
