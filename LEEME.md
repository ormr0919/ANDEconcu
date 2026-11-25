# Camino a la libertad · Trivia de estudio

Juego de preguntas tipo ruleta para estudiar. Es una guía de estudio **no oficial**.

## Qué incluye

- **427 preguntas** de opción múltiple, de dificultad media y media-alta (249 media-alta). Cada una tiene su explicación y la fuente oficial de la que sale.
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
  - Partida con ranking: ruleta, 3 vidas, 15 preguntas de 45 segundos, medallas por área y corona cada 3 aciertos seguidos. Desde la 6.ª pregunta se pone más difícil.
  - Simulacro de examen: formato real, sin respuestas hasta el final y con reloj general. Para CPI son 30 preguntas en 45 minutos, con nota sobre 30. Para el Ingeniero son 20 preguntas en 30 minutos, con nota sobre 25. Se aprueba con el 60 %.
  - Entrenamiento personalizado.
  - Práctica por tema.
  - Repaso de errores.
  - Duelo de estudio de 2 a 4 personas.
- **Perfil:** cada persona ve sus récords, su mejor racha sin errores y su dominio por área con colores: verde ≥ 80 %, ámbar 60–79 %, rojo < 60 %. El **plan de refuerzo** es privado: solo lo ve cada jugador.
- **Tops por puesto:** por puntaje y por racha sin errores, actualizados en tiempo real.
- **Memoria:** el progreso se guarda solo después de cada respuesta. Con Firebase, además se guarda una copia en la nube.
- **Pensado para el celular:** se puede instalar como app, funciona sin conexión (salvo el ranking y los duelos), vibra al responder y permite compartir el resultado por WhatsApp.

## Firebase (ranking en vivo, perfiles, duelos y copia del progreso)

Ya está activo, en el proyecto `camino-libertad-d9ae1`, plan gratuito:

- **Firestore:** en São Paulo, con las reglas de `firestore.rules`.
- **Ingreso anónimo:** activado. Los jugadores no tienen que crear ninguna cuenta.
- **Dominio autorizado:** `ormr0919.github.io`.

Consola: <https://console.firebase.google.com/project/camino-libertad-d9ae1>. Si cambiás `firestore.rules`, pegá el archivo nuevo en *Firestore → Reglas* y tocá *Publicar*.

## Actualizar el juego

- **Preguntas:** están en `js/preguntas-cpi-1.js`, `js/preguntas-cpi-2.js`, `js/preguntas-ing.js` y `js/preguntas-extra.js`. Formato: `[categoría, dificultad, pregunta, [correcta, incorrecta, incorrecta, incorrecta], explicación, fuente]`.
- Después de cada cambio, subí el número de `VERSION` en `sw.js` (por ejemplo, `camino-v4`) para que los celulares descarguen la versión nueva.

## Fuentes

Las fuentes son las actas de las Comisiones de Selección (ANDE-CPI-05, 06, 07 y 08-2026 y ANDE-CPIEP-74-2026) y la bibliografía que esas actas citan:

- ANDE: Pliego de Tarifas N.º 21 (versión 27-11-2024), Reglamento de Baja Tensión, Reglamento de Media Tensión, y Misión, Visión y Valores.
- OpenStax: *Física universitaria* vol. 2 e *Introducción a la estadística*.
- Microsoft: ayuda de Excel.
- Ley N.º 7445/2025 y Resolución VCHGO N.º 33/2026.
- INSST: guía técnica del riesgo eléctrico.

Ante cualquier diferencia, valen los documentos oficiales.
