# Camino a la libertad · Trivia de estudio

Juego de preguntas tipo ruleta para estudiar. Es una guía de estudio **no oficial**.

## Qué incluye

- **335 preguntas** de opción múltiple, de dificultad media y media-alta. Cada una tiene su explicación y la fuente oficial de la que sale.
- **Puestos:**
  - **Lector Distribuidor II** (CPI-07): 6 bloques.
  - **Operador de Estaciones y Subestaciones IV** (CPI-08): 7 bloques.
  - **Despachante de Carga Junior** (CPI-05): 7 bloques.
  - **Ingeniero Electricista Junior**, contratado (CPIEP-74): estadística, Excel y función pública.
- **Temarios verificados en las actas de Paraguay Concursa:**
  - Operador y Despachante rinden **el mismo temario**.
  - Lector rinde ese mismo temario sin el bloque «Sistemas eléctricos de potencia».
  - El Ingeniero Electricista no rinde electricidad: rinde estadística (10 puntos), planilla electrónica (10), legislación (5) y guaraní (5). Su examen es el 05/12/2026 a las 07:00 en la FP-UNA (Acta N.º 04/2026).
- **Modos de juego:**
  - Partida con ranking: ruleta, 3 vidas, 15 preguntas, medallas por área y corona cada 3 aciertos seguidos.
  - Entrenamiento personalizado.
  - Práctica por tema.
  - Repaso de errores.
  - Duelo de estudio de 2 a 4 personas.
- **Perfil:** cada persona ve sus récords, su mejor racha sin errores y su dominio por área con colores: verde ≥ 80 %, ámbar 60–79 %, rojo < 60 %. El **plan de refuerzo** es privado: solo lo ve cada jugador.
- **Tops por puesto:** por puntaje y por racha sin errores, actualizados en tiempo real.
- **Memoria:** el progreso se guarda solo después de cada respuesta. Con Firebase, además se guarda una copia en la nube.
- **Pensado para el celular:** se puede instalar como app, funciona sin conexión (salvo el ranking y los duelos), vibra al responder y permite compartir el resultado por WhatsApp.

## Activar el ranking en vivo y los duelos (Firebase, gratis)

Sin este paso el juego funciona igual, pero el ranking queda **en cada celular** y el duelo solo funciona entre pestañas del mismo navegador.

1. Entrá a <https://console.firebase.google.com>, creá un proyecto (por ejemplo `camino-libertad`) y desactivá Google Analytics.
2. **Firestore:** en *Build → Firestore Database*, tocá *Create database*, elegí la región `southamerica-east1` y el modo *production*.
3. **Reglas:** en la pestaña *Rules* de Firestore, pegá el contenido de `firestore.rules` y tocá *Publish*.
4. **Autenticación:** en *Build → Authentication → Get started*, activá el proveedor **Anonymous**.
5. **App web:** en *Project settings → General → Your apps*, agregá una app web (ícono `</>`) y copiá el objeto `firebaseConfig`.
6. Pegá ese objeto en `js/firebase-config.js`, en lugar de `null`, y subí el cambio a GitHub.
7. **Dominio:** en *Authentication → Settings → Authorized domains*, agregá `ormr0919.github.io`.

Los datos de `firebaseConfig` no son secretos. La seguridad está en las reglas de `firestore.rules`: cada jugador solo puede escribir su propia fila.

## Actualizar el juego

- **Preguntas:** están en `js/preguntas-cpi-1.js`, `js/preguntas-cpi-2.js` y `js/preguntas-ing.js`. Formato: `[categoría, dificultad, pregunta, [correcta, incorrecta, incorrecta, incorrecta], explicación, fuente]`.
- Después de cada cambio, subí el número de `VERSION` en `sw.js` (por ejemplo, `camino-v2`) para que los celulares descarguen la versión nueva.

## Fuentes

Las fuentes son las actas de las Comisiones de Selección (ANDE-CPI-05, 06, 07 y 08-2026 y ANDE-CPIEP-74-2026) y la bibliografía que esas actas citan:

- ANDE: Pliego de Tarifas N.º 21 (versión 27-11-2024), Reglamento de Baja Tensión, Reglamento de Media Tensión, y Misión, Visión y Valores.
- OpenStax: *Física universitaria* vol. 2 e *Introducción a la estadística*.
- Microsoft: ayuda de Excel.
- Ley N.º 7445/2025 y Resolución VCHGO N.º 33/2026.
- INSST: guía técnica del riesgo eléctrico.

Ante cualquier diferencia, valen los documentos oficiales.
