/*
 * Personalización y progreso: avatares, colores, marcos, frases, insignias, experiencia y niveles.
 * Todo se calcula a partir del progreso del jugador, así los jugadores existentes conservan lo que ya hicieron.
 */

/* ---------- Experiencia y niveles ---------- */
export const XP = { acierto: 10, aciertoDificil: 15, respuesta: 2, simulacroAprobado: 100, dueloGanado: 50, metaDiaria: 30, pleno: 20 };
export const NIVEL_MAX = 30;

// XP acumulada necesaria para llegar al nivel n (el nivel 1 empieza en 0). Cada nivel cuesta un poco más.
export function xpParaNivel(n) {
  return n <= 1 ? 0 : Math.round(120 * Math.pow(n - 1, 1.6));
}
export function nivelDe(xp) {
  let n = 1;
  while (n < NIVEL_MAX && xp >= xpParaNivel(n + 1)) { n += 1; }
  const base = xpParaNivel(n), sig = n < NIVEL_MAX ? xpParaNivel(n + 1) : base;
  return { nivel: n, xp: xp, desde: base, hasta: sig, avance: sig > base ? (xp - base) / (sig - base) : 1, titulo: tituloDe(n) };
}
const TITULOS = [
  [1, 'Aprendiz'], [3, 'Ayudante'], [5, 'Auxiliar técnico'], [8, 'Técnico'], [11, 'Operador'],
  [14, 'Despachante'], [17, 'Jefe de turno'], [21, 'Ingeniero de red'], [25, 'Maestro de la red'], [30, 'Leyenda del SIN']
];
export function tituloDe(n) {
  let t = TITULOS[0][1];
  TITULOS.forEach(function (x) { if (n >= x[0]) { t = x[1]; } });
  return t;
}

/* ---------- Avatares, colores, marcos y frases ---------- */
// nivel = nivel mínimo para desbloquear
export const AVATARES = [
  ['⚡', 1], ['🔌', 1], ['💡', 1], ['🦺', 1], ['🔧', 1], ['📟', 1], ['🧮', 1], ['📚', 1],
  ['☀️', 1], ['🌻', 1], ['🦉', 1], ['🐝', 1],
  ['🏭', 5], ['📡', 5], ['🔦', 5], ['🛠️', 5], ['🐆', 5], ['🦊', 5],
  ['🗼', 10], ['🧠', 10], ['🎯', 10], ['🐺', 10],
  ['🚀', 15], ['🦅', 15], ['🌩️', 20], ['👑', 25]
];
export const COLORES = [
  ['#6C8CFF', 'Cielo', 1], ['#24B47E', 'Selva', 1], ['#FF9F43', 'Amanecer', 1], ['#EF4D5E', 'Coral', 1],
  ['#8E4EC6', 'Violeta', 1], ['#0FA3B8', 'Turquesa', 1], ['#C98A00', 'Oro viejo', 8], ['#3BE8C4', 'Eléctrico', 12],
  ['#1C1636', 'Noche', 18]
];
export const MARCOS = {
  bronce: { n: 'Bronce', req: 'Nivel 3', ok: function (c) { return c.nivel >= 3; } },
  plata: { n: 'Plata', req: 'Nivel 8', ok: function (c) { return c.nivel >= 8; } },
  oro: { n: 'Oro', req: 'Nivel 15', ok: function (c) { return c.nivel >= 15; } },
  rayo: { n: 'Rayo', req: 'Racha de 10 sin errores', ok: function (c) { return c.ins.indexOf('racha10') !== -1; } },
  sol: { n: 'Sol', req: 'Nivel 25', ok: function (c) { return c.nivel >= 25; } }
};
export const FRASES = [
  'Voy por el 30/30', 'Estudio de noche', 'Acepto duelos', 'Paso a paso', 'Sin errores',
  'La seguridad primero', 'Fan del Pliego de Tarifas', 'Ley de Ohm es vida', 'Rumbo a la libertad',
  'Hoy mejor que ayer', 'Equipo Excel', 'Me falta poco'
];

/* ---------- Insignias ---------- */
// Cada insignia: id, ícono, nombre, cómo se gana y la prueba sobre el «contexto» del jugador.
const AREAS = { fund: 'Fundamentos', leyes: 'Leyes y cálculos', seg: 'Seguridad', med: 'Mediciones', pot: 'Potencia', dist: 'Distribución', com: 'Comercialización', est: 'Estadística', xls: 'Excel', fp: 'Función pública' };
export const INSIGNIAS = [
  { id: 'primera', i: '🎮', n: 'Primera partida', d: 'Jugá tu primera partida con ranking.', ok: function (c) { return c.partidas >= 1; } },
  { id: 'resp100', i: '💯', n: 'Cien respuestas', d: 'Respondé 100 preguntas.', ok: function (c) { return c.respuestas >= 100; } },
  { id: 'resp500', i: '📘', n: 'Quinientas', d: 'Respondé 500 preguntas.', ok: function (c) { return c.respuestas >= 500; } },
  { id: 'resp1000', i: '🏛️', n: 'Mil respuestas', d: 'Respondé 1.000 preguntas.', ok: function (c) { return c.respuestas >= 1000; } },
  { id: 'racha5', i: '🔥', n: 'En llamas', d: 'Racha de 5 aciertos sin errores.', ok: function (c) { return c.mejorRacha >= 5; } },
  { id: 'racha10', i: '⚡', n: 'Imparable', d: 'Racha de 10 aciertos sin errores.', ok: function (c) { return c.mejorRacha >= 10; } },
  { id: 'racha15', i: '🌩️', n: 'Partida perfecta', d: 'Las 15 preguntas sin un error.', ok: function (c) { return c.mejorRacha >= 15; } },
  { id: 'pleno', i: '🏅', n: 'Pleno', d: 'Ganá todas las medallas en una partida.', ok: function (c) { return c.plenos >= 1; } },
  { id: 'dias3', i: '📅', n: 'Constancia', d: 'Estudiá 3 días seguidos.', ok: function (c) { return c.maxDias >= 3; } },
  { id: 'dias7', i: '🗓️', n: 'Una semana', d: 'Estudiá 7 días seguidos.', ok: function (c) { return c.maxDias >= 7; } },
  { id: 'meta', i: '🎯', n: 'Meta cumplida', d: 'Cumplí tu meta diaria.', ok: function (c) { return c.metas >= 1; } },
  { id: 'sim_ok', i: '🎓', n: 'Aprobado', d: 'Aprobá un simulacro de examen (60 %).', ok: function (c) { return c.simAprobados >= 1; } },
  { id: 'sim_90', i: '🏆', n: 'Sobresaliente', d: 'Sacá 90 % o más en un simulacro.', ok: function (c) { return c.simMejorPct >= 0.9; } },
  { id: 'duelo1', i: '⚔️', n: 'Primer duelo', d: 'Ganá un duelo de estudio.', ok: function (c) { return c.duelosGanados >= 1; } },
  { id: 'duelo5', i: '🛡️', n: 'Duelista', d: 'Ganá 5 duelos de estudio.', ok: function (c) { return c.duelosGanados >= 5; } },
  { id: 'grupo', i: '👥', n: 'Estudio en grupo', d: 'Jugá una ronda en un grupo de 3 o más personas.', ok: function (c) { return c.grupos >= 1; } },
  { id: 'explicador', i: '🧑‍🏫', n: 'Profe', d: 'Explicale 10 preguntas a tu grupo (acertaste cuando alguien falló).', ok: function (c) { return c.explicador >= 10; } },
  { id: 'rondas5', i: '👑', n: 'Líder del grupo', d: 'Ganá 5 rondas en duelos o grupos.', ok: function (c) { return c.rondasGanadas >= 5; } },
  { id: 'repaso', i: '🔁', n: 'Sin pendientes', d: 'Dejá en cero tus errores para repasar, después de haber tenido 10 o más.', ok: function (c) { return c.repasoLimpio; } }
].concat(Object.keys(AREAS).map(function (k) {
  return { id: 'dom_' + k, i: '⭐', n: 'Experto en ' + AREAS[k], d: '80 % o más de aciertos en ' + AREAS[k] + ', con al menos 20 respuestas.', area: k,
    ok: function (c) { const s = c.cats[k]; return !!s && s.v >= 20 && s.a / s.v >= 0.8; } };
}));
export function insigniaPorId(id) { return INSIGNIAS.find(function (x) { return x.id === id; }) || null; }

/*
 * Contexto del jugador a partir de su progreso local (prog) y de los bancos de preguntas.
 * difPorId: { idPregunta: dificultad } para sumar XP extra por las preguntas difíciles.
 */
export function contexto(prog, difPorId) {
  const cats = prog.cats || {};
  let respuestas = 0, aciertos = 0;
  Object.keys(cats).forEach(function (k) { respuestas += cats[k].v || 0; aciertos += cats[k].a || 0; });
  let aciertosDificiles = 0;
  Object.keys(prog.preg || {}).forEach(function (id) { if (difPorId[id] === 3) { aciertosDificiles += prog.preg[id].a || 0; } });
  const partidas = Object.keys(prog.puestos || {}).reduce(function (n, k) { return n + (prog.puestos[k].partidas || 0); }, 0);
  let simAprobados = 0, simMejorPct = 0;
  Object.keys(prog.simulacros || {}).forEach(function (pid) {
    const h = prog.simulacros[pid], total = pid === 'ingeniero' ? 25 : 30;
    simAprobados += h.aprobados || (h.mejor >= total * 0.6 ? 1 : 0);
    simMejorPct = Math.max(simMejorPct, (h.mejor || 0) / total);
  });
  const c = {
    cats: cats, respuestas: respuestas, aciertos: aciertos, partidas: partidas,
    mejorRacha: prog.mejorRacha || 0, plenos: prog.plenos || 0,
    maxDias: Math.max((prog.racha && prog.racha.max) || 0, (prog.racha && prog.racha.dias) || 0),
    metas: prog.metas || 0, simAprobados: simAprobados, simMejorPct: simMejorPct,
    duelosGanados: (prog.duelos && prog.duelos.ganados) || 0,
    repasoLimpio: !!prog.repasoLimpio,
    grupos: prog.grupos || 0, explicador: prog.explicador || 0, rondasGanadas: prog.rondasGanadas || 0
  };
  c.xp = (aciertos - aciertosDificiles) * XP.acierto + aciertosDificiles * XP.aciertoDificil + respuestas * XP.respuesta
    + simAprobados * XP.simulacroAprobado + c.duelosGanados * XP.dueloGanado + c.metas * XP.metaDiaria + c.plenos * XP.pleno;
  const nv = nivelDe(c.xp);
  c.nivel = nv.nivel;
  c.nv = nv;
  c.ins = INSIGNIAS.filter(function (x) { return x.ok(c); }).map(function (x) { return x.id; });
  return c;
}
export function avatarDisponible(av, nivel) {
  const a = AVATARES.find(function (x) { return x[0] === av; });
  return !!a && nivel >= a[1];
}
export function colorDisponible(col, nivel) {
  const a = COLORES.find(function (x) { return x[0] === col; });
  return !!a && nivel >= a[2];
}
