/*
 * Camino a la libertad · trivia de estudio.
 * Flujo: registro (una sola vez) → inicio → ruleta → pregunta → … → fin de partida.
 * Modos: clásico (con ranking), práctica por tema y repaso de errores.
 */
import { CATEGORIAS, PUESTOS, puestoPorId } from './puestos.js?v=5';
import { CPI_1 } from './preguntas-cpi-1.js?v=5';
import { CPI_2 } from './preguntas-cpi-2.js?v=5';
import { ING } from './preguntas-ing.js?v=5';
import { EXTRA } from './preguntas-extra.js?v=5';
import { ING2 } from './preguntas-ing2.js?v=5';
import { CPI3 } from './preguntas-cpi3.js?v=5';
import { figuraHtml } from './figuras.js?v=5';
import { FIG_BANCO } from './figuras-banco.js?v=5';
import { citar } from './fuentes.js?v=5';
import { crearRanking, EN_LINEA_SEG, MAX_GRUPO, semanaActual } from './ranking.js?v=5';
import { contexto, nivelDe, xpParaNivel, NIVEL_MAX, AVATARES, COLORES, MARCOS, FRASES, INSIGNIAS, insigniaPorId, avatarDisponible, colorDisponible } from './perfil.js?v=5';

const TIEMPO = 45;        // segundos por pregunta en el modo clásico
const MAX_PREG = 15;      // preguntas por partida
const VIDAS = 3;
const BONO_PLENO = 300;   // por ganar las medallas de todas las categorías
const LETRAS = ['A', 'B', 'C', 'D'];

/* ---------------- Utilidades ---------------- */
const $ = function (id) { return document.getElementById(id); };
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
};
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}
function mezclar(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
  return b;
}
function miles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (txt != null) { e.textContent = txt; } return e; }
function plural(n, uno, varios) { return miles(n) + ' ' + (n === 1 ? uno : varios); }
function vibrar(p) { try { if (navigator.vibrate && LS.get('andeJuego.vibracion', true)) { navigator.vibrate(p); } } catch (e) { /* sin vibración */ } }
function hoy() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* Nivel de dominio de un área. El 60 % es el mínimo para aprobar. */
const MIN_RESP = 5;
function nivel(s, minimo) {
  if (!s || !s.v) { return { k: 'nuevo', n: 'Sin datos', c: 'var(--lv-nuevo)' }; }
  const p = s.a / s.v;
  // Con pocas respuestas se muestra el color tentativo, más claro.
  if (s.v < (minimo == null ? MIN_RESP : minimo)) { return { k: 'nuevo', n: 'Pocas respuestas', c: p >= 0.8 ? 'var(--lv-alto)' : p >= 0.6 ? 'var(--lv-medio)' : 'var(--lv-bajo)', tentativo: true }; }
  if (p >= 0.8) { return { k: 'alto', n: 'Dominado', c: 'var(--lv-alto)' }; }
  if (p >= 0.6) { return { k: 'medio', n: 'En camino', c: 'var(--lv-medio)' }; }
  return { k: 'bajo', n: 'A reforzar', c: 'var(--lv-bajo)' };
}
function iniciales(n) {
  const p = String(n || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function colorAvatar(n) {
  const c = ['#2D7FF9', '#1E9E73', '#8E4EC6', '#EE7A12', '#0FA3B8', '#E5484D', '#C98A00'];
  return c[parseInt(hash(String(n || '')), 36) % c.length];
}
// id (opcional): { avatar, color, marco } elegidos en la personalización.
function pintarAvatar(nodo, nombre, id) {
  id = id || {};
  const emoji = id.avatar || '';
  nodo.textContent = emoji || iniciales(nombre);
  nodo.classList.toggle('emoji', !!emoji);
  nodo.style.setProperty('--av', id.color || colorAvatar(nombre));
  if (id.marco) { nodo.dataset.marco = id.marco; } else { delete nodo.dataset.marco; }
}
function perfilCfg() { return prog.perfil || (prog.perfil = {}); }
function ctxJugador() { return contexto(prog, DIF_POR_ID); }
// Solo lo que el jugador tiene desbloqueado según su nivel e insignias.
function identidadPropia(c) {
  c = c || ctxJugador();
  const pf = perfilCfg();
  return {
    avatar: pf.avatar && avatarDisponible(pf.avatar, c.nivel) ? pf.avatar : null,
    color: pf.color && colorDisponible(pf.color, c.nivel) ? pf.color : null,
    marco: pf.marco && MARCOS[pf.marco] && MARCOS[pf.marco].ok(c) ? pf.marco : null,
    nivel: c.nivel
  };
}

/* Fila de dominio: icono, nombre del área, barra coloreada por nivel y porcentaje. */
function filaDominio(k, s, minimo) {
  const c = CATEGORIAS[k], lv = nivel(s, minimo), pc = s && s.v ? Math.round(s.a / s.v * 100) : null;
  const fila = el('div', 'dom-fila' + (lv.tentativo ? ' tentativo' : ''));
  fila.style.setProperty('--lvc', lv.c);
  const medio = el('div');
  const nm = el('div', 'nm', c.n);
  nm.append(el('small', null, lv.n + (s && s.v ? ' · ' + plural(s.v, 'respuesta', 'respuestas') : '')));
  const barra = el('div', 'dom-barra'), i = el('i');
  i.style.width = (pc || 0) + '%'; i.style.background = lv.c;
  barra.append(i); medio.append(nm, barra);
  fila.append(el('span', 'ic', c.icono), medio, el('span', 'pc', pc == null ? '—' : pc + '%'));
  return fila;
}

/* ---------------- Banco de preguntas ---------------- */
const PREGUNTAS = [].concat(CPI_1, CPI_2, ING, EXTRA, ING2, CPI3).map(function (q) {
  const id = q[0] + '-' + hash(q[2]);
  return { id: id, cat: q[0], dif: q[1], texto: q[2], ops: q[3], exp: q[4], fuente: q[5], fig: q[6] || FIG_BANCO[id] || null };
});
const POR_CAT = {};
const POR_ID = {};
const DIF_POR_ID = {};
PREGUNTAS.forEach(function (q) { (POR_CAT[q.cat] = POR_CAT[q.cat] || []).push(q); POR_ID[q.id] = q; DIF_POR_ID[q.id] = q.dif; });

/* ---------------- Jugador y progreso local ---------------- */
let jugador = LS.get('andeJuego.jugador', null);   // { nombre, puesto, idp }
let prog = null;
function claveProg() { return 'andeJuego.progreso.' + jugador.idp; }
function cargarProg() { prog = LS.get(claveProg(), null) || { preg: {}, cats: {}, puestos: {} }; }
let timerNube = null;
function guardarProg() {
  prog.actualizado = Date.now();
  LS.set(claveProg(), prog);
  // Copia en la nube (solo con Firebase): se agrupan los cambios para no escribir en cada clic.
  clearTimeout(timerNube);
  timerNube = setTimeout(subirProgreso, 2500);
}
function subirProgreso() {
  clearTimeout(timerNube); timerNube = null;
  if (!ranking || ranking.modo !== 'firebase' || !jugador || !prog) { return; }
  ranking.guardarProgreso({ jugador: jugador, prog: prog }).catch(function (e) { console.warn('No se pudo respaldar el progreso:', e); });
}
// Usa el progreso de la nube si es más nuevo que el de este dispositivo (por ejemplo, en un celular nuevo).
async function traerProgresoNube() {
  if (!ranking || ranking.modo !== 'firebase') { return false; }
  let nube = null;
  try { nube = await ranking.cargarProgreso(); } catch (e) { console.warn(e); return false; }
  if (!nube || !nube.jugador || !nube.prog) { return false; }
  const local = jugador ? LS.get('andeJuego.progreso.' + jugador.idp, null) : null;
  if (local && (local.actualizado || 0) >= (nube.prog.actualizado || 0) && jugador.idp === nube.jugador.idp) { return false; }
  jugador = nube.jugador; guardarJugador();
  prog = nube.prog; LS.set(claveProg(), prog);
  return true;
}
function guardarJugador() { LS.set('andeJuego.jugador', jugador); if (prog) { guardarProg(); } }
function puestoActual() { return puestoPorId(jugador.puesto) || PUESTOS[0]; }

function registrarRespuesta(q, ok) {
  const s = prog.preg[q.id] || (prog.preg[q.id] = { v: 0, a: 0, pend: false, rep: 0 });
  s.v += 1;
  s.t = Date.now();
  if (ok) {
    s.a += 1;
    if (s.pend) { s.rep += 1; if (s.rep >= 2) { s.pend = false; s.rep = 0; } }
  } else {
    s.pend = true; s.rep = 0;
  }
  const c = prog.cats[q.cat] || (prog.cats[q.cat] = { v: 0, a: 0 });
  c.v += 1; if (ok) { c.a += 1; }
  // Meta diaria
  const h = hoy();
  if (!prog.hoy || prog.hoy.f !== h) { prog.hoy = { f: h, n: 0, ok: false }; }
  prog.hoy.n += 1;
  const meta = perfilCfg().meta || 20;
  if (!prog.hoy.ok && prog.hoy.n >= meta) {
    prog.hoy.ok = true;
    prog.metas = (prog.metas || 0) + 1;
    setTimeout(function () { aviso('🎯 ¡Cumpliste tu meta de hoy: ' + meta + ' preguntas!'); confeti(80); }, 700);
  }
  // Insignia «Sin pendientes»
  const pendN = Object.keys(prog.preg).filter(function (id) { return prog.preg[id].pend; }).length;
  prog.maxPend = Math.max(prog.maxPend || 0, pendN);
  if (prog.maxPend >= 10 && pendN === 0) { prog.repasoLimpio = true; }
  guardarProg();
}
function pendientes(p) {
  return PREGUNTAS.filter(function (q) { return p.cats.indexOf(q.cat) !== -1 && prog.preg[q.id] && prog.preg[q.id].pend; });
}
/*
 * Plan de refuerzo personal (solo se calcula y se muestra en el dispositivo del jugador).
 * Prioridad = 60 % lo que falla + 30 % lo que no vio + 10 % errores pendientes.
 */
function planRefuerzo(p) {
  return p.cats.map(function (k) {
    const preg = POR_CAT[k] || [];
    const s = prog.cats[k] || { v: 0, a: 0 };
    const vistas = preg.filter(function (q) { return prog.preg[q.id]; }).length;
    const pend = preg.filter(function (q) { return prog.preg[q.id] && prog.preg[q.id].pend; }).length;
    const acc = s.v >= 3 ? s.a / s.v : 0.5;
    const cob = preg.length ? vistas / preg.length : 1;
    const necesidad = (1 - acc) * 0.6 + (1 - cob) * 0.3 + Math.min(pend, 10) / 10 * 0.1;
    const lv = nivel(s);
    let etiqueta, razon;
    if (s.v >= MIN_RESP && acc < 0.6) {
      etiqueta = 'Urgente';
      razon = Math.round(acc * 100) + ' % de aciertos: por debajo del 60 % necesario para aprobar.';
    } else if (s.v >= MIN_RESP && acc < 0.8) {
      etiqueta = 'Repasar';
      razon = Math.round(acc * 100) + ' % de aciertos: cerca, pero todavía no está firme.';
    } else if (cob < 0.5) {
      etiqueta = 'Explorar';
      razon = 'Viste ' + vistas + ' de ' + preg.length + ' preguntas de esta área.';
    } else {
      etiqueta = 'Bien';
      razon = s.v ? Math.round(s.a / s.v * 100) + ' % de aciertos y ' + vistas + ' de ' + preg.length + ' preguntas vistas.' : 'Sin datos todavía.';
    }
    if (pend) { razon += ' ' + plural(pend, 'error pendiente', 'errores pendientes') + '.'; }
    return { k: k, necesidad: necesidad, etiqueta: etiqueta, razon: razon, color: etiqueta === 'Explorar' ? 'var(--blue)' : lv.c, vistas: vistas, total: preg.length, pend: pend };
  }).sort(function (a, b) { return b.necesidad - a.necesidad; });
}
function respondidas(p) { return p.cats.reduce(function (n, k) { return n + ((prog.cats[k] || {}).v || 0); }, 0); }
// Arma una tanda de entrenamiento con más preguntas de las áreas que más necesita.
function colaEntreno(p, n) {
  const plan = planRefuerzo(p), usadas = new Set(), cola = [];
  for (let i = 0; i < n; i++) {
    const pesos = plan.map(function (x) { return x.necesidad * x.necesidad + 0.03; });
    let r = Math.random() * pesos.reduce(function (a, b) { return a + b; }, 0), k = plan[0].k;
    for (let j = 0; j < plan.length; j++) { r -= pesos[j]; if (r <= 0) { k = plan[j].k; break; } }
    const q = elegir(k, usadas);
    if (q) { usadas.add(q.id); cola.push(q); }
  }
  return cola;
}
// Elige una pregunta de la categoría, priorizando las falladas y las no vistas.
function elegir(cat, usadas, dificil) {
  let pool = (POR_CAT[cat] || []).filter(function (q) { return !usadas.has(q.id); });
  // La partida se pone más difícil: desde la 6.ª pregunta, 7 de cada 10 son de dificultad media-alta.
  if (dificil && Math.random() < 0.7) {
    const d = pool.filter(function (q) { return q.dif === 3; });
    if (d.length) { pool = d; }
  }
  if (!pool.length) { return null; }
  // Las que viste hace poco casi no salen; las nuevas y las falladas tienen prioridad.
  const ahora = Date.now();
  const pesos = pool.map(function (q) {
    const s = prog.preg[q.id];
    if (!s) { return 4; }
    const base = s.pend ? 5 : (s.a < s.v ? 1.5 : 0.8);
    const edad = s.t ? ahora - s.t : Infinity;
    const f = edad < 3600000 ? 0.03 : edad < 86400000 ? 0.15 : edad < 3 * 86400000 ? 0.45 : 1;
    return base * (s.pend ? Math.max(f, 0.3) : f);
  });
  let r = Math.random() * pesos.reduce(function (a, b) { return a + b; }, 0);
  for (let i = 0; i < pool.length; i++) { r -= pesos[i]; if (r <= 0) { return pool[i]; } }
  return pool[pool.length - 1];
}

/* ---------------- Sonido y confeti ---------------- */
const Sonido = {
  on: LS.get('andeJuego.sonido', true),
  ctx: null,
  tono(f, dur, tipo, t0, vol) {
    if (!this.on) { return; }
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (t0 || 0);
      o.type = tipo || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* sin audio */ }
  },
  ok() { this.tono(660, 0.12, 'sine'); this.tono(990, 0.22, 'sine', 0.1); },
  mal() { this.tono(180, 0.35, 'square', 0, 0.06); },
  tick() { this.tono(1200, 0.04, 'square', 0, 0.03); },
  medalla() { [523, 659, 784, 1047].forEach(function (f, i) { Sonido.tono(f, 0.16, 'triangle', i * 0.09); }); },
  fin() { [392, 523, 659, 784, 1047].forEach(function (f, i) { Sonido.tono(f, 0.2, 'triangle', i * 0.12); }); }
};
function confeti(n) {
  const cv = $('confeti'), cx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const colores = ['#F2A24E', '#2D7FF9', '#1E9E73', '#E5484D', '#8E4EC6', '#0FA3B8', '#E9A800'];
  const ps = Array.from({ length: n || 120 }, function () {
    return { x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight / 3, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, c: colores[Math.floor(Math.random() * colores.length)], a: Math.random() * 6 };
  });
  const t0 = performance.now();
  (function cuadro(t) {
    cx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(function (p) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; cx.fillStyle = p.c; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); cx.restore(); });
    if (t - t0 < 2600) { requestAnimationFrame(cuadro); } else { cx.clearRect(0, 0, cv.width, cv.height); }
  })(t0);
}

/* ---------------- Pantallas ---------------- */
function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach(function (s) { s.hidden = s.id !== id; });
  window.scrollTo(0, 0);
  presenciaPorPantalla();
}

let ranking = null;
let quitarTop = null, quitarTotales = null;
let totales = {};

/* ---------------- Selector de puestos ---------------- */
function botonesPuesto(caja, elegido, alElegir) {
  caja.innerHTML = '';
  PUESTOS.forEach(function (p) {
    const b = el('button', 'puesto-op');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(p.id === elegido));
    b.append(el('span', 'pi', p.icono), document.createTextNode(p.corto), el('small', null, p.tipo));
    b.addEventListener('click', function () {
      caja.querySelectorAll('.puesto-op').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      alElegir(p.id);
    });
    caja.append(b);
  });
}

/* ---------------- Registro ---------------- */
function iniciarRegistro() {
  let elegido = null;
  const nombre = $('r-nombre'), enviar = $('r-enviar');
  function validar() { enviar.disabled = !(nombre.value.trim().length >= 2 && elegido); }
  botonesPuesto($('r-puestos'), null, function (id) { elegido = id; validar(); });
  nombre.value = '';
  nombre.oninput = validar;
  validar();
  $('f-registro').onsubmit = async function (e) {
    e.preventDefault();
    const n = nombre.value.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (n.length < 2 || !elegido) { return; }
    enviar.disabled = true;
    prog = null;
    jugador = { nombre: n, puesto: elegido, idp: 'P' + Math.random().toString(36).slice(2, 10) };
    guardarJugador();
    cargarProg();
    try { await ranking.registrar(n); } catch (err) { console.error(err); }
    irInicio();
    iniciarPresencia();
    publicarPerfil();
    LS.set('andeJuego.novedades', NOVEDADES);
    entrarPorLink();
  };
  mostrar('p-registro');
  setTimeout(function () { nombre.focus(); }, 100);
}

/* ---------------- Inicio ---------------- */
function irInicio() {
  const p = puestoActual();
  $('i-nombre').textContent = jugador.nombre;
  pintarAvatar($('i-avatar'), jugador.nombre, identidadPropia());
  renderCabecera();
  const dias = rachaVigente();
  $('i-racha').textContent = dias ? '🔥 ' + dias : '';
  $('i-racha').title = dias ? plural(dias, 'día seguido', 'días seguidos') + ' estudiando' : '';
  const top1 = planRefuerzo(p)[0];
  const cfgSim = configSimulacro(p), simP = (prog.simulacros || {})[p.id];
  $('i-sim').textContent = Object.keys(cfgSim.n).reduce(function (a, k) { return a + cfgSim.n[k]; }, 0) + ' preguntas · ' + cfgSim.minutos + ' min · nota sobre ' + cfgSim.total
    + (simP ? ' · tu mejor: ' + String(simP.mejor).replace('.', ',') : '');
  $('i-entreno').textContent = top1 && top1.etiqueta !== 'Bien' && respondidas(p) >= MIN_RESP
    ? '10 preguntas · prioriza ' + CATEGORIAS[top1.k].n
    : '10 preguntas de lo que más te falta';
  $('pie-nombre').textContent = jugador.nombre;
  $('i-puesto').textContent = p.icono + ' ' + p.corto;
  const pp = prog.puestos[p.id] || { partidas: 0, mejor: 0 };
  $('i-partidas').textContent = miles(pp.partidas);
  $('i-mejor').textContent = miles(pp.mejor);

  const aviso = $('i-examen');
  aviso.textContent = '';
  aviso.append(el('b', null, p.n + ': '), document.createTextNode(p.examen));
  if (p.fechaExamen) {
    const dias = Math.ceil((new Date(p.fechaExamen) - new Date()) / 86400000);
    if (dias > 0) { aviso.append(document.createTextNode(' '), el('b', null, '¡Faltan ' + plural(dias, 'día', 'días') + '!')); }
  }
  aviso.append(document.createTextNode(' ' + p.nota));

  const pend = pendientes(p).length;
  $('i-pendientes').textContent = pend ? plural(pend, 'pregunta pendiente', 'preguntas pendientes') : 'Sin pendientes';
  $('btn-repaso').disabled = pend === 0;

  const nSin = sinVer(p).length;
  $('i-jugar-sub').textContent = 'Partida con ranking · ' + (nSin ? plural(nSin, 'pregunta sin ver', 'preguntas sin ver') : '¡viste todo el temario!');
  dejarTopVivo();
  renderDominio(p);
  suscribirTop(p);
  pintarBotonJugadores();
  $('pie-modo').textContent = ranking.modo === 'firebase'
    ? 'Ranking en línea: se actualiza en tiempo real.'
    : (ranking.prueba ? '🧪 Modo de prueba: no se usa la base de datos real.' : 'Ranking local de este dispositivo (sin conexión con el ranking en línea).');
  mostrar('p-inicio');
}

function renderCabecera() {
  const c = ctxJugador(), nv = c.nv;
  $('i-nivel-n').textContent = nv.nivel;
  $('i-nivel-t').textContent = nv.titulo;
  $('i-xp-barra').style.width = Math.round(nv.avance * 100) + '%';
  $('i-xp-txt').textContent = nv.nivel >= NIVEL_MAX ? 'Nivel máximo' : miles(nv.xp - nv.desde) + ' / ' + miles(nv.hasta - nv.desde) + ' XP';
  const meta = perfilCfg().meta || 20, n = prog.hoy && prog.hoy.f === hoy() ? prog.hoy.n : 0;
  const an = $('i-meta-anillo');
  an.style.setProperty('--p', Math.min(100, Math.round(n / meta * 100)));
  an.classList.toggle('lista', n >= meta);
  $('i-meta-n').textContent = n >= meta ? '✓' : n + '/' + meta;
  $('i-meta-txt').textContent = n >= meta ? '¡meta cumplida!' : 'meta de hoy';
}
function renderDominio(p) {
  const caja = $('d-lista');
  caja.innerHTML = '';
  p.cats.forEach(function (k) { caja.append(filaDominio(k, prog.cats[k])); });
  // Consejo personal: solo aparece en la pantalla de quien juega.
  const consejo = $('d-consejo'), top1 = planRefuerzo(p)[0];
  consejo.innerHTML = '';
  if (top1 && top1.etiqueta !== 'Bien' && respondidas(p) >= MIN_RESP) {
    consejo.append(el('b', null, '🎯 Te conviene reforzar ' + CATEGORIAS[top1.k].n + '. '), document.createTextNode(top1.razon));
    const b = el('button', 'link', 'Entrenar ahora');
    b.type = 'button';
    b.addEventListener('click', function () { iniciarPartida('practica', top1.k); });
    consejo.append(b);
    consejo.hidden = false;
  } else {
    consejo.hidden = true;
  }
}

let ordenTop = 'mejor';
function filaTop(f, i, miId, orden) {
  const li = el('li', f.id === miId ? 'yo' : null);
  li.dataset.id = f.id;
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.title = 'Ver el perfil de ' + f.nombre;
  li.addEventListener('click', function () { const d = li.closest('dialog'); if (d) { d.close(); } abrirPerfil(f.id, f.nombre); });
  li.addEventListener('keydown', function (e) { if (e.key === 'Enter') { li.click(); } });
  const nom = el('span', 'nom'), av = el('span', 'avatar mini'), txt = el('span', 'txt');
  pintarAvatar(av, f.nombre, f);
  const pct = f.preguntas ? Math.round(f.aciertos / f.preguntas * 100) : 0;
  if (esFavorito(f.id)) { txt.append(el('span', 'fav', '★')); }
  txt.append(document.createTextNode(f.nombre), el('small', null, (f.nivel ? 'Nv ' + f.nivel + ' · ' : '') + plural(f.partidas, 'partida', 'partidas') + ' · ' + pct + ' % de aciertos'));
  nom.append(av, txt);
  const valor = orden === 'racha' ? '🔥 ' + (f.racha || 0) : miles(f.mejor);
  li.append(el('span', 'pos', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)), nom, el('span', 'pts', valor));
  return li;
}
function renderTop(lista, filas, miId, orden) {
  lista.innerHTML = '';
  if (filas === null) { lista.append(el('li', 'vacio', 'No se pudo cargar el ranking. Revisá tu conexión.')); return; }
  if (!filas.length) { lista.append(el('li', 'vacio', orden === 'semana' ? 'Nadie jugó todavía esta semana (el top se reinicia cada lunes). ¡Arrancalo vos!' : 'Todavía nadie jugó en este puesto. ¡Sé la primera persona del top!')); return; }
  filas.forEach(function (f, i) { lista.append(filaTop(f, i, miId, orden)); });
}
function textoTotales(pid) {
  const t = totales[pid] || { partidas: 0, jugadores: 0 };
  const todas = Object.keys(totales).reduce(function (n, k) { return n + (totales[k].partidas || 0); }, 0);
  return plural(t.jugadores || 0, 'jugador', 'jugadores') + ' y ' + plural(t.partidas || 0, 'partida', 'partidas') + ' en este puesto · ' + plural(todas, 'partida jugada', 'partidas jugadas') + ' en total.';
}
function suscribirTop(p) {
  if (quitarTop) { quitarTop(); }
  $('t-puesto').textContent = p.corto;
  const vivo = $('t-vivo');
  vivo.textContent = ranking.modo === 'firebase' ? 'en vivo' : 'local';
  vivo.classList.toggle('local', ranking.modo !== 'firebase');
  document.querySelectorAll('#t-orden .tab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.o === ordenTop)); });
  const orden = ordenTop;
  quitarTop = ranking.escucharTop(p.id, function (filas, miId) { renderTop($('t-lista'), filas, miId, orden); }, orden);
  $('t-totales').textContent = textoTotales(p.id);
}

/* ---------------- Perfil ---------------- */
let quitarPerfil = null;
function cerrarPerfil() { if (quitarPerfil) { quitarPerfil(); quitarPerfil = null; } }

function abrirPerfil(id, nombreAux) {
  cerrarPerfil();
  const propio = id === ranking.miId();
  if (quitarTop) { quitarTop(); quitarTop = null; }
  pintarPerfilBase(nombreAux || '', propio);
  if (propio) {
    // El perfil propio usa los datos locales (incluye todo lo practicado) y agrega lo privado.
    renderPerfil({
      nombre: jugador.nombre,
      partidas: Object.keys(prog.puestos).reduce(function (n, k) { return n + prog.puestos[k].partidas; }, 0),
      cats: prog.cats, puestos: prog.puestos, creado: prog.creado || null
    }, true, id);
  } else {
    $('pf-sub').textContent = 'Cargando…';
    quitarPerfil = ranking.escucharPerfil(id, function (d) {
      if (!d) { $('pf-sub').textContent = 'No se encontró el perfil.'; return; }
      renderPerfil(d, false, id);
    });
  }
  mostrar('p-perfil');
}
function pintarPerfilBase(nombre, propio) {
  $('pf-nombre').textContent = nombre;
  pintarAvatar($('pf-avatar'), nombre);
  ['pf-stats', 'pf-puestos', 'pf-areas', 'pf-nivel', 'pf-postula', 'pf-acciones', 'pf-vitrina', 'pf-insignias'].forEach(function (x) { $(x).innerHTML = ''; });
  $('pf-frase').hidden = true;
  $('pf-privado').hidden = !propio;
  $('pf-sim-caja').hidden = true;
}
function barraNivel(nv) {
  const caja = el('div', 'pf-nivel-in');
  const txt = el('span', 'nv-txt');
  const xp = el('span', 'xp'), barra = el('i');
  barra.style.width = Math.round(nv.avance * 100) + '%';
  xp.append(barra);
  txt.append(el('b', null, nv.titulo), xp, el('small', null, nv.nivel >= NIVEL_MAX ? miles(nv.xp) + ' XP · nivel máximo' : miles(nv.xp) + ' / ' + miles(nv.hasta) + ' XP para el nivel ' + (nv.nivel + 1)));
  return [el('span', 'nv', String(nv.nivel)), txt];
}
function tarjetaInsignia(x, ganada) {
  const b = el('div', 'ins' + (ganada ? '' : ' bloq'));
  b.title = x.d;
  b.append(el('span', 'ii', ganada ? x.i : '🔒'), document.createTextNode(x.n), el('small', null, ganada ? '' : x.d));
  return b;
}
function esFavorito(id) { return (perfilCfg().favoritos || []).indexOf(id) !== -1; }
function alternarFavorito(id) {
  const pf = perfilCfg();
  pf.favoritos = pf.favoritos || [];
  const i = pf.favoritos.indexOf(id);
  if (i === -1) { pf.favoritos.unshift(id); pf.favoritos = pf.favoritos.slice(0, 50); aviso('★ Agregado a tus compañeros de estudio'); }
  else { pf.favoritos.splice(i, 1); aviso('Quitado de tus compañeros de estudio'); }
  guardarProg();
  renderEnLinea();
}
function renderPerfil(d, propio, idJug) {
  const c = propio ? ctxJugador() : null, pf = propio ? perfilCfg() : null;
  const ident = propio ? identidadPropia(c) : { avatar: d.avatar, color: d.color, marco: d.marco };
  $('pf-nombre').textContent = d.nombre;
  pintarAvatar($('pf-avatar'), d.nombre, ident);
  const fraseIdx = propio ? pf.frase : d.frase;
  const fr = $('pf-frase');
  fr.hidden = !(fraseIdx != null && fraseIdx >= 0 && FRASES[fraseIdx]);
  fr.textContent = fr.hidden ? '' : '«' + FRASES[fraseIdx] + '»';

  const cats = d.cats || {};
  const resp = Object.keys(cats).reduce(function (n, k) { return n + (cats[k].v || 0); }, 0);
  const ac = Object.keys(cats).reduce(function (n, k) { return n + (cats[k].a || 0); }, 0);
  const pct = resp ? Math.round(ac / resp * 100) : 0;
  const lvGlobal = nivel({ v: resp, a: ac });
  $('pf-sub').textContent = (propio ? 'Tu perfil · ' : '') + (d.privado && !propio ? 'Perfil privado' : (resp ? lvGlobal.n + ' en general' : 'Todavía sin respuestas'));

  // Nivel y experiencia
  const nv = propio ? c.nv : nivelDe(d.xp || 0);
  const pn = $('pf-nivel');
  pn.innerHTML = '';
  barraNivel(nv).forEach(function (x) { pn.append(x); });

  // Puestos a los que postula
  const post = $('pf-postula');
  post.innerHTML = '';
  ((propio ? pf.postula : d.postula) || []).forEach(function (pid) {
    const p = puestoPorId(pid);
    if (p) { post.append(el('span', null, p.icono + ' ' + p.corto)); }
  });

  // Acciones
  const acc = $('pf-acciones');
  acc.innerHTML = '';
  if (propio) {
    const b1 = el('button', 'btn primario', '✏️ Personalizar'); b1.type = 'button'; b1.addEventListener('click', abrirEditor);
    const b2 = el('button', 'btn secundario', '📲 Compartir mi tarjeta'); b2.type = 'button'; b2.addEventListener('click', compartirTarjeta);
    acc.append(b1, b2);
  } else if (idJug) {
    const fav = el('button', 'btn secundario', esFavorito(idJug) ? '★ Compañero de estudio' : '☆ Agregar a compañeros'); fav.type = 'button';
    fav.addEventListener('click', function () { alternarFavorito(idJug); fav.textContent = esFavorito(idJug) ? '★ Compañero de estudio' : '☆ Agregar a compañeros'; });
    acc.append(fav);
    const enl = enLinea.find(function (j) { return j.id === idJug && Date.now() - j.ultimo < EN_LINEA_SEG * 1000; });
    if (enl && !enl.ocupado && enl.desafios !== false && idJug !== ranking.miIdSala()) {
      const bd = el('button', 'btn primario', '⚔️ Desafiar'); bd.type = 'button';
      bd.addEventListener('click', function () { desafiar(enl, bd); });
      acc.append(bd);
    }
  }

  // Estadísticas
  const st = $('pf-stats');
  st.innerHTML = '';
  const mr = propio ? Math.max(prog.mejorRacha || 0, d.mejorRacha || 0) : (d.mejorRacha || 0);
  const du = propio ? (prog.duelos || d.duelos) : d.duelos;
  const datos = [[miles(d.partidas || 0), 'partidas con ranking']];
  if (!d.privado || propio) { datos.push([miles(resp), 'respuestas'], [resp ? pct + '%' : '—', 'de aciertos']); }
  datos.push(['🔥 ' + mr, 'mejor racha sin errores']);
  if (du && du.jugados) { datos.push(['⚔️ ' + du.ganados + '/' + du.jugados, 'duelos ganados']); }
  if (propio) {
    const sp = (prog.simulacros || {})[puestoActual().id];
    if (sp) { datos.push(['📝 ' + String(sp.mejor).replace('.', ','), 'mejor simulacro (' + puestoActual().corto + ')']); }
    datos.push(['📅 ' + rachaVigente(), 'días seguidos estudiando']);
  }
  datos.forEach(function (x) { const b = el('div'); b.append(el('b', null, x[0]), el('span', null, x[1])); st.append(b); });

  // Insignias y vitrina
  const ganadas = propio ? c.ins : (d.insignias || []);
  const vit = $('pf-vitrina'), grid = $('pf-insignias');
  vit.innerHTML = ''; grid.innerHTML = '';
  ((propio ? pf.vitrina : d.vitrina) || []).filter(function (id) { return ganadas.indexOf(id) !== -1; }).slice(0, 3).forEach(function (id) {
    const x = insigniaPorId(id); if (x) { vit.append(tarjetaInsignia(x, true)); }
  });
  $('pf-ins-cuenta').textContent = '(' + ganadas.length + ' de ' + INSIGNIAS.length + ')';
  INSIGNIAS.forEach(function (x) {
    const g = ganadas.indexOf(x.id) !== -1;
    if (g || propio) { grid.append(tarjetaInsignia(x, g)); }
  });
  if (!ganadas.length && !propio) { grid.append(el('p', 'ayuda', 'Todavía no ganó insignias.')); }

  // Récords por puesto
  const ps = $('pf-puestos');
  ps.innerHTML = '';
  const jugados = PUESTOS.filter(function (p) { return d.puestos && d.puestos[p.id]; });
  if (!jugados.length) { ps.append(el('p', 'ayuda', 'Todavía no jugó partidas con ranking.')); }
  jugados.forEach(function (p) {
    const x = d.puestos[p.id], f = el('div', 'pf-puesto'), t = el('div', null, p.corto);
    t.append(el('small', null, plural(x.partidas, 'partida', 'partidas')));
    f.append(el('span', 'pi', p.icono), t, el('b', 'pts', miles(x.mejor) + ' pts'));
    ps.append(f);
  });

  // Áreas: en el perfil propio, las del puesto actual; en el ajeno, todas las que respondió (si no es privado).
  const areas = $('pf-areas');
  areas.innerHTML = '';
  if (!propio && d.privado) {
    areas.append(el('p', 'ayuda', '🔒 Perfil privado: sus estadísticas por área no se muestran.'));
  } else {
    const lista = propio
      ? puestoActual().cats.concat(Object.keys(cats).filter(function (k) { return puestoActual().cats.indexOf(k) === -1; }))
      : Object.keys(CATEGORIAS).filter(function (k) { return cats[k] && cats[k].v; });
    if (!lista.length) { areas.append(el('p', 'ayuda', 'Todavía no respondió preguntas.')); }
    lista.forEach(function (k) { areas.append(filaDominio(k, cats[k])); });
  }

  if (propio) { renderPlan(); renderMemoria(); renderSimGraf(); }
  $('pf-memoria').hidden = !propio;
}

/* ----- Gráfico de los últimos simulacros (privado) ----- */
function renderSimGraf() {
  const p = puestoActual(), h = (prog.simulacros || {})[p.id], caja = $('pf-sim-caja');
  if (!h || !h.ultimos || !h.ultimos.length) { caja.hidden = true; return; }
  caja.hidden = false;
  const total = p.id === 'ingeniero' ? 25 : 30, pts = h.ultimos.slice(-10);
  const W = 320, H = 150, ml = 26, mr = 10, mt = 12, mb = 22;
  const x = function (i) { return ml + (pts.length === 1 ? (W - ml - mr) / 2 : i * (W - ml - mr) / (pts.length - 1)); };
  const y = function (v) { return mt + (1 - v / total) * (H - mt - mb); };
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Notas de los últimos simulacros de ' + p.corto);
  function nodo(tag, at, txt) { const e = document.createElementNS(ns, tag); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); if (txt != null) { e.textContent = txt; } svg.append(e); return e; }
  [0, total * 0.6, total].forEach(function (v) {
    nodo('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: v === total * 0.6 ? '#24B47E' : '#E9DCCB', 'stroke-dasharray': v === total * 0.6 ? '5 4' : '0', 'stroke-width': v === total * 0.6 ? 2 : 1 });
    nodo('text', { x: ml - 5, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#776E92' }, String(Math.round(v)));
  });
  nodo('polyline', { points: pts.map(function (q, i) { return x(i) + ',' + y(q.nota); }).join(' '), fill: 'none', stroke: '#FF9F43', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  pts.forEach(function (q, i) {
    nodo('circle', { cx: x(i), cy: y(q.nota), r: 5, fill: q.nota >= total * 0.6 ? '#24B47E' : '#EF4D5E', stroke: '#fff', 'stroke-width': 2 });
  });
  nodo('text', { x: W - mr, y: y(total * 0.6) - 5, 'text-anchor': 'end', 'font-size': 10, fill: '#24B47E', 'font-weight': 700 }, 'aprobado (60 %)');
  const g = $('pf-sim-graf'); g.innerHTML = ''; g.append(svg);
  const ult = pts[pts.length - 1].nota, prim = pts[0].nota;
  $('pf-sim-pie').textContent = 'Últimos ' + plural(pts.length, 'simulacro', 'simulacros') + ' de ' + p.corto + '. Último: ' + String(ult).replace('.', ',') + ' de ' + total
    + (pts.length > 1 ? (ult > prim ? ' · 📈 vas mejorando' : (ult < prim ? ' · repasá tus áreas en rojo' : '')) : '') + '.';
}

/* ----- Editor «Personalizar» ----- */
let ed = null;
const PREFS = [
  ['enLinea', '🟢 Aparecer en línea', 'Los demás te ven en «En línea ahora».'],
  ['desafios', '⚔️ Recibir desafíos', 'Si lo apagás, nadie puede invitarte a un duelo.'],
  ['publico', '👁️ Mostrar mis estadísticas por área', 'Si lo apagás, tu perfil queda privado: solo se ve tu nivel, récords e insignias.'],
  ['sonido', '🔊 Sonidos', ''],
  ['vibracion', '📳 Vibración', ''],
  ['letra', '🔠 Letra grande', 'Más cómodo para leer en el celular.']
];
function abrirEditor() {
  const pf = perfilCfg(), c = ctxJugador();
  ed = {
    c: c, nombre: jugador.nombre, avatar: pf.avatar || null, color: pf.color || null, marco: pf.marco || null,
    frase: pf.frase == null ? -1 : pf.frase, vitrina: (pf.vitrina || []).slice(), postula: (pf.postula || [jugador.puesto]).slice(),
    prefs: { enLinea: !pf.ocultarEnLinea, desafios: !pf.noDesafios, publico: !pf.privado, sonido: Sonido.on, vibracion: LS.get('andeJuego.vibracion', true), letra: LS.get('andeJuego.letraGrande', false) },
    meta: pf.meta || 20
  };
  $('ed-nombre').value = ed.nombre;
  $('ed-meta').value = String(ed.meta);
  $('ed-error').hidden = true;
  renderEditor();
  mostrar('p-editar');
}
function opcion(cls, presionado, alElegir) {
  const b = el('button', cls); b.type = 'button';
  b.setAttribute('aria-pressed', String(!!presionado));
  b.addEventListener('click', alElegir);
  return b;
}
function renderEditor() {
  const c = ed.c;
  // Vista previa
  pintarAvatar($('ed-avatar'), ed.nombre, { avatar: ed.avatar, color: ed.color, marco: ed.marco });
  $('ed-nombre-vista').textContent = ed.nombre || '—';
  $('ed-nivel-vista').textContent = 'Nivel ' + c.nivel + ' · ' + c.nv.titulo;
  $('ed-frase-vista').textContent = ed.frase >= 0 ? '«' + FRASES[ed.frase] + '»' : '';
  // Avatares
  const av = $('ed-avatares'); av.innerHTML = '';
  const ini = opcion('ed-op', !ed.avatar, function () { ed.avatar = null; renderEditor(); });
  ini.textContent = iniciales(ed.nombre); ini.style.fontFamily = 'var(--f-titulo)'; ini.style.fontSize = '17px'; ini.title = 'Iniciales';
  av.append(ini);
  AVATARES.forEach(function (a) {
    const ok = c.nivel >= a[1];
    const b = opcion('ed-op', ed.avatar === a[0], function () { ed.avatar = a[0]; renderEditor(); });
    b.textContent = a[0]; b.disabled = !ok;
    if (!ok) { b.append(el('span', 'req', 'Nv ' + a[1])); b.title = 'Se desbloquea en el nivel ' + a[1]; }
    av.append(b);
  });
  // Colores
  const co = $('ed-colores'); co.innerHTML = '';
  const auto = opcion('ed-chip', !ed.color, function () { ed.color = null; renderEditor(); });
  auto.textContent = 'Automático'; co.append(auto);
  COLORES.forEach(function (x) {
    const b = opcion('ed-color', ed.color === x[0], function () { ed.color = x[0]; renderEditor(); });
    b.style.setProperty('--c', x[0]); b.title = x[1] + (c.nivel >= x[2] ? '' : ' · se desbloquea en el nivel ' + x[2]);
    b.setAttribute('aria-label', b.title); b.disabled = c.nivel < x[2];
    co.append(b);
  });
  // Marcos
  const ma = $('ed-marcos'); ma.innerHTML = '';
  const sin = opcion('ed-chip', !ed.marco, function () { ed.marco = null; renderEditor(); });
  sin.textContent = 'Sin marco'; ma.append(sin);
  Object.keys(MARCOS).forEach(function (k) {
    const m = MARCOS[k], ok = m.ok(c);
    const b = opcion('ed-chip', ed.marco === k, function () { ed.marco = k; renderEditor(); });
    b.append(document.createTextNode((ok ? '' : '🔒 ') + m.n), el('small', null, ok ? 'Desbloqueado' : m.req));
    b.disabled = !ok; ma.append(b);
  });
  // Frases
  const fr = $('ed-frases'); fr.innerHTML = '';
  const nf = opcion('ed-chip', ed.frase < 0, function () { ed.frase = -1; renderEditor(); });
  nf.textContent = 'Sin frase'; fr.append(nf);
  FRASES.forEach(function (t, i) {
    const b = opcion('ed-chip', ed.frase === i, function () { ed.frase = i; renderEditor(); });
    b.textContent = t; fr.append(b);
  });
  // Vitrina
  const vi = $('ed-vitrina'); vi.innerHTML = '';
  if (!c.ins.length) { vi.append(el('p', 'ayuda', 'Todavía no ganaste insignias. ¡Jugá una partida para ganar la primera!')); }
  c.ins.forEach(function (id) {
    const x = insigniaPorId(id), sel = ed.vitrina.indexOf(id) !== -1;
    const b = tarjetaInsignia(x, true);
    b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.setAttribute('aria-pressed', String(sel));
    b.addEventListener('click', function () {
      const k = ed.vitrina.indexOf(id);
      if (k !== -1) { ed.vitrina.splice(k, 1); } else if (ed.vitrina.length < 3) { ed.vitrina.push(id); } else { aviso('Máximo 3 insignias en la vitrina'); }
      renderEditor();
    });
    vi.append(b);
  });
  // Puestos a los que postula
  const po = $('ed-postula'); po.innerHTML = '';
  PUESTOS.forEach(function (p) {
    const sel = ed.postula.indexOf(p.id) !== -1;
    const b = opcion('puesto-op', sel, function () {
      const k = ed.postula.indexOf(p.id);
      if (k !== -1) { ed.postula.splice(k, 1); } else { ed.postula.push(p.id); }
      renderEditor();
    });
    b.append(el('span', 'pi', p.icono), document.createTextNode(p.corto), el('small', null, p.tipo));
    po.append(b);
  });
  // Preferencias
  const pr = $('ed-prefs'); pr.innerHTML = '';
  PREFS.forEach(function (x) {
    const b = el('button', 'toggle'); b.type = 'button';
    b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(!!ed.prefs[x[0]]));
    const t = el('span', null, x[1]); if (x[2]) { t.append(el('small', null, x[2])); }
    b.append(t, el('span', 'sw'));
    b.addEventListener('click', function () { ed.prefs[x[0]] = !ed.prefs[x[0]]; renderEditor(); });
    pr.append(b);
  });
}
async function guardarEditor() {
  const n = $('ed-nombre').value.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (n.length < 2) { $('ed-error').textContent = 'El nombre tiene que tener al menos 2 letras.'; $('ed-error').hidden = false; return; }
  const pf = perfilCfg();
  const antes = JSON.stringify([jugador.nombre, identidadPropia()]);
  pf.avatar = ed.avatar; pf.color = ed.color; pf.marco = ed.marco; pf.frase = ed.frase;
  pf.vitrina = ed.vitrina.slice(0, 3); pf.postula = ed.postula.slice(0, 4);
  pf.ocultarEnLinea = !ed.prefs.enLinea; pf.noDesafios = !ed.prefs.desafios; pf.privado = !ed.prefs.publico;
  pf.meta = parseInt($('ed-meta').value, 10) || 20;
  Sonido.on = !!ed.prefs.sonido; LS.set('andeJuego.sonido', Sonido.on);
  LS.set('andeJuego.vibracion', !!ed.prefs.vibracion);
  LS.set('andeJuego.letraGrande', !!ed.prefs.letra);
  aplicarPreferencias();
  jugador.nombre = n;
  guardarJugador();
  guardarProg();
  const despues = JSON.stringify([jugador.nombre, identidadPropia()]);
  if (antes !== despues) {
    ranking.actualizarIdentidad(n, identidadPropia(), Object.keys(prog.puestos || {})).catch(function (e) { console.warn(e); });
  }
  publicarPerfil();
  latido();
  aviso('✅ Perfil guardado');
  abrirPerfil(ranking.miId(), jugador.nombre);
}
function aplicarPreferencias() {
  document.documentElement.classList.toggle('letra-grande', !!LS.get('andeJuego.letraGrande', false));
  const bs = $('btn-sonido');
  if (bs) { bs.textContent = Sonido.on ? '🔊' : '🔇'; }
}

/* ----- Tarjeta para compartir (imagen) ----- */
async function compartirTarjeta() {
  try { await document.fonts.ready; } catch (e) { /* sin fuentes */ }
  const c = ctxJugador(), id = identidadPropia(c), pf = perfilCfg();
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B0E2A'); g.addColorStop(0.6, '#17123F'); g.addColorStop(1, '#2C1A4F');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const sol = x.createRadialGradient(W / 2, H + 120, 50, W / 2, H + 120, 760);
  sol.addColorStop(0, 'rgba(255,159,67,.75)'); sol.addColorStop(1, 'rgba(255,159,67,0)');
  x.fillStyle = sol; x.fillRect(0, 0, W, H);
  x.textAlign = 'center';
  x.fillStyle = '#FFD166'; x.font = '800 44px Unbounded, sans-serif';
  x.fillText('Camino a la libertad', W / 2, 110);
  // Avatar
  x.beginPath(); x.arc(W / 2, 330, 150, 0, Math.PI * 2);
  x.fillStyle = id.color || colorAvatar(jugador.nombre); x.fill();
  x.lineWidth = 14; x.strokeStyle = id.marco ? ({ bronce: '#CD7F32', plata: '#C9D3DD', oro: '#FFD166', rayo: '#3BE8C4', sol: '#FF9F43' }[id.marco]) : '#FFF8EF'; x.stroke();
  x.fillStyle = '#fff';
  x.font = id.avatar ? '150px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' : '900 120px Unbounded, sans-serif';
  x.textBaseline = 'middle'; x.fillText(id.avatar || iniciales(jugador.nombre), W / 2, 340); x.textBaseline = 'alphabetic';
  x.fillStyle = '#FFF8EF'; x.font = '900 72px Unbounded, sans-serif';
  x.fillText(jugador.nombre, W / 2, 580);
  if (pf.frase != null && pf.frase >= 0) { x.fillStyle = '#FFD166'; x.font = 'italic 600 40px "Bricolage Grotesque", sans-serif'; x.fillText('«' + FRASES[pf.frase] + '»', W / 2, 645); }
  x.fillStyle = '#3BE8C4'; x.font = '800 46px Unbounded, sans-serif';
  x.fillText('Nivel ' + c.nivel + ' · ' + c.nv.titulo, W / 2, 730);
  // Vitrina
  const vit = (pf.vitrina || []).filter(function (v) { return c.ins.indexOf(v) !== -1; }).slice(0, 3).map(insigniaPorId);
  const mostrar3 = vit.length ? vit : c.ins.slice(-3).map(insigniaPorId);
  mostrar3.forEach(function (b, i) {
    const cx = W / 2 + (i - (mostrar3.length - 1) / 2) * 300;
    x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.roundRect ? x.roundRect(cx - 130, 790, 260, 220, 30) : x.rect(cx - 130, 790, 260, 220); x.fill();
    x.fillStyle = '#fff'; x.font = '90px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'; x.fillText(b.i, cx, 900);
    x.fillStyle = '#FFF8EF'; x.font = '700 30px "Bricolage Grotesque", sans-serif'; x.fillText(b.n, cx, 975);
  });
  // Datos
  const sp = (prog.simulacros || {})[puestoActual().id];
  const datos = [
    ['🔥 ' + (prog.mejorRacha || 0), 'mejor racha'],
    ['📝 ' + (sp ? String(sp.mejor).replace('.', ',') : '—'), 'mejor simulacro'],
    ['🏅 ' + c.ins.length, 'insignias']
  ];
  datos.forEach(function (d, i) {
    const cx = W / 2 + (i - 1) * 320;
    x.fillStyle = '#FFD166'; x.font = '800 54px Unbounded, sans-serif'; x.fillText(d[0], cx, 1120);
    x.fillStyle = '#CFC6EA'; x.font = '600 30px "Bricolage Grotesque", sans-serif'; x.fillText(d[1], cx, 1165);
  });
  x.fillStyle = '#FFF8EF'; x.font = '600 32px "Bricolage Grotesque", sans-serif';
  x.fillText('¿Me superás? ' + location.host + location.pathname, W / 2, 1270);
  const blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); });
  const archivo = new File([blob], 'camino-a-la-libertad.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: 'Camino a la libertad', text: 'Mi perfil en «Camino a la libertad»: nivel ' + c.nivel + '. ¿Me superás? ' + location.href.split('#')[0] });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') { return; } }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'camino-a-la-libertad.png';
  document.body.append(a); a.click(); a.remove();
  aviso('📥 Tarjeta descargada: compartila por WhatsApp');
}
function renderMemoria() {
  $('pm-texto').textContent = ranking.modo === 'firebase'
    ? '✅ Se guarda solo, después de cada respuesta: en este celular y con una copia en la nube. Errores pendientes, estadísticas por área, rachas y récords quedan siempre guardados.'
    : '✅ Se guarda solo, después de cada respuesta, en este dispositivo: errores pendientes, estadísticas por área, rachas y récords.';
}
function renderPlan() {
  const p = puestoActual(), ol = $('pf-plan');
  ol.innerHTML = '';
  planRefuerzo(p).forEach(function (x) {
    const c = CATEGORIAS[x.k], li = el('li');
    li.style.setProperty('--lvc', x.color);
    const tt = el('div', 'tt', c.n);
    tt.append(el('small', null, x.etiqueta));
    const txt = el('div');
    txt.append(tt, el('div', 'rz', x.razon + (x.etiqueta === 'Explorar' ? '' : ' Vistas: ' + x.vistas + '/' + x.total + '.')));
    const b = el('button', 'btn primario', 'Entrenar');
    b.type = 'button';
    b.addEventListener('click', function () { iniciarPartida('practica', x.k); });
    li.append(el('span', 'ic', c.icono), txt, b);
    ol.append(li);
  });
}

/* ---------------- Modales ---------------- */
function abrirModalPuesto() {
  const d = $('m-puesto');
  botonesPuesto($('mp-puestos'), jugador.puesto, function (id) {
    jugador.puesto = id; guardarJugador();
    d.close();
    irInicio();
    latido();
  });
  d.showModal();
}
function abrirModalTema() {
  const p = puestoActual(), caja = $('mt-temas'), d = $('m-tema');
  caja.innerHTML = '';
  const nSin = sinVer(p).length;
  const bn = el('button', 'cat-op nuevas');
  bn.type = 'button'; bn.style.setProperty('--c', 'var(--teal, #12C2B0)');
  bn.append(el('span', null, '🆕'), document.createTextNode('Solo preguntas nuevas'), el('small', null, nSin ? plural(nSin, 'pregunta que todavía no viste', 'preguntas que todavía no viste') : 'Ya viste todas'));
  bn.disabled = !nSin;
  bn.addEventListener('click', function () { d.close(); iniciarPartida('nuevas'); });
  caja.append(bn);
  p.cats.forEach(function (k) {
    const c = CATEGORIAS[k], s = prog.cats[k];
    const b = el('button', 'cat-op');
    b.type = 'button'; b.style.setProperty('--c', c.color);
    b.append(el('span', null, c.icono), document.createTextNode(c.n), el('small', null, (POR_CAT[k] || []).length + ' preguntas' + (s && s.v ? ' · ' + Math.round(s.a / s.v * 100) + ' % de aciertos' : '')));
    b.addEventListener('click', function () { d.close(); iniciarPartida('practica', k); });
    caja.append(b);
  });
  d.showModal();
}
let quitarModalTop = null;
function abrirModalRanking() {
  const d = $('m-ranking'), tabs = $('mr-tabs');
  function ver(pid) {
    tabs.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.p === pid)); });
    if (quitarModalTop) { quitarModalTop(); }
    const orden = ordenTop;
    quitarModalTop = ranking.escucharTop(pid, function (filas, miId) { renderTop($('mr-lista'), filas, miId, orden); }, orden);
    $('mr-totales').textContent = textoTotales(pid);
  }
  tabs.innerHTML = '';
  PUESTOS.forEach(function (p) {
    const t = el('button', 'tab', p.icono + ' ' + p.corto);
    t.type = 'button'; t.dataset.p = p.id; t.setAttribute('role', 'tab');
    t.addEventListener('click', function () { ver(p.id); });
    tabs.append(t);
  });
  ver(jugador.puesto);
  d.addEventListener('close', function () { if (quitarModalTop) { quitarModalTop(); quitarModalTop = null; } }, { once: true });
  d.showModal();
}

/* ---------------- Partida ---------------- */
let partida = null;

function iniciarPartida(modo, cat) {
  const p = puestoActual();
  partida = {
    modo: modo, puesto: p, cats: p.cats, vidas: VIDAS, puntos: 0, n: 0, aciertos: 0,
    racha: 0, maxRacha: 0, medallas: new Set(), pleno: false, usadas: new Set(),
    errores: [], corona: false, cola: null, actual: null, respondida: false, total: MAX_PREG, deltas: {}, historial: []
  };
  cerrarPerfil();
  if (modo === 'practica') {
    const lista = [];
    for (let i = 0; i < 10; i++) { const q = elegir(cat, partida.usadas); if (!q) { break; } partida.usadas.add(q.id); lista.push(q); }
    partida.cola = lista;
    partida.total = lista.length;
    siguientePregunta();
  } else if (modo === 'entreno') {
    partida.cola = colaEntreno(p, 10);
    partida.total = partida.cola.length;
    siguientePregunta();
  } else if (modo === 'repaso') {
    partida.cola = mezclar(pendientes(p)).slice(0, MAX_PREG);
    partida.total = partida.cola.length;
    siguientePregunta();
  } else if (modo === 'nuevas') {
    partida.cola = colaNuevas(p, 10);
    partida.total = partida.cola.length;
    if (!partida.total) { aviso('🎉 ¡Ya viste todas las preguntas de tu temario!'); partida = null; irInicio(); return; }
    siguientePregunta();
  } else {
    seguirTopVivo(p);
    prepararRuleta();
  }
}

function marcadorHtml(caja) {
  caja.innerHTML = '';
  const num = Math.min(partida.respondida ? partida.n : partida.n + 1, partida.total);
  if (partida.modo === 'clasico') {
    caja.append(
      el('span', 'vidas', '❤️'.repeat(partida.vidas) + '🤍'.repeat(VIDAS - partida.vidas)),
      el('span', 'prog', 'Pregunta ' + num + ' de ' + MAX_PREG),
      el('span', 'pts', miles(partida.puntos))
    );
  } else {
    caja.append(
      el('span', 'prog', ({ repaso: '🔁 Repaso', entreno: '🧠 Entreno', practica: '🎯 Práctica', nuevas: '🆕 Nuevas' }[partida.modo]) + ' · ' + num + ' de ' + partida.total),
      el('span', 'racha', '✅ ' + partida.aciertos)
    );
  }
  if (partida.racha >= 2) { caja.append(el('span', 'racha', '🔥 ' + partida.racha)); }
  // El camino: un punto por pregunta; verde si acertó, rojo si falló, sol en la actual.
  const cam = caja.id === 'm-ruleta' ? $('c-ruleta') : $('c-pregunta');
  cam.innerHTML = '';
  const tot = partida.modo === 'clasico' ? MAX_PREG : partida.total, h = partida.historial;
  for (let i = 0; i < tot; i++) {
    const d = el('i');
    if (i < h.length) { d.className = h[i] ? 'ok' : 'no'; }
    else if (i === h.length) { d.className = 'ahora'; }
    else if (i === tot - 1) { d.className = 'meta'; }
    cam.append(d);
  }
}
function medallasHtml(caja) {
  caja.innerHTML = '';
  partida.cats.forEach(function (k) {
    const c = CATEGORIAS[k], m = el('span', 'medalla' + (partida.medallas.has(k) ? ' ok' : ''), c.icono);
    m.style.setProperty('--c', c.color); m.title = c.n;
    caja.append(m);
  });
}

/* ----- Ruleta ----- */
let giro = 0;
function segmentosRuleta() {
  const s = partida.cats.slice();
  return s.length < 6 ? s.concat(s) : s;
}
function dibujarRuleta() {
  const svg = $('ruleta'), segs = segmentosRuleta(), n = segs.length, a = 2 * Math.PI / n;
  const ns = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  segs.forEach(function (k, i) {
    const a0 = i * a, a1 = (i + 1) * a, r = 100;
    const x0 = r * Math.sin(a0), y0 = -r * Math.cos(a0), x1 = r * Math.sin(a1), y1 = -r * Math.cos(a1);
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M0 0 L' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1 + ' Z');
    path.setAttribute('fill', CATEGORIAS[k].color);
    path.setAttribute('stroke', '#fff'); path.setAttribute('stroke-width', '2');
    svg.append(path);
    const am = a0 + a / 2, t = document.createElementNS(ns, 'text');
    t.setAttribute('x', String(66 * Math.sin(am))); t.setAttribute('y', String(-66 * Math.cos(am)));
    t.textContent = CATEGORIAS[k].icono;
    svg.append(t);
  });
}
function prepararRuleta() {
  marcadorHtml($('m-ruleta'));
  medallasHtml($('medallas-ruleta'));
  dibujarRuleta();
  const btn = $('btn-girar');
  btn.disabled = false;
  if (partida.corona) {
    $('corona').hidden = false;
    $('ruleta-msg').textContent = '';
    btn.disabled = true;
    const ops = $('corona-ops');
    ops.innerHTML = '';
    partida.cats.forEach(function (k) {
      const c = CATEGORIAS[k], b = el('button', 'cat-op');
      b.type = 'button'; b.style.setProperty('--c', c.color);
      b.append(el('span', null, c.icono), document.createTextNode(c.n), el('small', null, partida.medallas.has(k) ? 'Medalla ganada' : 'Te falta esta medalla'));
      b.addEventListener('click', function () { partida.corona = false; $('corona').hidden = true; preguntaDeCategoria(k); });
      ops.append(b);
    });
  } else {
    $('corona').hidden = true;
    $('ruleta-msg').textContent = 'Tocá GIRAR para sortear la categoría';
  }
  $('op-rapido').checked = !!perfilCfg().girarRapido;
  mostrar('p-ruleta');
}
function girar() {
  const btn = $('btn-girar');
  if (btn.disabled) { return; }
  btn.disabled = true;
  const segs = segmentosRuleta(), n = segs.length, paso = 360 / n;
  const i = Math.floor(Math.random() * n);
  const centro = (i + 0.5) * paso + (Math.random() - 0.5) * paso * 0.6;
  const actual = ((giro % 360) + 360) % 360;
  const rapido = !!perfilCfg().girarRapido;
  const dur = rapido ? 1300 : 4000;
  giro += 360 * (rapido ? 2 : 5) + ((360 - centro - actual) % 360 + 360) % 360;
  $('ruleta').style.transitionDuration = dur + 'ms';
  $('ruleta').style.transform = 'rotate(' + giro + 'deg)';
  $('ruleta-msg').textContent = 'Girando…';
  let ticks = 0;
  const tic = setInterval(function () { Sonido.tick(); if (++ticks > (rapido ? 7 : 22)) { clearInterval(tic); } }, 160);
  setTimeout(function () {
    clearInterval(tic);
    const k = segs[i];
    $('ruleta-msg').textContent = CATEGORIAS[k].icono + ' ' + CATEGORIAS[k].n;
    setTimeout(function () { preguntaDeCategoria(k); }, rapido ? 350 : 700);
  }, dur + 100);
}
function preguntaDeCategoria(k) {
  let q = elegir(k, partida.usadas, partida.n >= 5);
  if (!q) { partida.usadas = new Set(); q = elegir(k, partida.usadas); }
  partida.usadas.add(q.id);
  mostrarPregunta(q);
}

/* ----- Pregunta ----- */
let reloj = null;
function siguientePregunta() {
  if (!partida.cola.length) { terminar(); return; }
  mostrarPregunta(partida.cola.shift());
}
function mostrarPregunta(q) {
  partida.actual = q;
  partida.respondida = false;
  const c = CATEGORIAS[q.cat];
  marcadorHtml($('m-pregunta'));
  const banda = $('q-cat');
  banda.innerHTML = '';
  banda.style.setProperty('--c', c.color);
  banda.append(el('span', 'ic', c.icono), document.createTextNode(c.n));
  const st = prog.preg[q.id];
  $('q-meta').textContent = (q.dif === 3 ? 'Dificultad media-alta' : 'Dificultad media') + (st && st.pend ? ' · ⚠️ La fallaste antes' : (st ? ' · Ya la viste' : ' · Nueva'));
  $('q-texto').textContent = q.texto;
  pintarFigura('q-fig', q);
  const correcta = q.ops[0];
  const caja = $('q-opciones');
  caja.innerHTML = '';
  mezclar(q.ops).forEach(function (txt, i) {
    const b = el('button', 'op');
    b.type = 'button';
    b.dataset.ok = String(txt === correcta);
    b.append(el('span', 'letra', LETRAS[i]), el('span', null, txt));
    b.addEventListener('click', function () { responder(b); });
    caja.append(b);
  });
  $('q-feedback').hidden = true;
  mostrar('p-pregunta');
  iniciarReloj();
}
function iniciarReloj() {
  const caja = $('q-reloj'), barra = $('q-barra');
  if (reloj) { cancelAnimationFrame(reloj.raf); }
  if (partida.modo !== 'clasico') { caja.hidden = true; reloj = null; return; }
  caja.hidden = false;
  const t0 = performance.now();
  reloj = { t0: t0, restante: TIEMPO, ultimoTic: TIEMPO, raf: 0 };
  (function cuadro(t) {
    if (!reloj) { return; }
    const rest = Math.max(0, TIEMPO - (t - t0) / 1000);
    reloj.restante = rest;
    barra.style.transform = 'scaleX(' + (rest / TIEMPO) + ')';
    barra.className = 'reloj-barra' + (rest < 6 ? ' poco' : rest < 14 ? ' medio' : '');
    if (rest < 5 && Math.ceil(rest) < reloj.ultimoTic) { reloj.ultimoTic = Math.ceil(rest); Sonido.tick(); }
    if (rest <= 0) { responder(null); return; }
    reloj.raf = requestAnimationFrame(cuadro);
  })(t0);
}
function detenerReloj() {
  const rest = reloj ? reloj.restante : 0;
  if (reloj) { cancelAnimationFrame(reloj.raf); reloj = null; }
  return rest;
}

function responder(boton) {
  const q = partida.actual;
  if (!q || partida.respondida) { return; }
  partida.respondida = true;
  const restante = detenerReloj();
  const botones = Array.from($('q-opciones').children);
  botones.forEach(function (b) {
    b.disabled = true;
    if (b.dataset.ok === 'true') { b.classList.add('correcta'); }
    else if (b === boton) { b.classList.add('incorrecta'); }
    else { b.classList.add('apagada'); }
  });
  const ok = !!boton && boton.dataset.ok === 'true';
  registrarRespuesta(q, ok);
  const dl = partida.deltas[q.cat] || (partida.deltas[q.cat] = { v: 0, a: 0 });
  dl.v += 1; if (ok) { dl.a += 1; }
  vibrar(ok ? 40 : [90, 60, 90]);
  partida.historial.push(ok);
  partida.n += 1;
  let titulo = '', extra = '';

  if (ok) {
    partida.aciertos += 1;
    partida.racha += 1;
    partida.maxRacha = Math.max(partida.maxRacha, partida.racha);
    Sonido.ok();
    if (partida.modo === 'clasico') {
      const base = q.dif === 3 ? 150 : 100;
      const bonoT = Math.round(restante / TIEMPO * 50);
      const bonoR = partida.racha >= 3 ? Math.min(100, (partida.racha - 2) * 20) : 0;
      partida.puntos += base + bonoT + bonoR;
      titulo = '¡Correcto! +' + (base + bonoT + bonoR);
      if (!partida.medallas.has(q.cat)) {
        partida.medallas.add(q.cat);
        extra = ' 🏅 Ganaste la medalla de ' + CATEGORIAS[q.cat].n + '.';
        setTimeout(function () { Sonido.medalla(); }, 250);
        if (partida.medallas.size === partida.cats.length && !partida.pleno) {
          partida.pleno = true; partida.puntos += BONO_PLENO; prog.plenos = (prog.plenos || 0) + 1;
          extra += ' ¡PLENO! Todas las medallas: +' + BONO_PLENO + '.';
          confeti(160);
        }
      }
      if (partida.racha % 3 === 0) { partida.corona = true; extra += ' 👑 Racha de ' + partida.racha + ': ganaste una corona.'; }
    } else {
      titulo = '¡Correcto!';
      const st = prog.preg[q.id];
      if (partida.modo === 'repaso') { extra = st.pend ? ' Respondela bien una vez más para sacarla de tu lista.' : ' ✔️ Salió de tu lista de repaso.'; }
    }
  } else {
    partida.racha = 0;
    Sonido.mal();
    titulo = boton ? 'Incorrecto' : '⏰ ¡Se acabó el tiempo!';
    if (partida.modo === 'clasico') { partida.vidas -= 1; extra = ' Perdiste una vida.'; }
    partida.errores.push({ q: q, tu: boton ? boton.lastChild.textContent : '(sin respuesta)' });
  }

  marcadorHtml($('m-pregunta'));
  const fb = $('q-feedback');
  fb.classList.toggle('mal', !ok);
  $('fb-titulo').textContent = titulo;
  $('fb-exp').textContent = (ok ? '' : 'Respuesta correcta: «' + q.ops[0] + '». ') + q.exp + extra;
  const f = citar(q.fuente), fuente = $('fb-fuente');
  fuente.textContent = 'Fuente: ' + f.texto + ' ';
  if (f.url) { const a = el('a', null, 'Ver fuente'); a.href = f.url; a.target = '_blank'; a.rel = 'noopener'; fuente.append(a); }
  $('q-reportar').dataset.preg = q.id;
  pintarTopVivo(partida.puntos);
  const fin = partidaTerminada();
  $('btn-seguir').textContent = fin ? 'Ver resultado' : 'Seguir';
  fb.hidden = false;
  setTimeout(function () { fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
}
function partidaTerminada() {
  if (partida.modo === 'clasico') { return partida.vidas <= 0 || partida.n >= MAX_PREG; }
  return partida.cola.length === 0;
}
function seguir() {
  if (!partida || !partida.respondida || !partida.actual) { return; }
  partida.actual = null;
  if (partidaTerminada()) { terminar(); return; }
  if (partida.modo === 'clasico') { prepararRuleta(); } else { siguientePregunta(); }
}

/* ----- Fin ----- */
async function terminar() {
  detenerReloj();
  dejarTopVivo();
  const p = partida.puesto;
  const pct = partida.n ? Math.round(partida.aciertos / partida.n * 100) : 0;
  $('f-record').hidden = true;
  const racha = actualizarRacha();
  const rachaAnterior = prog.mejorRacha || 0;
  prog.mejorRacha = Math.max(rachaAnterior, partida.maxRacha);
  guardarProg();
  $('f-racha').textContent = racha.dias > 1 ? '🔥 ' + racha.dias + ' días seguidos estudiando' : '🔥 Primer día de tu racha: volvé mañana para sumarla';
  partida.compartir = null;

  if (partida.modo === 'clasico') {
    const pp = prog.puestos[p.id] || (prog.puestos[p.id] = { partidas: 0, mejor: 0 });
    const recordLocal = partida.puntos > pp.mejor;
    pp.partidas += 1;
    pp.mejor = Math.max(pp.mejor, partida.puntos);
    guardarProg();
    $('f-emoji').textContent = partida.vidas > 0 ? '🏆' : '⚡';
    $('f-titulo').textContent = partida.vidas > 0 ? '¡Completaste la partida!' : 'Te quedaste sin vidas';
    $('f-puntos').textContent = miles(partida.puntos);
    $('f-sub').textContent = partida.aciertos + ' de ' + partida.n + ' correctas (' + pct + ' %) · racha sin errores: ' + partida.maxRacha + ' · ' + p.corto;
    $('f-medallas').hidden = false;
    medallasHtml($('f-medallas'));
    Sonido.fin();
    try {
      partida.compartir = '☀️ Hice ' + miles(partida.puntos) + ' puntos en «Camino a la libertad» (' + p.corto + '): ' + partida.aciertos + ' de ' + partida.n + ' correctas. ¿Me superás?';
      const r = await ranking.guardarPartida(jugador.nombre, p.id, { puntos: partida.puntos, aciertos: partida.aciertos, preguntas: partida.n, deltas: partida.deltas, racha: partida.maxRacha, mejorRacha: prog.mejorRacha, identidad: identidadPropia(), privado: !!perfilCfg().privado });
      const records = [];
      if ((r && r.record) || recordLocal) { records.push('🎉 ¡Nuevo récord de puntaje!'); }
      if (partida.maxRacha > rachaAnterior && partida.maxRacha >= 3) { records.push('🔥 ¡Nueva mejor racha sin errores: ' + partida.maxRacha + '!'); }
      if (records.length) {
        $('f-record').textContent = records.join(' ');
        $('f-record').hidden = false;
        confeti(140);
      }
    } catch (e) {
      console.error(e);
      $('f-record').textContent = 'No se pudo guardar en el ranking en línea. Tu progreso quedó guardado en este dispositivo.';
      $('f-record').hidden = false;
    }
  } else {
    $('f-emoji').textContent = { repaso: '🔁', entreno: '🧠', practica: '🎯', nuevas: '🆕' }[partida.modo];
    $('f-titulo').textContent = { repaso: 'Repaso terminado', entreno: 'Entrenamiento terminado', practica: 'Práctica terminada', nuevas: 'Preguntas nuevas: listo' }[partida.modo];
    $('f-puntos').textContent = partida.aciertos + '/' + partida.n;
    $('f-sub').textContent = pct + ' % de aciertos · suma a tu perfil, no al ranking';
    $('f-medallas').hidden = true;
    if (pct >= 80) { confeti(100); }
    ranking.guardarStats(jugador.nombre, partida.deltas, prog.mejorRacha, { privado: !!perfilCfg().privado }).catch(function (e) { console.error(e); });
  }
  $('btn-compartir').hidden = !partida.compartir;
  revisarLogros();

  const lista = $('f-errores');
  lista.innerHTML = '';
  $('f-errores-caja').hidden = partida.errores.length === 0;
  partida.errores.forEach(function (x) {
    const li = el('li');
    li.append(el('div', 'q', x.q.texto), el('div', 'a', '✔ ' + x.q.ops[0]), el('div', 'tu', '✘ Tu respuesta: ' + x.tu), el('div', 'e', x.q.exp));
    lista.append(li);
  });
  $('btn-otra').textContent = partida.modo === 'clasico' ? 'Jugar otra' : (partida.modo === 'repaso' && pendientes(p).length ? 'Seguir repasando' : 'Jugar con ranking');
  mostrar('p-fin');
}

/* ---------------- Simulacro de examen ---------------- */
/*
 * Reproduce el formato de la prueba: sin respuestas hasta el final, con reloj general.
 *  - Cargos CPI: 30 preguntas = 30 puntos de la prueba técnica, repartidas entre los bloques del temario; 45 minutos.
 *  - Ingeniero (CPIEP): estadística 10 pts (8 preguntas), Excel 10 pts (8), legislación 5 pts (4); 30 minutos.
 * Se aprueba con el 60 %, como fijan las actas.
 */
function configSimulacro(p) {
  if (p.id === 'ingeniero') {
    return { n: { est: 8, xls: 8, fp: 4 }, pts: { est: 10, xls: 10, fp: 5 }, total: 25, minutos: 30,
      pie: 'Nota sobre 25: estadística (10), planilla electrónica (10) y legislación (5). La parte de guaraní (5) se rinde por escrito y no está incluida.' };
  }
  const n = {}, pts = {}, base = Math.floor(30 / p.cats.length);
  let resto = 30 - base * p.cats.length;
  mezclar(p.cats).forEach(function (k) { n[k] = base + (resto-- > 0 ? 1 : 0); pts[k] = n[k]; });
  return { n: n, pts: pts, total: 30, minutos: 45,
    pie: 'Nota sobre los 30 puntos de la prueba técnica. El guaraní, el test psicométrico y la entrevista se evalúan aparte.' };
}
function elegirSim(cat, usadas) {
  const pool = (POR_CAT[cat] || []).filter(function (q) { return !usadas.has(q.id); });
  const dificiles = pool.filter(function (q) { return q.dif === 3; });
  const lista = dificiles.length && Math.random() < 0.65 ? dificiles : pool;
  return lista[Math.floor(Math.random() * lista.length)] || null;
}
let relojSim = null;
function iniciarSimulacro() {
  const p = puestoActual(), cfg = configSimulacro(p), usadas = new Set(), cola = [];
  Object.keys(cfg.n).forEach(function (k) {
    for (let i = 0; i < cfg.n[k]; i++) { const q = elegirSim(k, usadas); if (q) { usadas.add(q.id); cola.push(q); } }
  });
  cerrarPerfil();
  partida = { modo: 'simulacro', puesto: p, cfg: cfg, cola: mezclar(cola), idx: 0, resp: [], elegida: null, fin: Date.now() + cfg.minutos * 60000, inicio: Date.now(), deltas: {}, terminado: false };
  clearInterval(relojSim);
  relojSim = setInterval(tickSim, 1000);
  mostrarSim();
}
function tickSim() {
  if (!partida || partida.modo !== 'simulacro' || partida.terminado) { clearInterval(relojSim); return; }
  const rest = Math.max(0, partida.fin - Date.now()), r = $('s-reloj');
  const mm = Math.floor(rest / 60000), ss = Math.floor(rest % 60000 / 1000);
  r.textContent = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  r.classList.toggle('poco', rest < 5 * 60000);
  if (rest <= 0) { terminarSimulacro(true); }
}
function mostrarSim() {
  const q = partida.cola[partida.idx], total = partida.cola.length, c = CATEGORIAS[q.cat];
  partida.elegida = null;
  $('s-prog').textContent = '📝 Pregunta ' + (partida.idx + 1) + ' de ' + total;
  $('s-barra').style.width = (partida.idx / total * 100) + '%';
  $('s-meta').textContent = c.icono + ' ' + c.n;
  $('s-texto').textContent = q.texto;
  pintarFigura('s-fig', q);
  const caja = $('s-opciones');
  caja.innerHTML = '';
  mezclar(q.ops).forEach(function (txt, i) {
    const b = el('button', 'op');
    b.type = 'button';
    b.dataset.txt = txt;
    b.append(el('span', 'letra', LETRAS[i]), el('span', null, txt));
    b.addEventListener('click', function () {
      Array.from(caja.children).forEach(function (x) { x.classList.toggle('elegida', x === b); });
      partida.elegida = txt;
      $('btn-s-sig').disabled = false;
      vibrar(15);
    });
    caja.append(b);
  });
  $('btn-s-sig').disabled = true;
  $('btn-s-sig').textContent = partida.idx === total - 1 ? 'Entregar examen ✓' : 'Siguiente →';
  tickSim();
  mostrar('p-sim');
}
function siguienteSim() {
  if (!partida || partida.modo !== 'simulacro' || partida.elegida == null) { return; }
  partida.resp[partida.idx] = partida.elegida;
  if (partida.idx >= partida.cola.length - 1) { terminarSimulacro(false); return; }
  partida.idx += 1;
  mostrarSim();
}
function terminarSimulacro(porTiempo) {
  if (!partida || partida.terminado) { return; }
  partida.terminado = true;
  clearInterval(relojSim);
  const cfg = partida.cfg, p = partida.puesto, porCat = {}, errores = [];
  partida.cola.forEach(function (q, i) {
    const r = partida.resp[i], ok = r === q.ops[0];
    const pc = porCat[q.cat] || (porCat[q.cat] = { v: 0, a: 0 });
    pc.v += 1; if (ok) { pc.a += 1; }
    registrarRespuesta(q, ok);
    const dl = partida.deltas[q.cat] || (partida.deltas[q.cat] = { v: 0, a: 0 });
    dl.v += 1; if (ok) { dl.a += 1; }
    if (!ok) { errores.push({ q: q, tu: r == null ? '(en blanco)' : r }); }
  });
  let nota = 0;
  Object.keys(porCat).forEach(function (k) { nota += porCat[k].a * (cfg.pts[k] / cfg.n[k]); });
  nota = Math.round(nota * 10) / 10;
  const aprobado = nota >= cfg.total * 0.6;
  const minimo = Math.round(cfg.total * 0.6 * 10) / 10;
  const usados = Math.round((Date.now() - partida.inicio) / 60000);
  const sims = prog.simulacros || (prog.simulacros = {});
  const hist = sims[p.id] || (sims[p.id] = { mejor: 0, intentos: 0, ultimos: [] });
  const anterior = hist.mejor;
  hist.intentos += 1;
  hist.mejor = Math.max(hist.mejor, nota);
  if (aprobado) { hist.aprobados = (hist.aprobados || 0) + 1; }
  hist.ultimos = hist.ultimos.concat([{ f: Date.now(), nota: nota }]).slice(-10);
  actualizarRacha();
  guardarProg();
  ranking.guardarStats(jugador.nombre, partida.deltas, prog.mejorRacha || 0, { privado: !!perfilCfg().privado }).catch(function (e) { console.error(e); });

  $('sf-emoji').textContent = aprobado ? '🎓' : '📚';
  $('sf-titulo').textContent = porTiempo ? '⏰ Se terminó el tiempo' : (aprobado ? '¡Aprobarías!' : 'Todavía no alcanza');
  $('sf-nota').textContent = String(nota).replace('.', ',');
  $('sf-sobre').textContent = 'de ' + cfg.total + ' puntos · ' + Math.round(nota / cfg.total * 100) + ' %';
  const sello = $('sf-sello');
  sello.textContent = aprobado ? 'Aprobado' : 'No aprobado';
  sello.className = 'sello ' + (aprobado ? 'ok' : 'no');
  $('sf-sub').textContent = (aprobado ? 'Superaste el mínimo de ' : 'Necesitás al menos ') + String(minimo).replace('.', ',') + ' puntos (60 %). Usaste ' + (usados < 1 ? 'menos de un minuto' : plural(Math.min(usados, cfg.minutos), 'minuto', 'minutos')) + ' de ' + cfg.minutos + '.';
  $('sf-comp').textContent = hist.intentos === 1 ? 'Primer simulacro de ' + p.corto + '.'
    : (nota > anterior ? '🎉 ¡Mejoraste tu mejor simulacro (' + String(anterior).replace('.', ',') + ')!' : 'Tu mejor simulacro: ' + String(hist.mejor).replace('.', ',') + ' de ' + cfg.total + '.');
  const areas = $('sf-areas');
  areas.innerHTML = '';
  Object.keys(cfg.n).forEach(function (k) {
    const s = porCat[k] || { v: 0, a: 0 }, f = filaDominio(k, s, 1);
    f.querySelector('.nm small').textContent = s.a + ' de ' + s.v + ' correctas';
    areas.append(f);
  });
  $('sf-nota-pie').textContent = cfg.pie;
  const lista = $('sf-errores');
  lista.innerHTML = '';
  errores.forEach(function (x) {
    const li = el('li');
    li.append(el('div', 'q', x.q.texto), el('div', 'a', '✔ ' + x.q.ops[0]), el('div', 'tu', '✘ Tu respuesta: ' + x.tu), el('div', 'e', x.q.exp));
    lista.append(li);
  });
  $('sf-err-caja').hidden = !errores.length;
  if (aprobado) { confeti(150); Sonido.fin(); } else { Sonido.mal(); }
  mostrar('p-simfin');
  revisarLogros();
}

/* ---------------- Niveles, insignias y perfil público ---------------- */
// Después de cada partida: ¿subió de nivel?, ¿ganó insignias nuevas? Y se actualiza el perfil público.
function revisarLogros() {
  if (!prog) { return; }
  const c = ctxJugador();
  const antes = prog.ultimoNivel || 1;
  if (c.nivel > antes) { setTimeout(function () { celebrarNivel(c, antes); }, 1200); }
  prog.ultimoNivel = Math.max(antes, c.nivel);
  const vistas = prog.insVistas || [];
  const nuevas = c.ins.filter(function (id) { return vistas.indexOf(id) === -1; });
  prog.insVistas = c.ins.slice();
  nuevas.slice(0, 3).forEach(function (id, i) {
    const x = insigniaPorId(id);
    setTimeout(function () { aviso('🏅 Nueva insignia: ' + x.i + ' ' + x.n); }, 2600 + i * 4300);
  });
  guardarProg();
  publicarPerfil();
}
function desbloqueosDelNivel(n) {
  const l = [];
  AVATARES.forEach(function (a) { if (a[1] === n) { l.push(a[0]); } });
  COLORES.forEach(function (c) { if (c[2] === n) { l.push('color ' + c[1]); } });
  Object.keys(MARCOS).forEach(function (k) { if (MARCOS[k].req === 'Nivel ' + n) { l.push('marco ' + MARCOS[k].n); } });
  return l;
}
function celebrarNivel(c, antes) {
  const d = $('m-nivel');
  $('mn-nivel').textContent = c.nivel;
  $('mn-titulo').textContent = c.nv.titulo;
  const desb = [];
  for (let n = antes + 1; n <= c.nivel; n++) { desb.push.apply(desb, desbloqueosDelNivel(n)); }
  $('mn-desb').textContent = desb.length ? '🔓 Desbloqueaste: ' + desb.join(' · ') : 'Seguí sumando experiencia para desbloquear avatares, colores y marcos.';
  confeti(180); Sonido.fin(); vibrar([60, 40, 60, 40, 120]);
  if (!d.open) { d.showModal(); }
}
function publicarPerfil() {
  if (!ranking || !jugador || !prog) { return; }
  const c = ctxJugador(), pf = perfilCfg(), id = identidadPropia(c);
  const datos = {
    nombre: jugador.nombre, avatar: id.avatar || '', color: id.color || '', marco: id.marco || '',
    frase: pf.frase == null ? -1 : pf.frase,
    vitrina: (pf.vitrina || []).filter(function (x) { return c.ins.indexOf(x) !== -1; }).slice(0, 3),
    insignias: c.ins.slice(0, 60), nivel: c.nivel, xp: Math.round(c.xp),
    postula: (pf.postula || []).filter(function (x) { return puestoPorId(x); }).slice(0, 4),
    privado: !!pf.privado
  };
  if (pf.privado) { datos.borrarCats = true; }
  else if (prog.publicadoPrivado) {
    // Al volver a público se publican de nuevo las estadísticas por área.
    const cats = {};
    Object.keys(prog.cats || {}).forEach(function (k) { if (CATEGORIAS[k]) { cats[k] = { v: prog.cats[k].v || 0, a: prog.cats[k].a || 0 }; } });
    datos.cats = cats;
  }
  const huella = JSON.stringify(datos);
  if (huella === prog.publicadoHuella) { return; }
  ranking.actualizarPerfil(datos).then(function () {
    prog.publicadoHuella = huella;
    prog.publicadoPrivado = datos.privado;
    guardarProg();
  }).catch(function (e) { console.warn('No se pudo actualizar el perfil público:', e); });
}

/* ---------------- Gráfico de la pregunta ---------------- */
function pintarFigura(id, q) {
  const caja = $(id);
  if (!caja) { return; }
  const html = q && q.fig ? figuraHtml(q.fig) : '';
  caja.innerHTML = html;
  caja.hidden = !html;
}

/* ---------------- Preguntas sin ver ---------------- */
function preguntasPuesto(p) { return PREGUNTAS.filter(function (q) { return p.cats.indexOf(q.cat) !== -1; }); }
function sinVer(p) { return preguntasPuesto(p).filter(function (q) { return !prog.preg[q.id]; }); }
function colaNuevas(p, n) {
  const nuevas = mezclar(sinVer(p));
  // Reparte entre áreas para que no salgan todas del mismo tema.
  const porCat = {};
  nuevas.forEach(function (q) { (porCat[q.cat] = porCat[q.cat] || []).push(q); });
  const cats = mezclar(Object.keys(porCat)), cola = [];
  while (cola.length < n && cats.some(function (k) { return porCat[k].length; })) {
    cats.forEach(function (k) { if (cola.length < n && porCat[k].length) { cola.push(porCat[k].shift()); } });
  }
  return cola;
}

/* ---------------- «Vas X.º en el top» (partida con ranking) ---------------- */
let quitarTopVivo = null, topVivo = null;
function seguirTopVivo(p) {
  dejarTopVivo();
  topVivo = { pid: p.id, filas: null, miId: null, pos: null };
  quitarTopVivo = ranking.escucharTop(p.id, function (filas, miId) { if (topVivo) { topVivo.filas = filas; topVivo.miId = miId; } }, 'mejor');
}
function dejarTopVivo() { if (quitarTopVivo) { quitarTopVivo(); quitarTopVivo = null; } topVivo = null; }
function pintarTopVivo(puntos) {
  const caja = $('q-toppos');
  if (!topVivo || !topVivo.filas || !partida || partida.modo !== 'clasico') { caja.hidden = true; return; }
  const otros = topVivo.filas.filter(function (f) { return f.id !== topVivo.miId; });
  const pos = 1 + otros.filter(function (f) { return (f.mejor || 0) > puntos; }).length;
  const antes = topVivo.pos;
  topVivo.pos = pos;
  caja.innerHTML = '';
  caja.className = 'top-pos';
  if (pos > 10) {
    const ult = otros[9];
    caja.append(el('span', 'tp-num', '📈'), el('span', 'tp-txt', 'Te faltan ' + miles((ult ? ult.mejor : 0) - puntos + 1) + ' pts para entrar al top 10 de ' + partida.puesto.corto));
  } else {
    const delante = otros.filter(function (f) { return (f.mejor || 0) > puntos; }).pop();
    const num = el('span', 'tp-num', pos + '.º');
    caja.append(num, el('span', 'tp-txt', (pos === 1 ? '¡Vas primero en el top de ' + partida.puesto.corto + '!' : 'Vas ' + pos + '.º en el top de ' + partida.puesto.corto)
      + (delante ? ' · a ' + miles(delante.mejor - puntos + 1) + ' pts de ' + delante.nombre : '')));
    if (antes != null && pos < antes) { caja.classList.add('sube'); num.dataset.antes = antes + '.º'; }
  }
  caja.hidden = false;
}

/* ---------------- Reportar un error en una pregunta ---------------- */
let reportePreg = null;
function abrirReporte(id) {
  const q = POR_ID[id];
  if (!q) { return; }
  const ya = (perfilCfg().reportados || []).indexOf(id) !== -1;
  if (ya) { aviso('Ya reportaste esta pregunta. ¡Gracias!'); return; }
  reportePreg = id;
  $('mrp-preg').textContent = '«' + q.texto + '»';
  $('f-reporte').reset();
  $('mrp-error').hidden = true;
  $('m-reporte').showModal();
}
async function enviarReporte(ev) {
  ev.preventDefault();
  const motivo = (new FormData(ev.target)).get('motivo');
  if (!motivo || !reportePreg) { return; }
  const b = $('btn-rep-ok');
  b.disabled = true;
  try {
    await ranking.reportar({ preg: reportePreg, motivo: motivo, nombre: jugador.nombre });
    const pf = perfilCfg();
    pf.reportados = (pf.reportados || []).concat([reportePreg]).slice(-200);
    guardarProg();
    $('m-reporte').close();
    aviso('✅ Gracias: vamos a revisar esa pregunta.');
  } catch (e) {
    console.error(e);
    $('mrp-error').textContent = 'No se pudo enviar. Revisá tu conexión.';
    $('mrp-error').hidden = false;
  } finally { b.disabled = false; }
}

/* ---------------- Jugadores inscriptos ---------------- */
let cacheJugadores = null, cacheTotal = null, filtroJug = 'todos';
function haceTxt(ms) {
  if (!ms) { return 'sin actividad registrada'; }
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 2) { return 'recién'; }
  if (m < 60) { return 'hace ' + m + ' min'; }
  const h = Math.round(m / 60);
  if (h < 24) { return 'hace ' + plural(h, 'hora', 'horas'); }
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : 'hace ' + d + ' días';
}
async function traerJugadores(forzar) {
  if (!forzar && cacheJugadores && Date.now() - cacheJugadores.t < 120000) { return cacheJugadores.lista; }
  const lista = await ranking.listarJugadores();
  cacheJugadores = { t: Date.now(), lista: lista };
  return lista;
}
async function pintarBotonJugadores() {
  try {
    if (!cacheTotal || Date.now() - cacheTotal.t > 300000) { cacheTotal = { t: Date.now(), n: await ranking.contarJugadores() }; }
    $('jb-total').textContent = miles(cacheTotal.n);
    $('jb-sub').textContent = (cacheTotal.n === 1 ? 'persona inscripta' : 'personas inscriptas') + ' · ver quiénes son';
  } catch (e) { console.warn(e); $('jb-total').textContent = '👥'; }
  const avs = $('jb-avs');
  avs.innerHTML = '';
  const fuente = cacheJugadores ? cacheJugadores.lista : enLinea;
  fuente.slice(0, 4).forEach(function (j) { const a = el('span', 'avatar mini'); pintarAvatar(a, j.nombre, j); avs.append(a); });
}
function puestosDe(j) {
  const s = new Set(j.postula || []);
  Object.keys(j.puestos || {}).forEach(function (k) { if ((j.puestos[k].partidas || 0) > 0) { s.add(k); } });
  return Array.from(s).filter(puestoPorId);
}
async function abrirJugadores() {
  if (quitarTop) { quitarTop(); quitarTop = null; }
  mostrar('p-jugadores');
  $('pj-lista').innerHTML = '';
  $('pj-lista').append(el('li', 'vacio', 'Cargando…'));
  try {
    const lista = await traerJugadores(false);
    const total = cacheTotal ? Math.max(cacheTotal.n, lista.length) : lista.length;
    $('pj-total').textContent = miles(total);
    const ahora = Date.now();
    const hoyN = lista.filter(function (j) { return j.ultimo && ahora - j.ultimo < 86400000; }).length;
    const semN = lista.filter(function (j) { return j.ultimo && ahora - j.ultimo < 7 * 86400000; }).length;
    const res = $('pj-resumen');
    res.innerHTML = '';
    [[miles(total), total === 1 ? 'inscripta' : 'inscriptas'], [miles(hoyN), 'activas hoy'], [miles(semN), 'esta semana']]
      .forEach(function (x) { const d = el('div'); d.append(el('b', null, x[0]), el('small', null, x[1])); res.append(d); });
    $('pj-titulo').textContent = total === 1 ? ' persona en el camino' : ' personas en el camino';
    document.querySelectorAll('#pj-filtro .tab').forEach(function (t) {
      const p = puestoPorId(t.dataset.f);
      const n = p ? lista.filter(function (j) { return puestosDe(j).indexOf(p.id) !== -1; }).length : lista.length;
      t.textContent = (p ? p.icono + ' ' + p.corto : 'Todos') + ' · ' + n;
    });
    renderListaJugadores();
  } catch (e) {
    console.error(e);
    $('pj-lista').innerHTML = '';
    $('pj-lista').append(el('li', 'vacio', 'No se pudo cargar la lista. Revisá tu conexión.'));
  }
}
function renderListaJugadores() {
  const ul = $('pj-lista');
  if (!cacheJugadores) { return; }
  const txt = $('pj-buscar').value.trim().toLowerCase();
  const yo = ranking.miId();
  const lista = cacheJugadores.lista.filter(function (j) {
    return (!txt || String(j.nombre || '').toLowerCase().indexOf(txt) !== -1) && (filtroJug === 'todos' || puestosDe(j).indexOf(filtroJug) !== -1);
  });
  document.querySelectorAll('#pj-filtro .tab').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.f === filtroJug)); });
  ul.innerHTML = '';
  if (!lista.length) { ul.append(el('li', 'vacio', 'No hay nadie con ese filtro.')); return; }
  const enl = {};
  enLinea.forEach(function (x) { if (Date.now() - x.ultimo < EN_LINEA_SEG * 1000) { enl[x.id] = true; } });
  lista.forEach(function (j, i) {
    const li = el('li', j.id === yo ? 'yo' : null);
    li.style.setProperty('--i', Math.min(i, 20));
    li.tabIndex = 0; li.setAttribute('role', 'button');
    const av = el('span', 'avatar chico' + (enl[j.id] ? ' en-linea' : ''));
    pintarAvatar(av, j.nombre, j);
    const t = el('span', 'pj-txt');
    t.append(el('b', null, (esFavorito(j.id) ? '★ ' : '') + j.nombre + (j.id === yo ? ' (vos)' : '')),
      el('small', null, 'Nv ' + (j.nivel || 1) + ' · ' + plural(j.partidas || 0, 'partida', 'partidas') + ' · ' + (enl[j.id] ? '🟢 en línea' : haceTxt(j.ultimo))));
    const ps = el('span', 'pj-puestos');
    puestosDe(j).forEach(function (pid) { const p = puestoPorId(pid); const s = el('span', null, p.icono); s.title = p.n; ps.append(s); });
    li.append(av, t, ps);
    li.addEventListener('click', function () { abrirPerfil(j.id, j.nombre); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter') { li.click(); } });
    ul.append(li);
  });
}

/* ---------------- Novedades (una vez por versión) ---------------- */
const NOVEDADES = 'v5';
function mostrarNovedades() {
  if (!jugador || LS.get('andeJuego.novedades', '') === NOVEDADES) { return; }
  const ins = $('m-inscripcion');
  if (ins.open) { ins.addEventListener('close', function () { setTimeout(mostrarNovedades, 400); }, { once: true }); return; }
  if ($('p-inicio').hidden) { return; }
  const d = $('m-novedades');
  LS.set('andeJuego.novedades', NOVEDADES);
  d.addEventListener('close', function () { if (d.returnValue === 'editar') { abrirEditor(); } }, { once: true });
  d.showModal();
}

/* ---------------- Link de invitación ?sala=CODE ---------------- */
function codigoEnLink() {
  const u = new URL(location.href), c = (u.searchParams.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length === 4) { sessionStorage.setItem('andeJuego.salaLink', c); }
  if (u.searchParams.has('sala')) { u.searchParams.delete('sala'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); }
}
async function entrarPorLink() {
  const c = sessionStorage.getItem('andeJuego.salaLink');
  if (!c || !jugador) { return; }
  sessionStorage.removeItem('andeJuego.salaLink');
  if (duelo && duelo.codigo === c) { return; }
  abrirDuelo();
  $('dm-codigo').value = c;
  try { const err = await unirseCodigo(c); if (err) { errorDuelo(err); } }
  catch (e) { console.error(e); errorDuelo('No se pudo entrar al grupo ' + c + '. Revisá tu conexión.'); }
}

/* ---------------- Panel privado (?panel=1) ---------------- */
async function abrirPanel() {
  if (quitarTop) { quitarTop(); quitarTop = null; }
  mostrar('p-panel');
  const num = $('pn-num');
  num.innerHTML = '';
  num.append(el('div', null, 'Cargando…'));
  try {
    const [lista, total, reps] = await Promise.all([traerJugadores(true), ranking.contarJugadores(), ranking.listarReportes().catch(function () { return []; })]);
    const ahora = Date.now();
    const partidas = Object.keys(totales).reduce(function (n, k) { return n + (totales[k].partidas || 0); }, 0);
    num.innerHTML = '';
    [[miles(total), 'inscriptas'], [miles(lista.filter(function (j) { return j.ultimo && ahora - j.ultimo < 86400000; }).length), 'activas 24 h'],
      [miles(lista.filter(function (j) { return j.ultimo && ahora - j.ultimo < 7 * 86400000; }).length), 'activas 7 días'], [miles(partidas), 'partidas con ranking'],
      [miles(lista.reduce(function (n, j) { return n + Object.keys(j.cats || {}).reduce(function (m, k) { return m + (j.cats[k].v || 0); }, 0); }, 0)), 'respuestas'],
      [String(reps.length), 'reportes']].forEach(function (x) { const d = el('div'); d.append(el('b', null, x[0]), el('small', null, x[1])); num.append(d); });
    barras($('pn-puestos'), PUESTOS.map(function (p) { const t = totales[p.id] || {}; return [p.icono + ' ' + p.corto, t.partidas || 0, plural(t.jugadores || 0, 'jugador', 'jugadores')]; }));
    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - i);
      const d1 = d0.getTime() + 86400000;
      dias.push([d0.toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric' }), lista.filter(function (j) { return j.ultimo >= d0.getTime() && j.ultimo < d1; }).length]);
    }
    const cd = $('pn-dias'), mx = Math.max.apply(null, dias.map(function (x) { return x[1]; }).concat([1]));
    cd.innerHTML = '';
    dias.forEach(function (x) { const c = el('div', 'pn-dia'); const b = el('i'); b.style.height = Math.round(x[1] / mx * 100) + '%'; c.append(el('b', null, String(x[1])), b, el('small', null, x[0])); cd.append(c); });
    cd.append(el('p', 'ayuda', 'Última actividad de cada persona por día.'));
    const ul = $('pn-reportes');
    ul.innerHTML = '';
    $('pn-rep-n').textContent = '(' + reps.length + ')';
    const MOT = { respuesta: 'Respuesta incorrecta', redaccion: 'Redacción confusa', fuente: 'Fuente', otro: 'Otro' };
    if (!reps.length) { ul.append(el('li', 'vacio', 'Sin reportes por ahora.')); }
    reps.forEach(function (r) {
      const q = POR_ID[r.preg], li = el('li');
      li.append(el('b', null, MOT[r.motivo] || r.motivo), el('small', null, ' · ' + r.nombre + ' · ' + haceTxt(r.creado) + ' · ' + r.preg),
        el('div', 'q', q ? q.texto : '(pregunta no encontrada)'), el('div', 'a', q ? '✔ ' + q.ops[0] : ''));
      ul.append(li);
    });
    barras($('pn-banco'), Object.keys(CATEGORIAS).map(function (k) { return [CATEGORIAS[k].icono + ' ' + CATEGORIAS[k].n, (POR_CAT[k] || []).length, '']; }));
  } catch (e) { console.error(e); num.innerHTML = ''; num.append(el('div', null, 'No se pudo cargar: ' + e.message)); }
}
function barras(caja, filas) {
  const mx = Math.max.apply(null, filas.map(function (f) { return f[1]; }).concat([1]));
  caja.innerHTML = '';
  filas.forEach(function (f) {
    const r = el('div', 'pn-barra'), b = el('i');
    b.style.width = Math.round(f[1] / mx * 100) + '%';
    r.append(el('span', null, f[0]), el('span', 'pn-b'), el('b', null, miles(f[1]) + (f[2] ? ' · ' + f[2] : '')));
    r.children[1].append(b);
    caja.append(r);
  });
}

/* ---------------- Duelos y grupos de estudio (2 a 10 personas) ---------------- */
/*
 * Un grupo es una sala que se mantiene entre rondas. El anfitrión elige temario, cantidad de preguntas,
 * tiempo y modo; cada ronda sale con preguntas nuevas. Cada miembro puede cambiar su respuesta hasta
 * tocar «Listo». Al revelar, la tabla del grupo se reacomoda con animación y se pueden mandar reacciones.
 */
const DUELO_PREG = 10;
const DUELO_TIEMPO = 45;
const REACCIONES = ['👏', '🔥', '😅', '🤯', '💡'];
let duelo = null;

function cfgSala(sala) {
  const c = (sala && sala.config) || {};
  return { puesto: c.puesto || (sala && sala.puesto) || puestoActual().id, n: c.n || DUELO_PREG, tiempo: c.tiempo || DUELO_TIEMPO, modo: c.modo || 'mixto' };
}
function abrirDuelo() {
  $('dm-puesto').textContent = 'El anfitrión elige el temario, la cantidad de preguntas y el tiempo. Invitá desde «En línea» o pasá el link.';
  $('dm-error').hidden = true;
  $('dm-codigo').value = '';
  $('dm-modo').textContent = ranking.modo === 'firebase'
    ? 'Cada persona entra desde su propio celular. El grupo sigue armado entre rondas.'
    : 'Modo de prueba: los grupos solo funcionan entre pestañas de este navegador.';
  renderMisGrupos();
  mostrar('p-duelo');
}
// Elige preguntas del temario. Con «pesos» (modo repaso) salen más de las áreas que más les cuestan.
function preguntasDuelo(pid, n, pesos) {
  const p = puestoPorId(pid) || puestoActual();
  const cats = mezclar(p.cats), usadas = new Set(), ids = [];
  for (let i = 0; i < (n || DUELO_PREG); i++) {
    let k = cats[i % cats.length];
    if (pesos) {
      const tot = p.cats.reduce(function (a, c) { return a + (pesos[c] || 0); }, 0);
      let r = Math.random() * tot;
      for (const c of p.cats) { r -= pesos[c] || 0; if (r <= 0) { k = c; break; } }
    }
    const pool = (POR_CAT[k] || []).filter(function (q) { return !usadas.has(q.id); });
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (q) { usadas.add(q.id); ids.push(q.id); }
  }
  return mezclar(ids);
}
// Promedio de aciertos por área de los miembros (los perfiles privados no aportan datos).
async function pesosDelGrupo(sala, pid) {
  const p = puestoPorId(pid), suma = {};
  for (const id of Object.keys(sala.jugadores || {})) {
    let d = null;
    try { d = id === ranking.miIdSala() ? { cats: prog.cats } : await ranking.leerPerfilDe(id); } catch (e) { d = null; }
    const cats = (d && !d.privado && d.cats) || {};
    p.cats.forEach(function (k) { const s = cats[k]; if (s && s.v) { suma[k] = suma[k] || { v: 0, a: 0 }; suma[k].v += s.v; suma[k].a += s.a; } });
  }
  const pesos = {};
  p.cats.forEach(function (k) { const s = suma[k]; const acc = s && s.v >= 3 ? s.a / s.v : 0.5; pesos[k] = Math.pow(1 - acc, 2) + 0.05; });
  return pesos;
}
function errorDuelo(t) { const e = $('dm-error'); e.textContent = t; e.hidden = false; }
async function crearGrupo() {
  const p = puestoActual();
  const codigo = await ranking.crearSala(jugador.nombre, p.id, preguntasDuelo(p.id, DUELO_PREG), identidadPropia());
  entrarSala(codigo);
  return codigo;
}
async function crearSalaDuelo() {
  const b = $('btn-crear-sala');
  b.disabled = true; b.textContent = 'Creando grupo…';
  try { await crearGrupo(); }
  catch (e) { console.error(e); errorDuelo('No se pudo crear el grupo. Revisá tu conexión.'); }
  finally { b.disabled = false; b.textContent = 'Crear grupo'; }
}
async function unirseCodigo(codigo) {
  const r = await ranking.unirseSala(codigo, jugador.nombre, identidadPropia());
  if (r.error) { return r.error; }
  entrarSala(codigo);
  return null;
}
async function unirseSalaDuelo(ev) {
  ev.preventDefault();
  const codigo = $('dm-codigo').value.trim().toUpperCase();
  if (codigo.length !== 4) { errorDuelo('El código tiene 4 caracteres.'); return; }
  const bu = ev.target.querySelector('button[type=submit]');
  bu.disabled = true; bu.textContent = 'Entrando…';
  try { const err = await unirseCodigo(codigo); if (err) { errorDuelo(err); } }
  catch (e) { console.error(e); errorDuelo('No se pudo entrar al grupo. Revisá el código y tu conexión.'); }
  finally { bu.disabled = false; bu.textContent = 'Unirme'; }
}
function entrarSala(codigo, reconexion) {
  limpiarDuelo(true);
  sessionStorage.setItem('andeJuego.salaActual', codigo);
  duelo = { codigo: codigo, sala: null, quitar: null, vistaKey: '', reveladoKey: '', sel: null, listo: false, reloj: null, hostTimer: null,
    deltas: {}, cerradoRonda: 0, verSala: false, ronda: null, invitaciones: {}, reacVistas: {}, explicados: {}, reconexion: !!reconexion };
  duelo.quitar = ranking.escucharSala(codigo, alCambiarSala);
}
function limpiarDuelo(silencioso) {
  if (!duelo) { return; }
  if (duelo.quitar) { duelo.quitar(); }
  sessionStorage.removeItem('andeJuego.salaActual');
  Object.keys(duelo.invitaciones || {}).forEach(function (id) {
    const inv = duelo.invitaciones[id];
    if (inv.quitar) { inv.quitar(); }
    clearTimeout(inv.timer);
    if (inv.estado === 'pendiente') { ranking.responderInvitacion(id, 'cancelada').catch(function (e) { console.error(e); }); }
  });
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); }
  clearTimeout(duelo.hostTimer);
  duelo = null;
  if (!silencioso) { presenciaPorPantalla(); }
}
function siguienteAnfitrion(sala) {
  const yo = ranking.miIdSala();
  const otros = jugadoresSala(sala).filter(function (j) { return j.id !== yo; });
  return otros.length ? otros[0].id : null;
}
async function salirDuelo(sinPreguntar) {
  if (!duelo) { irInicio(); return; }
  if (!sinPreguntar && duelo.sala && duelo.sala.estado === 'jugando' && !confirm('¿Salir del grupo en medio de la ronda?')) { return; }
  const codigo = duelo.codigo, sala = duelo.sala;
  limpiarDuelo();
  try { await ranking.salirSala(codigo, sala ? siguienteAnfitrion(sala) : null); } catch (e) { console.error(e); }
  irInicio();
}
function soyHost() { return duelo && duelo.sala && duelo.sala.host === ranking.miIdSala(); }
function jugadoresSala(sala) {
  return Object.keys(sala.jugadores || {}).map(function (id) { return Object.assign({ id: id }, sala.jugadores[id]); })
    .sort(function (a, b) { return a.orden - b.orden; });
}
function nombres(lista) {
  const n = lista.map(function (j) { return j.nombre; });
  return n.length <= 1 ? (n[0] || '') : n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
}
function alCambiarSala(sala) {
  if (!duelo) { return; }
  const reconexion = duelo.reconexion;
  duelo.reconexion = false;
  if (!sala || !sala.jugadores || !sala.jugadores[ranking.miIdSala()]) {
    limpiarDuelo();
    if (reconexion) { if (!$('p-sala').hidden || !$('p-dfin').hidden || !$('p-dpreg').hidden) { irInicio(); } return; }
    aviso(!sala ? 'El grupo ya no existe.' : 'Ya no formás parte del grupo.'); irInicio(); return;
  }
  const antes = duelo.sala;
  duelo.sala = sala;
  if (antes && antes.host !== sala.host && sala.host === ranking.miIdSala()) { aviso('👑 Ahora sos el anfitrión del grupo'); }
  if (duelo.ronda !== sala.ronda) { duelo.ronda = sala.ronda; duelo.verSala = false; }
  if (sala.estado === 'jugando') { renderDueloPregunta(); }
  else if (sala.estado === 'fin' && !duelo.verSala) { renderDueloFin(); }
  else { renderSala(); }
}

/* ----- Sala ----- */
function anfitrionAusente(sala) {
  if (!sala.jugadores[sala.host]) { return true; }
  const p = enLinea.find(function (j) { return j.id === sala.host; });
  return !p || Date.now() - p.ultimo > 120000;
}
function renderSala() {
  const sala = duelo.sala, jug = jugadoresSala(sala), cfg = cfgSala(sala), host = soyHost();
  const marc = sala.marcador || {};
  $('ds-codigo').textContent = sala.codigo;
  $('ds-cuenta').textContent = '(' + jug.length + ' de ' + 10 + ')';
  const ul = $('ds-jugadores');
  ul.innerHTML = '';
  jug.forEach(function (j) {
    const li = el('li'), av = el('span', 'avatar chico');
    pintarAvatar(av, j.nombre, j);
    li.append(av, el('span', null, j.nombre + (j.id === ranking.miIdSala() ? ' (vos)' : '')));
    if (j.id === sala.host) { li.append(el('small', 'insignia', 'anfitrión')); }
    if (marc[j.id] && marc[j.id].pts) { li.append(el('small', 'pts-acum', miles(marc[j.id].pts) + ' pts')); }
    ul.append(li);
  });
  if (jug.length < 3) { ul.append(el('li', 'libre', 'Invitá hasta ' + (10 - jug.length) + ' personas más')); }
  // Opciones (solo el anfitrión las cambia)
  const sp = $('ds-op-puesto');
  if (!sp.options.length) { PUESTOS.forEach(function (p) { const o = el('option', null, p.icono + ' ' + p.n); o.value = p.id; sp.append(o); }); }
  sp.value = cfg.puesto; $('ds-op-n').value = String(cfg.n); $('ds-op-t').value = String(cfg.tiempo); $('ds-op-modo').value = cfg.modo;
  ['ds-op-puesto', 'ds-op-n', 'ds-op-t', 'ds-op-modo'].forEach(function (id) { $(id).disabled = !host; });
  $('ds-opciones-ayuda').textContent = host ? 'Vos elegís cómo es la ronda.' : 'Las elige el anfitrión.';
  const b = $('btn-sala-empezar');
  b.hidden = !host;
  b.disabled = jug.length < 2;
  b.textContent = (sala.ronda || 0) > 0 ? '🔁 Empezar la ronda ' + ((sala.ronda || 0) + 1) : '¡Empezar!';
  $('btn-sala-tomar').hidden = host || !anfitrionAusente(sala);
  const anfitrion = jug.find(function (j) { return j.id === sala.host; });
  $('ds-espera').textContent = host
    ? (jug.length < 2 ? 'Esperando que se una al menos una persona más…' : '¡Listos! Empezá cuando estén todos.')
    : 'Esperando que ' + (anfitrion ? anfitrion.nombre : 'el anfitrión') + ' empiece la ronda…';
  pintarInvitado();
  if (!$('ds-invitar-caja').hidden) { renderInvitarLista(); }
  mostrar('p-sala');
}
function cambiarOpcion() {
  if (!soyHost()) { return; }
  const c = { puesto: $('ds-op-puesto').value, n: parseInt($('ds-op-n').value, 10), tiempo: parseInt($('ds-op-t').value, 10), modo: $('ds-op-modo').value };
  ranking.actualizarSala(duelo.codigo, { config: c }).catch(function (e) { console.error(e); aviso('No se pudo guardar la opción.'); });
}
async function empezarRonda(boton) {
  if (!soyHost()) { return; }
  const sala = duelo.sala, cfg = cfgSala(sala);
  if (jugadoresSala(sala).length < 2) { aviso('Hace falta al menos una persona más.'); return; }
  if (boton) { boton.disabled = true; }
  try {
    let pesos = null;
    if (cfg.modo === 'repaso') { try { pesos = await pesosDelGrupo(sala, cfg.puesto); } catch (e) { pesos = null; } }
    await ranking.actualizarSala(duelo.codigo, {
      estado: 'jugando', idx: 0, fase: 'pregunta', preguntas: preguntasDuelo(cfg.puesto, cfg.n, pesos),
      respuestas: {}, reacciones: {}, ronda: (sala.ronda || 0) + 1, puesto: cfg.puesto
    });
  } catch (e) { console.error(e); aviso('No se pudo empezar la ronda. Revisá tu conexión.'); }
  finally { if (boton) { boton.disabled = false; } }
}
function tomarControl() {
  ranking.tomarAnfitrion(duelo.codigo).then(function () { aviso('👑 Tomaste el control del grupo'); })
    .catch(function () { aviso('El anfitrión sigue conectado: todavía no se puede tomar el control.'); });
}

/* ----- Invitar ----- */
function renderInvitarLista() {
  const ul = $('ds-invitar-lista'), sala = duelo && duelo.sala;
  if (!ul || !sala) { return; }
  ul.innerHTML = '';
  const ahora = Date.now();
  const lista = enLinea.filter(function (j) { return !sala.jugadores[j.id] && ahora - j.ultimo < EN_LINEA_SEG * 1000; })
    .sort(function (a, b) { return (esFavorito(b.id) ? 1 : 0) - (esFavorito(a.id) ? 1 : 0); });
  if (!lista.length) { ul.append(el('li', 'vacio', 'No hay nadie más en línea ahora. Pasales el link por WhatsApp.')); return; }
  lista.forEach(function (j) {
    const li = el('li'), punto = el('span', 'av-punto'), av = el('span', 'avatar chico');
    pintarAvatar(av, j.nombre, j); punto.append(av);
    const nom = el('span', 'nom'), txt = el('span', 'txt');
    if (esFavorito(j.id)) { txt.append(el('span', 'fav', '★')); }
    txt.append(document.createTextNode(j.nombre), el('small', null, j.ocupado ? 'jugando' : (j.desafios === false ? 'no recibe desafíos' : 'disponible')));
    nom.append(txt);
    li.append(punto, nom);
    const yaInv = Object.keys(duelo.invitaciones).some(function (id) { return duelo.invitaciones[id].para === j.id && duelo.invitaciones[id].estado === 'pendiente'; });
    if (j.ocupado || j.desafios === false) { li.append(el('span', 'estado', j.ocupado ? '🎮' : '🔕')); }
    else if (yaInv) { li.append(el('span', 'estado', '⏳ invitado')); }
    else { const b = el('button', 'btn primario', 'Invitar'); b.type = 'button'; b.addEventListener('click', function () { desafiar(j, b); }); li.append(b); }
    ul.append(li);
  });
}
function invitarSala() {
  if (!duelo) { return; }
  const url = location.origin + location.pathname + '?sala=' + duelo.codigo;
  const txt = '⚔️ ¡Sumate a mi grupo de estudio en «Camino a la libertad»! Entrá con este link (código ' + duelo.codigo + '): ';
  if (navigator.share) { navigator.share({ title: 'Grupo · Camino a la libertad', text: txt, url: url }).catch(function () {}); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt + url), '_blank', 'noopener');
}

/* ----- Mis grupos ----- */
function renderMisGrupos() {
  const gs = perfilCfg().grupos || [], ul = $('dm-grupos');
  $('dm-grupos-caja').hidden = !gs.length;
  ul.innerHTML = '';
  gs.forEach(function (g, i) {
    const li = el('li');
    const t = el('div', 'mg-txt'); t.append(el('b', null, g.nombre), el('small', null, g.miembros.map(function (m) { return m.nombre; }).join(', ')));
    const b = el('button', 'btn primario', 'Invitar a todos'); b.type = 'button';
    b.addEventListener('click', function () { invitarGrupo(g, b); });
    const x = el('button', 'link', 'Borrar'); x.type = 'button';
    x.addEventListener('click', function () { if (confirm('¿Borrar «' + g.nombre + '» de tus grupos?')) { gs.splice(i, 1); guardarProg(); renderMisGrupos(); } });
    li.append(t, b, x);
    ul.append(li);
  });
}
function guardarGrupo() {
  if (!duelo || !duelo.sala) { return; }
  const yo = ranking.miIdSala();
  const miembros = jugadoresSala(duelo.sala).filter(function (j) { return j.id !== yo; }).map(function (j) { return { id: j.id, nombre: j.nombre }; });
  if (!miembros.length) { aviso('Todavía no hay nadie más en el grupo.'); return; }
  const nombre = (prompt('¿Cómo se llama este grupo?', 'Grupo de estudio') || '').trim().slice(0, 30);
  if (!nombre) { return; }
  const pf = perfilCfg();
  pf.grupos = (pf.grupos || []).filter(function (g) { return g.nombre !== nombre; });
  pf.grupos.unshift({ nombre: nombre, miembros: miembros, creado: Date.now() });
  pf.grupos = pf.grupos.slice(0, 10);
  guardarProg();
  aviso('💾 Grupo «' + nombre + '» guardado');
}
async function invitarGrupo(g, b) {
  b.disabled = true;
  try {
    if (!duelo) { await crearGrupo(); }
    const ahora = Date.now();
    let enviados = 0;
    const faltan = [];
    for (const m of g.miembros) {
      const j = enLinea.find(function (x) { return x.id === m.id && ahora - x.ultimo < EN_LINEA_SEG * 1000 && !x.ocupado && x.desafios !== false; });
      if (j) { await enviarInvitacion(j); enviados += 1; } else { faltan.push(m.nombre); }
    }
    aviso(enviados ? '📨 Invitaciones enviadas: ' + enviados + (faltan.length ? ' · no están en línea: ' + faltan.join(', ') : '') : 'Nadie del grupo está en línea ahora. Pasales el link.');
  } catch (e) { console.error(e); aviso('No se pudieron enviar las invitaciones.'); }
  finally { b.disabled = false; }
}

/* ----- Pregunta, «Listo» y revelación ----- */
function puntosDuelo(sala, hasta) {
  const t = {};
  jugadoresSala(sala).forEach(function (j) { t[j.id] = { pts: 0, ok: 0 }; });
  Object.keys(sala.respuestas || {}).forEach(function (i) {
    if (hasta != null && Number(i) > hasta) { return; }
    const r = sala.respuestas[i];
    Object.keys(r).forEach(function (id) { if (t[id]) { t[id].pts += r[id].pts || 0; if (r[id].ok) { t[id].ok += 1; } } });
  });
  return t;
}
function renderDueloPregunta() {
  const sala = duelo.sala, idx = sala.idx, q = POR_ID[(sala.preguntas || [])[idx]];
  if (!q) { return; }
  const cfg = cfgSala(sala), yo = ranking.miIdSala(), jug = jugadoresSala(sala);
  const resp = (sala.respuestas && sala.respuestas[idx]) || {};
  const key = sala.ronda + ':' + idx;

  if (duelo.vistaKey !== key) {
    duelo.vistaKey = key;
    duelo.sel = null;
    duelo.listo = !!resp[yo];
    const c = CATEGORIAS[q.cat], banda = $('dp-cat');
    banda.innerHTML = '';
    banda.style.setProperty('--c', c.color);
    banda.append(el('span', 'ic', c.icono), document.createTextNode(c.n));
    $('dp-texto').textContent = q.texto;
    pintarFigura('dp-fig', q);
    const caja = $('dp-opciones');
    caja.innerHTML = '';
    mezclar(q.ops).forEach(function (txt, i) {
      const b = el('button', 'op');
      b.type = 'button';
      b.dataset.ok = String(txt === q.ops[0]);
      b.dataset.txt = txt;
      b.append(el('span', 'letra', LETRAS[i]), el('span', null, txt));
      b.disabled = duelo.listo;
      b.addEventListener('click', function () { elegirDuelo(b); });
      caja.append(b);
    });
    const bl = $('btn-dp-listo');
    bl.hidden = duelo.listo; bl.disabled = true; bl.textContent = '✓ Listo';
    $('dp-ayuda').hidden = duelo.listo;
    $('dp-revela').hidden = true;
    mostrar('p-dpreg');
    if (!duelo.listo) { relojDuelo(q, key, cfg.tiempo); } else { $('dp-reloj').hidden = true; }
    if (soyHost()) {
      clearTimeout(duelo.hostTimer);
      duelo.hostTimer = setTimeout(function () {
        if (duelo && duelo.sala.ronda + ':' + duelo.sala.idx === key && duelo.sala.fase === 'pregunta') { ranking.actualizarSala(duelo.codigo, { fase: 'revelar' }); }
      }, (cfg.tiempo + 3) * 1000);
    }
  }

  const tot = puntosDuelo(sala);
  const m = $('dp-marcador');
  m.innerHTML = '';
  m.append(el('span', 'prog', '⚔️ Ronda ' + (sala.ronda || 1) + ' · ' + (idx + 1) + ' de ' + sala.preguntas.length), el('span', 'pts', miles((tot[yo] || { pts: 0 }).pts)));

  const est = $('dp-estado');
  est.innerHTML = '';
  jug.forEach(function (j) {
    const chip = el('span', 'jug-chip' + (resp[j.id] ? ' listo' : '')), av = el('span', 'avatar mini');
    pintarAvatar(av, j.nombre, j);
    chip.append(av, el('span', null, j.nombre), el('b', null, resp[j.id] ? '✓' : '…'));
    est.append(chip);
  });

  if (sala.fase === 'pregunta') {
    if (soyHost() && jug.every(function (j) { return resp[j.id]; })) { ranking.actualizarSala(duelo.codigo, { fase: 'revelar' }); }
  } else if (sala.fase === 'revelar') {
    if (duelo.reveladoKey !== key) { duelo.reveladoKey = key; revelarDuelo(q, resp, jug, idx); }
    mostrarReacciones(sala, idx);
  }
}
function relojDuelo(q, key, tiempo) {
  const caja = $('dp-reloj'), barra = $('dp-barra');
  caja.hidden = false;
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); }
  const t0 = performance.now();
  duelo.reloj = { restante: tiempo, total: tiempo, raf: 0, ultimoTic: tiempo };
  (function cuadro(t) {
    if (!duelo || !duelo.reloj || duelo.vistaKey !== key) { return; }
    const rest = Math.max(0, tiempo - (t - t0) / 1000);
    duelo.reloj.restante = rest;
    barra.style.transform = 'scaleX(' + (rest / tiempo) + ')';
    barra.className = 'reloj-barra' + (rest < 6 ? ' poco' : rest < 14 ? ' medio' : '');
    if (rest < 5 && Math.ceil(rest) < duelo.reloj.ultimoTic) { duelo.reloj.ultimoTic = Math.ceil(rest); Sonido.tick(); }
    if (rest <= 0) { confirmarDuelo(q, true); return; }
    duelo.reloj.raf = requestAnimationFrame(cuadro);
  })(t0);
}
// Elegir (y cambiar) la respuesta antes de confirmar.
function elegirDuelo(b) {
  if (!duelo || duelo.listo) { return; }
  duelo.sel = b.dataset.txt;
  Array.from($('dp-opciones').children).forEach(function (x) { x.classList.toggle('elegida', x === b); });
  $('btn-dp-listo').disabled = false;
  vibrar(12);
}
function confirmarDuelo(q, porTiempo) {
  if (!duelo || duelo.listo) { return; }
  q = q || POR_ID[duelo.sala.preguntas[duelo.sala.idx]];
  const idx = duelo.sala.idx;
  duelo.listo = true;
  const rest = duelo.reloj ? duelo.reloj.restante : 0, total = duelo.reloj ? duelo.reloj.total : DUELO_TIEMPO;
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); duelo.reloj = null; }
  $('dp-reloj').hidden = true;
  Array.from($('dp-opciones').children).forEach(function (b) { b.disabled = true; });
  $('btn-dp-listo').hidden = true;
  $('dp-ayuda').hidden = true;
  const ok = duelo.sel != null && duelo.sel === q.ops[0];
  registrarRespuesta(q, ok);
  const dl = duelo.deltas[q.cat] || (duelo.deltas[q.cat] = { v: 0, a: 0 });
  dl.v += 1; if (ok) { dl.a += 1; }
  vibrar(30);
  const pts = ok ? 100 + (porTiempo ? 0 : Math.round(rest / total * 50)) : 0;
  ranking.responderSala(duelo.codigo, idx, { op: duelo.sel, ok: ok, pts: pts }).catch(function (e) { console.error(e); });
}

// Tabla del grupo con animación: cada fila se desliza desde su posición anterior.
function tablaAnimada(ol, filas) {
  const antes = {};
  Array.from(ol.children).forEach(function (li, i) { antes[li.dataset.id] = i; });
  ol.innerHTML = '';
  filas.forEach(function (f, i) {
    const li = el('li', f.yo ? 'yo' : null), av = el('span', 'avatar mini');
    li.dataset.id = f.id;
    pintarAvatar(av, f.nombre, f.ident);
    li.append(el('span', 'tg-pos', String(i + 1)), av, el('span', 'tg-nom', f.nombre), el('span', 'tg-pts', miles(f.pts)));
    if (f.delta) { li.append(el('span', 'tg-delta', '+' + f.delta)); }
    ol.append(li);
  });
  requestAnimationFrame(function () {
    Array.from(ol.children).forEach(function (li, i) {
      const a = antes[li.dataset.id];
      if (a == null) { li.classList.add('nueva'); return; }
      if (a !== i) {
        const h = li.offsetHeight + 6;
        li.style.transition = 'none';
        li.style.transform = 'translateY(' + ((a - i) * h) + 'px)';
        li.classList.add(a > i ? 'sube' : 'baja');
        requestAnimationFrame(function () { li.style.transition = 'transform .7s cubic-bezier(.2, .8, .2, 1)'; li.style.transform = ''; });
      }
    });
  });
}
function revelarDuelo(q, resp, jug, idx) {
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); duelo.reloj = null; }
  $('dp-reloj').hidden = true;
  $('btn-dp-listo').hidden = true;
  $('dp-ayuda').hidden = true;
  clearTimeout(duelo.hostTimer);
  const yo = ranking.miIdSala(), mia = resp[yo];
  Array.from($('dp-opciones').children).forEach(function (b) {
    b.disabled = true;
    b.classList.remove('elegida');
    if (b.dataset.ok === 'true') { b.classList.add('correcta'); }
    else if (mia && b.dataset.txt === mia.op) { b.classList.add('incorrecta'); }
    else { b.classList.add('apagada'); }
  });
  const okMio = !!(mia && mia.ok);
  if (okMio) { Sonido.ok(); } else { Sonido.mal(); }
  $('dp-titulo').textContent = okMio ? '¡Correcto! +' + mia.pts : (mia && mia.op ? 'Incorrecto' : '⏰ Sin respuesta');
  $('dp-revela').classList.toggle('mal', !okMio);

  const acertaron = jug.filter(function (j) { return resp[j.id] && resp[j.id].ok; });
  const fallaron = jug.filter(function (j) { return !(resp[j.id] && resp[j.id].ok); });
  const ex = $('dp-explica');
  ex.innerHTML = '';
  if (acertaron.length && fallaron.length) {
    ex.className = 'explica';
    ex.append(el('b', null, '🧑‍🏫 ' + nombres(acertaron) + (acertaron.length > 1 ? ' acertaron' : ' acertó') + ': '),
      document.createTextNode((acertaron.length > 1 ? 'explíquenle' : 'explicale') + ' a ' + nombres(fallaron) + ' por qué la respuesta es «' + q.ops[0] + '».'));
    const yoAcerte = acertaron.some(function (j) { return j.id === yo; });
    ex.append(el('p', 'tu-rol', yoAcerte ? '👉 Te toca explicar. Usá la explicación de abajo como guía.' : '👉 Pedí que te expliquen antes de seguir.'));
    if (yoAcerte && !duelo.explicados[duelo.sala.ronda + ':' + idx]) {
      duelo.explicados[duelo.sala.ronda + ':' + idx] = true;
      prog.explicador = (prog.explicador || 0) + 1; guardarProg();
    }
  } else if (acertaron.length) {
    ex.className = 'explica bien';
    ex.append(el('b', null, '🎉 ¡Todos acertaron!'));
  } else {
    ex.className = 'explica nadie';
    ex.append(el('b', null, '📖 Nadie acertó: '), document.createTextNode('lean juntos la explicación y la fuente.'));
  }

  // Reacciones
  const rb = $('dp-reacciones');
  rb.innerHTML = '';
  REACCIONES.forEach(function (e) {
    const b = el('button', 'reac', e); b.type = 'button';
    b.setAttribute('aria-label', 'Reaccionar con ' + e);
    b.addEventListener('click', function () {
      Array.from(rb.children).forEach(function (x) { x.classList.toggle('mia', x === b); });
      ranking.reaccionar(duelo.codigo, idx, e).catch(function (err) { console.error(err); });
    });
    rb.append(b);
  });

  // Tabla del grupo animada
  const tot = puntosDuelo(duelo.sala, idx);
  const filas = jug.map(function (j) { return { id: j.id, nombre: j.nombre, ident: j, pts: tot[j.id].pts, delta: resp[j.id] && resp[j.id].pts ? resp[j.id].pts : 0, yo: j.id === yo }; })
    .sort(function (a, b) { return b.pts - a.pts; });
  tablaAnimada($('dp-tabla'), filas);

  $('dp-exp').textContent = q.exp;
  const f = citar(q.fuente), fuente = $('dp-fuente');
  fuente.textContent = 'Fuente: ' + f.texto + ' ';
  if (f.url) { const a = el('a', null, 'Ver fuente'); a.href = f.url; a.target = '_blank'; a.rel = 'noopener'; fuente.append(a); }
  $('dp-revela').querySelector('[data-reportar]').dataset.preg = q.id;

  const ultima = idx >= duelo.sala.preguntas.length - 1;
  const host = soyHost();
  $('btn-dp-sig').hidden = !host;
  $('btn-dp-sig').textContent = ultima ? 'Ver resultados de la ronda' : 'Siguiente pregunta';
  const anf = jug.find(function (j) { return j.id === duelo.sala.host; });
  $('dp-esperando').hidden = host;
  $('dp-esperando').textContent = 'Cuando terminen de explicar, ' + (anf ? anf.nombre : 'el anfitrión') + ' pasa a la siguiente.';
  $('dp-revela').hidden = false;
  setTimeout(function () { $('dp-revela').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
}
function mostrarReacciones(sala, idx) {
  const r = (sala.reacciones && sala.reacciones[idx]) || {}, capa = $('dp-flotantes');
  Object.keys(r).forEach(function (id) {
    const clave = sala.ronda + ':' + idx + ':' + id + ':' + r[id];
    if (duelo.reacVistas[clave]) { return; }
    duelo.reacVistas[clave] = true;
    const j = sala.jugadores[id];
    const f = el('span', 'flota');
    f.append(el('b', null, r[id]), el('small', null, j ? j.nombre : ''));
    f.style.left = (10 + Math.random() * 75) + '%';
    capa.append(f);
    setTimeout(function () { f.remove(); }, 2600);
  });
}
async function siguienteDuelo() {
  if (!soyHost()) { return; }
  const sala = duelo.sala;
  $('btn-dp-sig').hidden = true;
  try {
    if (sala.idx >= sala.preguntas.length - 1) {
      // Fin de la ronda: se suma al acumulado del grupo.
      const tot = puntosDuelo(sala), marc = Object.assign({}, sala.marcador || {});
      const max = Math.max.apply(null, Object.keys(tot).map(function (k) { return tot[k].pts; }).concat([0]));
      Object.keys(tot).forEach(function (id) {
        const m = marc[id] || { pts: 0, rondas: 0 };
        marc[id] = { pts: (m.pts || 0) + tot[id].pts, rondas: (m.rondas || 0) + (max > 0 && tot[id].pts === max ? 1 : 0), nombre: sala.jugadores[id].nombre };
      });
      await ranking.actualizarSala(duelo.codigo, { estado: 'fin', marcador: marc });
    } else {
      await ranking.actualizarSala(duelo.codigo, { idx: sala.idx + 1, fase: 'pregunta' });
    }
  } catch (e) { console.error(e); $('btn-dp-sig').hidden = false; aviso('No se pudo avanzar. Probá de nuevo.'); }
}

/* ----- Fin de la ronda ----- */
function renderDueloFin() {
  const sala = duelo.sala, yo = ranking.miIdSala(), jug = jugadoresSala(sala), tot = puntosDuelo(sala);
  const orden = jug.slice().sort(function (a, b) { return tot[b.id].pts - tot[a.id].pts || tot[b.id].ok - tot[a.id].ok; });
  const max = orden.length ? tot[orden[0].id].pts : 0;
  const ganadores = orden.filter(function (j) { return tot[j.id].pts === max; });
  $('df-titulo').textContent = ganadores.length > 1 ? '¡Empate entre ' + nombres(ganadores) + '!' : '¡Ganó ' + (ganadores[0] ? ganadores[0].nombre : '') + '!';
  $('df-sub').textContent = 'Ronda ' + (sala.ronda || 1) + ' · ' + plural(jug.length, 'jugador', 'jugadores');
  const podio = $('df-podio');
  podio.innerHTML = '';
  orden.forEach(function (j, i) {
    const li = el('li', j.id === yo ? 'yo' : null), av = el('span', 'avatar chico');
    pintarAvatar(av, j.nombre, j);
    li.append(el('span', 'pos', ['🥇', '🥈', '🥉'][i] || String(i + 1)), av,
      el('span', 'nom', j.nombre), el('span', 'pts', miles(tot[j.id].pts)), el('small', null, tot[j.id].ok + '/' + sala.preguntas.length));
    podio.append(li);
  });
  // Acumulado de todas las rondas
  const marc = sala.marcador || {};
  const acum = jug.map(function (j) { const m = marc[j.id] || {}; return { id: j.id, nombre: j.nombre, ident: j, pts: m.pts || 0, delta: 0, yo: j.id === yo, rondas: m.rondas || 0 }; })
    .sort(function (a, b) { return b.pts - a.pts; });
  $('df-total-caja').hidden = (sala.ronda || 1) < 2;
  if ((sala.ronda || 1) >= 2) {
    tablaAnimada($('df-total'), acum);
    Array.from($('df-total').children).forEach(function (li, i) { if (acum[i].rondas) { li.append(el('span', 'tg-delta', '🏆 ' + acum[i].rondas)); } });
  }
  const lista = $('df-repaso');
  lista.innerHTML = '';
  sala.preguntas.forEach(function (id, i) {
    const q = POR_ID[id], r = (sala.respuestas && sala.respuestas[i]) || {};
    const ok = jug.filter(function (j) { return r[j.id] && r[j.id].ok; });
    const mal = jug.filter(function (j) { return !(r[j.id] && r[j.id].ok); });
    if (!q || !mal.length) { return; }
    const li = el('li');
    li.append(el('div', 'q', q.texto), el('div', 'a', '✔ ' + q.ops[0]),
      el('div', 'tu', ok.length ? '🧑‍🏫 ' + nombres(ok) + ' → le explica a ' + nombres(mal) : '📖 Nadie acertó: repásenla juntos'),
      el('div', 'e', q.exp));
    lista.append(li);
  });
  $('df-repaso-caja').hidden = !lista.children.length;
  const host = soyHost();
  $('btn-df-otra').hidden = !host;
  $('df-espera').textContent = host ? '' : 'El grupo sigue armado: esperá que el anfitrión empiece otra ronda o salí cuando quieras.';

  if (duelo.cerradoRonda !== sala.ronda) {
    duelo.cerradoRonda = sala.ronda;
    const gano = tot[yo] && tot[yo].pts === max && max > 0;
    if (gano) { confeti(160); Sonido.fin(); prog.rondasGanadas = (prog.rondasGanadas || 0) + 1; }
    if (jug.length >= 3) { prog.grupos = (prog.grupos || 0) + 1; }
    actualizarRacha();
    prog.duelos = prog.duelos || { jugados: 0, ganados: 0 };
    prog.duelos.jugados += 1; if (gano) { prog.duelos.ganados += 1; }
    guardarProg();
    setTimeout(revisarLogros, 400);
    const deltas = duelo.deltas;
    duelo.deltas = {};
    ranking.guardarStats(jugador.nombre, deltas, prog.mejorRacha || 0, { duelo: { gano: gano }, privado: !!perfilCfg().privado }).catch(function (e) { console.error(e); });
  }
  mostrar('p-dfin');
}

/* ---------------- En línea ahora y desafíos ---------------- */
/*
 * Cada jugador avisa que está conectado cada 45 s mientras tiene el juego abierto (sin tocar nada).
 * Desde la lista se lo puede desafiar: se crea una sala de duelo y le llega una invitación que
 * puede aceptar o rechazar durante 60 s.
 */
const INV_SEG = 60;
let enLinea = [], quitarLinea = null, quitarInv = null, timerLatido = null, timerLinea = null;
let invActual = null, invTimer = null, ultimoOcupado = null, eventosPresencia = false;

function ocupado() {
  if (duelo) { return true; }
  return ['p-ruleta', 'p-pregunta', 'p-sim', 'p-dpreg'].some(function (id) { return !$(id).hidden; });
}
function latido() {
  if (!jugador || !ranking || !prog) { return; }
  if (perfilCfg().ocultarEnLinea) { ranking.desconectar(); return; }
  ultimoOcupado = ocupado();
  ranking.latido({ nombre: jugador.nombre, puesto: jugador.puesto, ocupado: ultimoOcupado, identidad: identidadPropia(), desafios: !perfilCfg().noDesafios }).catch(function (e) { console.warn('Sin señal de presencia:', e); });
}
function iniciarPresencia() {
  if (timerLatido || !jugador) { return; }
  latido();
  timerLatido = setInterval(function () { if (!document.hidden) { latido(); } }, 45000);
  timerLinea = setInterval(renderEnLinea, 20000);
  quitarLinea = ranking.escucharEnLinea(function (lista) { enLinea = lista; renderEnLinea(); });
  quitarInv = ranking.escucharInvitaciones(recibirInvitaciones);
  if (!eventosPresencia) {
    eventosPresencia = true;
    document.addEventListener('visibilitychange', function () {
      if (!timerLatido) { return; }
      if (document.hidden) { ranking.desconectar(); } else { latido(); }
    });
    window.addEventListener('pagehide', function () { if (timerLatido) { ranking.desconectar(); } });
  }
}
function detenerPresencia() {
  clearInterval(timerLatido); clearInterval(timerLinea);
  timerLatido = null; timerLinea = null;
  if (quitarLinea) { quitarLinea(); quitarLinea = null; }
  if (quitarInv) { quitarInv(); quitarInv = null; }
  cerrarInvitacion();
  if (ranking) { ranking.desconectar(); }
}
// Al cambiar de pantalla se avisa enseguida si pasó a estar jugando o libre.
function presenciaPorPantalla() {
  if (timerLatido && ocupado() !== ultimoOcupado) { latido(); }
}

function renderEnLinea() {
  const ul = $('linea-lista');
  if (!ul || !ranking) { return; }
  const yo = ranking.miIdSala(), ahora = Date.now();
  const lista = enLinea.filter(function (j) { return j.id !== yo && ahora - j.ultimo < EN_LINEA_SEG * 1000; })
    .sort(function (a, b) { return (esFavorito(b.id) ? 1 : 0) - (esFavorito(a.id) ? 1 : 0) || (a.ocupado ? 1 : 0) - (b.ocupado ? 1 : 0) || String(a.nombre).localeCompare(String(b.nombre), 'es'); });
  $('linea-cuenta').textContent = lista.length ? '(' + lista.length + ')' : '';
  ul.innerHTML = '';
  if (!lista.length) {
    ul.append(el('li', 'vacio', 'No hay nadie más en línea ahora. Compartí el link para estudiar en grupo.'));
  }
  lista.slice(0, 20).forEach(function (j) {
    const li = el('li', j.ocupado ? 'ocupado' : null), punto = el('span', 'av-punto'), av = el('span', 'avatar chico');
    pintarAvatar(av, j.nombre, j);
    punto.append(av);
    const p = puestoPorId(j.puesto), nom = el('span', 'nom'), txt = el('span', 'txt');
    if (esFavorito(j.id)) { txt.append(el('span', 'fav', '★')); }
    txt.append(document.createTextNode(j.nombre), el('small', null, (j.nivel ? 'Nv ' + j.nivel + ' · ' : '') + (p ? p.icono + ' ' + p.corto : '') + (j.ocupado ? ' · jugando' : ' · disponible')));
    nom.append(txt);
    nom.style.cursor = 'pointer';
    nom.addEventListener('click', function () { abrirPerfil(j.id, j.nombre); });
    li.append(punto, nom);
    if (j.ocupado) {
      li.append(el('span', 'estado', '🎮 jugando'));
    } else if (j.desafios === false) {
      li.append(el('span', 'estado', '🔕 sin desafíos'));
    } else {
      const b = el('button', 'btn primario', '⚔️ Desafiar');
      b.type = 'button';
      b.addEventListener('click', function () { desafiar(j, b); });
      li.append(b);
    }
    ul.append(li);
  });
  $('linea-pie').textContent = ranking.modo === 'firebase'
    ? 'Aparecés en línea mientras tenés el juego abierto. Si alguien te desafía, te llega un aviso.'
    : 'Modo de prueba: solo se ven las otras pestañas de este navegador.';
}

let timerAviso = null;
function aviso(texto) {
  const a = $('aviso-flotante');
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(function () { a.hidden = true; }, 4000);
}

// Invita a alguien al grupo actual (si no hay grupo, lo crea). Se pueden mandar varias a la vez.
async function enviarInvitacion(j) {
  const codigo = duelo.codigo, cfg = cfgSala(duelo.sala);
  if (duelo.sala && Object.keys(duelo.sala.jugadores || {}).length >= MAX_GRUPO) { aviso('El grupo ya está completo (' + MAX_GRUPO + ').'); return; }
  const id = await ranking.invitar({ deNombre: jugador.nombre, para: j.id, paraNombre: j.nombre, puesto: cfg.puesto, codigo: codigo });
  if (!duelo || duelo.codigo !== codigo) { ranking.responderInvitacion(id, 'cancelada'); return; }
  const inv = { id: id, para: j.id, nombre: j.nombre, estado: 'pendiente', quitar: null, timer: null };
  duelo.invitaciones[id] = inv;
  pintarInvitado();
  inv.quitar = ranking.escucharInvitacion(id, function (d) {
    if (!duelo || duelo.invitaciones[id] !== inv) { return; }
    const est = d ? d.estado : 'cancelada';
    if (est === inv.estado) { return; }
    inv.estado = est;
    clearTimeout(inv.timer);
    if (est === 'aceptada') { aviso('✅ ' + j.nombre + ' aceptó: entra al grupo'); Sonido.ok(); }
    else if (est === 'rechazada') { aviso('🙅 ' + j.nombre + ' no puede ahora'); }
    else if (est === 'cancelada') { aviso('⌛ ' + j.nombre + ' no respondió a tiempo'); }
    if (est !== 'pendiente' && inv.quitar) { inv.quitar(); inv.quitar = null; }
    pintarInvitado();
    if (!$('ds-invitar-caja').hidden) { renderInvitarLista(); }
  });
  inv.timer = setTimeout(function () {
    if (duelo && duelo.invitaciones[id] === inv && inv.estado === 'pendiente') {
      ranking.responderInvitacion(id, 'cancelada').catch(function (e) { console.error(e); });
    }
  }, INV_SEG * 1000);
}
async function desafiar(j, boton) {
  if (duelo && duelo.sala && duelo.sala.estado === 'jugando') { aviso('Esperá a que termine la ronda para invitar.'); return; }
  boton.disabled = true;
  const txt = boton.textContent;
  boton.textContent = 'Enviando…';
  try {
    if (!duelo) { await crearGrupo(); }
    await enviarInvitacion(j);
    if (!$('ds-invitar-caja').hidden) { renderInvitarLista(); }
  } catch (e) {
    console.error(e);
    aviso('No se pudo enviar la invitación. Revisá tu conexión.');
  } finally {
    if (boton.isConnected) { boton.disabled = false; boton.textContent = txt; }
  }
}
function pintarInvitado() {
  const caja = $('ds-invitado');
  const invs = duelo ? Object.keys(duelo.invitaciones).map(function (id) { return duelo.invitaciones[id]; }) : [];
  // Solo se muestran las recientes: pendientes y las que respondieron.
  const vis = invs.slice(-6);
  if (!vis.length) { caja.hidden = true; return; }
  caja.innerHTML = '';
  vis.forEach(function (inv) {
    caja.append(el('div', 'inv-fila ' + inv.estado, {
      pendiente: '⏳ ' + inv.nombre + ': invitación enviada…',
      aceptada: '✅ ' + inv.nombre + ' aceptó',
      rechazada: '🙅 ' + inv.nombre + ' no puede ahora',
      cancelada: '⌛ ' + inv.nombre + ' no respondió'
    }[inv.estado] || inv.nombre));
  });
  caja.hidden = false;
}

function recibirInvitaciones(lista) {
  const ahora = Date.now();
  const vigentes = lista.filter(function (i) { return ahora - i.creado < INV_SEG * 1000; })
    .sort(function (a, b) { return b.creado - a.creado; });
  if (invActual && !vigentes.some(function (i) { return i.id === invActual.id; })) { cerrarInvitacion(); }
  if (!invActual && vigentes.length) { mostrarInvitacion(vigentes[0]); }
}
function mostrarInvitacion(inv) {
  invActual = inv;
  pintarAvatar($('inv-avatar'), inv.deNombre);
  $('inv-titulo').textContent = '⚔️ ' + inv.deNombre + ' te invita a su grupo de estudio';
  const p = puestoPorId(inv.puesto);
  $('inv-sub').textContent = 'Temario de ' + (p ? p.corto : inv.puesto)
    + (duelo ? '. Si aceptás, salís de tu grupo actual.' : ocupado() ? '. Si aceptás, dejás lo que estás jugando.' : '.');
  $('invitacion').hidden = false;
  Sonido.medalla();
  vibrar([120, 80, 120]);
  const restante = Math.max(5000, INV_SEG * 1000 - (Date.now() - inv.creado));
  const barra = $('inv-barra');
  barra.style.transition = 'none';
  barra.style.transform = 'scaleX(1)';
  void barra.offsetWidth;
  barra.style.transition = 'transform ' + restante + 'ms linear';
  barra.style.transform = 'scaleX(0)';
  clearTimeout(invTimer);
  invTimer = setTimeout(cerrarInvitacion, restante);
}
function cerrarInvitacion() {
  clearTimeout(invTimer);
  invActual = null;
  const c = $('invitacion');
  if (c) { c.hidden = true; }
}
async function aceptarInvitacion() {
  const inv = invActual;
  if (!inv) { return; }
  cerrarInvitacion();
  // Deja lo que estaba haciendo.
  if (partida && partida.modo === 'simulacro' && !partida.terminado) { partida.terminado = true; clearInterval(relojSim); }
  detenerReloj();
  dejarTopVivo();
  partida = null;
  if (duelo) {
    if (duelo.codigo === inv.codigo) { ranking.responderInvitacion(inv.id, 'aceptada').catch(function () {}); return; }
    const cod = duelo.codigo, sala = duelo.sala;
    limpiarDuelo(true);
    try { await ranking.salirSala(cod, sala ? siguienteAnfitrion(sala) : null); } catch (e) { console.error(e); }
  }
  try {
    await ranking.responderInvitacion(inv.id, 'aceptada');
    const r = await ranking.unirseSala(inv.codigo, jugador.nombre, identidadPropia());
    if (r.error) { aviso(r.error); irInicio(); return; }
    entrarSala(inv.codigo);
  } catch (e) {
    console.error(e);
    aviso('No se pudo entrar al grupo. Revisá tu conexión.');
    irInicio();
  }
}
function rechazarInvitacion() {
  const inv = invActual;
  cerrarInvitacion();
  if (inv) { ranking.responderInvitacion(inv.id, 'rechazada').catch(function (e) { console.error(e); }); }
}

/* Racha de días seguidos con al menos una partida, práctica o repaso. */
function actualizarRacha() {
  const r = prog.racha || (prog.racha = { dias: 0, ultimo: null });
  const h = hoy();
  if (r.ultimo !== h) {
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    const a = ayer.getFullYear() + '-' + String(ayer.getMonth() + 1).padStart(2, '0') + '-' + String(ayer.getDate()).padStart(2, '0');
    r.dias = r.ultimo === a ? r.dias + 1 : 1;
    r.ultimo = h;
    r.max = Math.max(r.max || 0, r.dias);
    guardarProg();
  }
  return r;
}
function rachaVigente() {
  const r = prog.racha;
  if (!r || !r.ultimo) { return 0; }
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  const a = ayer.getFullYear() + '-' + String(ayer.getMonth() + 1).padStart(2, '0') + '-' + String(ayer.getDate()).padStart(2, '0');
  return r.ultimo === hoy() || r.ultimo === a ? r.dias : 0;
}
async function compartir() {
  if (!partida || !partida.compartir) { return; }
  const url = location.href.split('#')[0];
  try {
    if (navigator.share) { await navigator.share({ title: 'Camino a la libertad', text: partida.compartir, url: url }); return; }
  } catch (e) { if (e && e.name === 'AbortError') { return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(partida.compartir + ' ' + url), '_blank', 'noopener');
}

/* ---------------- Confirmar inscripción en el ranking en línea ---------------- */
/*
 * Jugadores que se registraron antes de activar el ranking en línea (o cuyo guardado falló):
 * se les pide confirmar la inscripción y se suben sus récords y estadísticas guardados en el celular.
 */
const CATS_VALIDAS = ['fund', 'leyes', 'seg', 'med', 'pot', 'dist', 'com', 'est', 'xls', 'fp'];
let inscripcionPend = null;
async function revisarInscripcion() {
  if (!ranking || !(ranking.modo === 'firebase' || ranking.prueba) || !jugador || !prog) { return; }
  if (sessionStorage.getItem('andeJuego.inscripcionLuego')) { return; }
  try {
    const perfil = await ranking.leerPerfil();
    const pendientes = [];
    for (const pid of Object.keys(prog.puestos || {})) {
      const pp = prog.puestos[pid];
      if (!pp || !pp.partidas || !puestoPorId(pid)) { continue; }
      const f = await ranking.leerFila(pid);
      if (!f || (f.mejor || 0) < (pp.mejor || 0)) { pendientes.push({ pid: pid, mejor: pp.mejor || 0 }); }
    }
    const hayStats = Object.keys(prog.cats || {}).length > 0;
    const faltanStats = hayStats && (!perfil || !perfil.cats);
    if (perfil && !pendientes.length && !faltanStats) { return; }
    inscripcionPend = { perfil: perfil, pendientes: pendientes, faltanStats: faltanStats };
    mostrarInscripcion();
  } catch (e) { console.warn('No se pudo revisar la inscripción:', e); }
}
function mostrarInscripcion() {
  const d = $('m-inscripcion'), lista = $('ins-lista');
  $('ins-nombre').value = jugador.nombre;
  $('ins-error').hidden = true;
  lista.innerHTML = '';
  inscripcionPend.pendientes.forEach(function (x) {
    const p = puestoPorId(x.pid);
    lista.append(el('li', null, p.icono + ' ' + p.corto + ': récord de ' + miles(x.mejor) + ' puntos'));
  });
  if (inscripcionPend.faltanStats) { lista.append(el('li', null, '📊 Tus estadísticas por área y tu racha')); }
  if (!lista.children.length) { lista.append(el('li', null, '👤 Tu perfil de jugador')); }
  d.showModal();
}
async function confirmarInscripcion(ev) {
  ev.preventDefault();
  const n = $('ins-nombre').value.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (n.length < 2) { $('ins-error').textContent = 'El nombre tiene que tener al menos 2 letras.'; $('ins-error').hidden = false; return; }
  const b = $('btn-ins-ok');
  b.disabled = true; b.textContent = 'Subiendo tus puntajes…';
  try {
    jugador.nombre = n; guardarJugador();
    await ranking.registrar(n);
    if (inscripcionPend.faltanStats) {
      const cats = {};
      Object.keys(prog.cats).forEach(function (k) { if (CATS_VALIDAS.indexOf(k) !== -1) { cats[k] = { v: prog.cats[k].v || 0, a: prog.cats[k].a || 0 }; } });
      await ranking.actualizarPerfil({ nombre: n, cats: cats, mejorRacha: Math.min(400, prog.mejorRacha || 0) });
    }
    for (const x of inscripcionPend.pendientes) {
      const p = puestoPorId(x.pid);
      let a = 0, v = 0;
      p.cats.forEach(function (k) { const s = prog.cats[k]; if (s) { a += s.a || 0; v += s.v || 0; } });
      await ranking.guardarPartida(n, x.pid, { puntos: x.mejor, aciertos: Math.min(a, v), preguntas: v, deltas: {}, racha: Math.min(15, prog.mejorRacha || 0), mejorRacha: Math.min(400, prog.mejorRacha || 0), identidad: identidadPropia() });
    }
    $('m-inscripcion').close();
    inscripcionPend = null;
    confeti(120);
    irInicio();
    setTimeout(function () { alert('✅ ¡Listo, ' + n + '! Ya estás inscripto en el ranking en línea y tus puntajes quedaron guardados.'); }, 300);
  } catch (e) {
    console.error(e);
    $('ins-error').textContent = 'No se pudo subir ahora (' + (e && e.code ? e.code : 'sin conexión') + '). Tus datos siguen guardados en el celular; probá de nuevo en un momento.';
    $('ins-error').hidden = false;
  } finally {
    b.disabled = false; b.textContent = '✅ Confirmar inscripción';
  }
}

/* ---------------- Arranque ---------------- */
function enlazar() {
  $('btn-jugar').addEventListener('click', function () { iniciarPartida('clasico'); });
  $('btn-repaso').addEventListener('click', function () { iniciarPartida('repaso'); });
  $('btn-entreno').addEventListener('click', function () { iniciarPartida('entreno'); });
  $('btn-pf-entreno').addEventListener('click', function () { iniciarPartida('entreno'); });
  function miPerfil() { abrirPerfil(ranking.miId(), jugador.nombre); }
  $('btn-mi-perfil').addEventListener('click', miPerfil);
  $('btn-perfil-completo').addEventListener('click', miPerfil);
  $('btn-perfil-volver').addEventListener('click', function () { cerrarPerfil(); irInicio(); });
  $('btn-compartir').addEventListener('click', compartir);
  $('f-inscripcion').addEventListener('submit', confirmarInscripcion);
  $('btn-ins-luego').addEventListener('click', function () { sessionStorage.setItem('andeJuego.inscripcionLuego', '1'); $('m-inscripcion').close(); });
  // Duelo
  $('btn-duelo').addEventListener('click', abrirDuelo);
  $('btn-ed-volver').addEventListener('click', function () { abrirPerfil(ranking.miId(), jugador.nombre); });
  $('btn-ed-guardar').addEventListener('click', guardarEditor);
  $('ed-nombre').addEventListener('input', function (e) { if (ed) { ed.nombre = e.target.value.trim() || jugador.nombre; renderEditor(); } });
  $('i-nivel').addEventListener('click', function () { abrirPerfil(ranking.miId(), jugador.nombre); });
  $('i-meta').addEventListener('click', function () { aviso('🎯 Tu meta: ' + (perfilCfg().meta || 20) + ' preguntas por día. Podés cambiarla en Personalizar.'); });
  $('btn-inv-si').addEventListener('click', aceptarInvitacion);
  $('btn-inv-no').addEventListener('click', rechazarInvitacion);
  $('btn-sim').addEventListener('click', iniciarSimulacro);
  $('btn-s-sig').addEventListener('click', siguienteSim);
  $('btn-s-entregar').addEventListener('click', function () {
    const sin = partida ? partida.cola.length - partida.resp.filter(function (r) { return r != null; }).length : 0;
    if (confirm('¿Entregar el examen ahora? ' + (sin ? plural(sin, 'pregunta queda', 'preguntas quedan') + ' en blanco.' : ''))) { terminarSimulacro(false); }
  });
  $('btn-sf-otro').addEventListener('click', iniciarSimulacro);
  $('btn-sf-inicio').addEventListener('click', function () { partida = null; irInicio(); });
  // Avisa antes de cerrar la pestaña en medio de una partida o un simulacro.
  window.addEventListener('beforeunload', function (e) {
    const enJuego = partida && ((partida.modo === 'simulacro' && !partida.terminado) || (partida.modo === 'clasico' && partida.n > 0 && $('p-fin').hidden));
    if (enJuego) { e.preventDefault(); e.returnValue = ''; }
  });
  $('btn-crear-sala').addEventListener('click', crearSalaDuelo);
  $('f-unirse').addEventListener('submit', unirseSalaDuelo);
  $('dm-codigo').addEventListener('input', function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); $('dm-error').hidden = true; });
  $('btn-sala-salir').addEventListener('click', function () { salirDuelo(); });
  $('btn-sala-compartir').addEventListener('click', invitarSala);
  $('btn-sala-invitar').addEventListener('click', function () { $('ds-invitar-caja').hidden = false; renderInvitarLista(); });
  $('btn-invitar-cerrar').addEventListener('click', function () { $('ds-invitar-caja').hidden = true; });
  $('btn-sala-empezar').addEventListener('click', function (e) { empezarRonda(e.currentTarget); });
  $('btn-sala-tomar').addEventListener('click', tomarControl);
  $('btn-sala-guardar').addEventListener('click', guardarGrupo);
  ['ds-op-puesto', 'ds-op-n', 'ds-op-t', 'ds-op-modo'].forEach(function (id) { $(id).addEventListener('change', cambiarOpcion); });
  $('btn-dp-listo').addEventListener('click', function () { confirmarDuelo(null, false); });
  $('btn-dp-sig').addEventListener('click', siguienteDuelo);
  $('btn-df-otra').addEventListener('click', function (e) { empezarRonda(e.currentTarget); });
  $('btn-df-sala').addEventListener('click', function () { if (duelo) { duelo.verSala = true; renderSala(); } });
  $('btn-df-salir').addEventListener('click', function () { salirDuelo(); });
  document.querySelectorAll('[data-reportar]').forEach(function (b) { b.addEventListener('click', function () { abrirReporte(b.dataset.preg); }); });
  document.querySelectorAll('[data-volver]').forEach(function (b) { b.addEventListener('click', irInicio); });
  document.querySelectorAll('#t-orden .tab').forEach(function (t) {
    t.addEventListener('click', function () { ordenTop = t.dataset.o; suscribirTop(puestoActual()); });
  });
  $('btn-practica').addEventListener('click', abrirModalTema);
  $('btn-jugadores').addEventListener('click', abrirJugadores);
  $('pj-buscar').addEventListener('input', renderListaJugadores);
  document.querySelectorAll('#pj-filtro .tab').forEach(function (t) { t.addEventListener('click', function () { filtroJug = t.dataset.f; renderListaJugadores(); }); });
  $('f-reporte').addEventListener('submit', enviarReporte);
  $('btn-rep-no').addEventListener('click', function () { $('m-reporte').close(); });
  $('op-rapido').addEventListener('change', function (e) { perfilCfg().girarRapido = e.target.checked; guardarProg(); });
  $('i-puesto').addEventListener('click', abrirModalPuesto);
  $('btn-ranking').addEventListener('click', abrirModalRanking);
  $('btn-girar').addEventListener('click', girar);
  $('btn-seguir').addEventListener('click', seguir);
  $('btn-volver').addEventListener('click', irInicio);
  $('btn-otra').addEventListener('click', function () {
    if (partida && partida.modo === 'repaso' && pendientes(partida.puesto).length) { iniciarPartida('repaso'); } else { iniciarPartida('clasico'); }
  });
  $('btn-marca').addEventListener('click', function () {
    if (!jugador) { return; }
    if (duelo) {
      if (!confirm('¿Salir del grupo? Podés volver a entrar con el código ' + duelo.codigo + '.')) { return; }
      salirDuelo(true); return;
    }
    if (partida && partida.modo === 'simulacro' && !partida.terminado) {
      if (!confirm('¿Salir del simulacro? Se pierde este intento.')) { return; }
      partida.terminado = true; clearInterval(relojSim);
    }
    if (partida && (partida.actual || !$('p-ruleta').hidden) && !confirm('¿Salir de la partida? Se pierde el puntaje de esta partida.')) { return; }
    detenerReloj(); partida = null; irInicio();
  });
  $('btn-cambiar-jugador').addEventListener('click', async function () {
    if (!confirm('¿Cambiar de jugador? Vas a registrar otro nombre en este dispositivo. El ranking de ' + jugador.nombre + ' queda guardado.')) { return; }
    detenerPresencia();
    try { await ranking.cambiarJugador(); } catch (e) { console.error(e); }
    subirProgreso();
    jugador = null; prog = null; localStorage.removeItem('andeJuego.jugador');
    if (quitarTop) { quitarTop(); quitarTop = null; }
    iniciarRegistro();
  });
  const bs = $('btn-sonido');
  function pintarSonido() { bs.textContent = Sonido.on ? '🔊' : '🔇'; bs.setAttribute('aria-label', Sonido.on ? 'Silenciar sonidos' : 'Activar sonidos'); }
  bs.addEventListener('click', function () { Sonido.on = !Sonido.on; LS.set('andeJuego.sonido', Sonido.on); pintarSonido(); });
  pintarSonido();
  document.addEventListener('keydown', function (e) {
    if ($('p-pregunta').hidden) { return; }
    const i = LETRAS.indexOf(e.key.toUpperCase());
    if (i !== -1 && $('q-feedback').hidden) { const b = $('q-opciones').children[i]; if (b) { responder(b); } }
    else if (e.key === 'Enter' && !$('q-feedback').hidden) { seguir(); }
  });
}

/* ---------------- Celular: instalación, conexión ---------------- */
let avisoInstalar = null;
function prepararMovil() {
  document.addEventListener('visibilitychange', function () { if (document.hidden && timerNube) { subirProgreso(); } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Sin modo sin conexión:', e); });
  }
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); avisoInstalar = e;
    if (!instalada && !LS.get('andeJuego.noInstalar', false)) { $('i-instalar').hidden = false; }
  });
  $('btn-instalar').addEventListener('click', async function () {
    if (!avisoInstalar) { return; }
    avisoInstalar.prompt();
    const r = await avisoInstalar.userChoice;
    avisoInstalar = null; $('i-instalar').hidden = true;
    if (r.outcome !== 'accepted') { LS.set('andeJuego.noInstalar', true); }
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !instalada && !LS.get('andeJuego.vioAvisoIos', false)) {
    $('i-instalar-ios').hidden = false;
    LS.set('andeJuego.vioAvisoIos', true);
  }
  function red() { $('sin-red').hidden = navigator.onLine; }
  window.addEventListener('online', red);
  window.addEventListener('offline', red);
  red();
}

let panelPedido = false;
(async function arrancar() {
  codigoEnLink();
  panelPedido = new URL(location.href).searchParams.get('panel') === '1';
  enlazar();
  prepararMovil();
  aplicarPreferencias();
  ranking = await crearRanking();
  quitarTotales = ranking.escucharTotales(function (t) {
    totales = t;
    if (jugador && !$('p-inicio').hidden) { $('t-totales').textContent = textoTotales(jugador.puesto); }
  });
  if (jugador && jugador.idp) { cargarProg(); }
  await traerProgresoNube();
  if (jugador && jugador.idp && puestoPorId(jugador.puesto)) {
    if (!prog) { cargarProg(); }
    irInicio();
    iniciarPresencia();
    revisarInscripcion().then(function () { setTimeout(mostrarNovedades, 600); });
    publicarPerfil();
    const salaPrev = sessionStorage.getItem('andeJuego.salaActual');
    if (panelPedido) { abrirPanel(); }
    else if (sessionStorage.getItem('andeJuego.salaLink')) { entrarPorLink(); }
    else if (salaPrev) { entrarSala(salaPrev, true); }
  } else {
    jugador = null;
    iniciarRegistro();
  }
})();
