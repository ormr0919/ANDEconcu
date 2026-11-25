/*
 * Configuración de Firebase para el ranking en tiempo real.
 *
 * Mientras esto quede en null, el juego funciona igual pero el ranking es local
 * (solo de este navegador). Para activarlo en línea, seguí los pasos de LEEME.md
 * y pegá aquí el objeto firebaseConfig que te da la consola de Firebase, por ejemplo:
 *
 * export const FIREBASE_CONFIG = {
 *   apiKey: '...',
 *   authDomain: 'tu-proyecto.firebaseapp.com',
 *   projectId: 'tu-proyecto',
 *   storageBucket: 'tu-proyecto.appspot.com',
 *   messagingSenderId: '...',
 *   appId: '...'
 * };
 *
 * Estos datos no son secretos: Firebase los expone en todas las páginas web.
 * La protección está en las reglas de firestore.rules.
 */
export const FIREBASE_CONFIG = null;
