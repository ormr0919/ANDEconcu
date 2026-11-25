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
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCcL-54UQDaib-pAPDJF5kvtgkw5MzFFUo',
  authDomain: 'camino-libertad-d9ae1.firebaseapp.com',
  projectId: 'camino-libertad-d9ae1',
  storageBucket: 'camino-libertad-d9ae1.firebasestorage.app',
  messagingSenderId: '1005901973854',
  appId: '1:1005901973854:web:891de37909ffbf0e22a7cf'
};
