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
  - **En línea ahora:** muestra quién tiene el juego abierto y permite desafiarlo. Le llega una invitación que puede aceptar durante 60 segundos.
- **Perfil:** cada persona ve sus récords, su mejor racha sin errores y su dominio por área con colores: verde ≥ 80 %, ámbar 60–79 %, rojo < 60 %. El **plan de refuerzo** y el **gráfico de simulacros** son privados: solo los ve cada jugador.
- **Niveles:** del 1 al 30, con títulos del oficio (Aprendiz → Leyenda del SIN). La experiencia sale de aciertos, simulacros aprobados, duelos ganados, metas cumplidas y plenos. Al subir de nivel hay una celebración y se desbloquean avatares, colores y marcos.
- **Insignias:** 26 en total (rachas, plenos, constancia, simulacros, duelos, «Experto en» cada área…), con una vitrina de 3 para mostrar.
- **Personalizar:** nombre, avatar, color, marco, frase, vitrina, puestos a los que se postula, meta diaria y preferencias (aparecer en línea, recibir desafíos, perfil privado, sonido, vibración y letra grande).
- **Compañeros de estudio (★)** y una **tarjeta del perfil** para compartir por WhatsApp.
- **Tops por puesto:** por puntaje y por racha sin errores, actualizados en tiempo real.
- **Memoria:** el progreso se guarda solo después de cada respuesta. Con Firebase, además se guarda una copia en la nube.
- **Pensado para el celular:** se puede instalar como app, funciona sin conexión (salvo el ranking y los duelos), vibra al responder y permite compartir el resultado por WhatsApp.

## Firebase (ranking en vivo, perfiles, duelos y copia del progreso)

Ya está activo, en el proyecto `camino-libertad-d9ae1`, plan gratuito:

- **Firestore:** en São Paulo, con las reglas de `firestore.rules`.
- **Ingreso anónimo:** activado. Los jugadores no tienen que crear ninguna cuenta.
- **Dominio autorizado:** `ormr0919.github.io`.

Consola: <https://console.firebase.google.com/project/camino-libertad-d9ae1>. Si cambiás `firestore.rules`, pegá el archivo nuevo en *Firestore → Reglas* y tocá *Publicar*.

## Publicar una actualización sin perder datos

La base de datos de Firebase es independiente del sitio: publicar una versión nueva en GitHub no borra jugadores, ranking ni progreso. Para que todo siga funcionando:

1. **Probar en local sin tocar la base real:** abrí el juego con `?local=1` al final de la dirección. Con dos pestañas se simulan dos jugadores.
2. **Reglas:** si cambió `firestore.rules`, pegá el archivo completo en *Firestore → Reglas → Publicar*. Hacelo **antes** de subir el código. Las reglas nuevas solo deben **agregar** permisos, nunca quitar los que usan los datos existentes.
3. **Versión de los archivos:** subí el número `?v=` de `index.html`, `js/app.js` y `js/ranking.js`, y el de `VERSION` en `sw.js`. Así ningún celular mezcla archivos viejos con nuevos.
4. Subí los cambios a GitHub y esperá a que GitHub Pages termine de publicar.

## Actualizar el juego

- **Preguntas:** están en `js/preguntas-cpi-1.js`, `js/preguntas-cpi-2.js`, `js/preguntas-ing.js` y `js/preguntas-extra.js`. Formato: `[categoría, dificultad, pregunta, [correcta, incorrecta, incorrecta, incorrecta], explicación, fuente]`.
- Después de cada cambio, subí el número de `VERSION` en `sw.js` (por ejemplo, `camino-v5`) para que los celulares descarguen la versión nueva.

## Fuentes

Las fuentes son las actas de las Comisiones de Selección (ANDE-CPI-05, 06, 07 y 08-2026 y ANDE-CPIEP-74-2026) y la bibliografía que esas actas citan:

- ANDE: Pliego de Tarifas N.º 21 (versión 27-11-2024), Reglamento de Baja Tensión, Reglamento de Media Tensión, y Misión, Visión y Valores.
- OpenStax: *Física universitaria* vol. 2 e *Introducción a la estadística*.
- Microsoft: ayuda de Excel.
- Ley N.º 7445/2025 y Resolución VCHGO N.º 33/2026.
- INSST: guía técnica del riesgo eléctrico.

Ante cualquier diferencia, valen los documentos oficiales.
