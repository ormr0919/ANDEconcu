/*
 * Camino a la libertad · trivia de estudio.
 * Flujo: registro (una sola vez) → inicio → ruleta → pregunta → … → fin de partida.
 * Modos: clásico (con ranking), práctica por tema y repaso de errores.
 */
import { CATEGORIAS, PUESTOS, puestoPorId } from './puestos.js?v=3b';
import { CPI_1 } from './preguntas-cpi-1.js?v=3b';
import { CPI_2 } from './preguntas-cpi-2.js?v=3b';
import { ING } from './preguntas-ing.js?v=3b';
import { EXTRA } from './preguntas-extra.js?v=3b';
import { citar } from './fuentes.js?v=3b';
import { crearRanking } from './ranking.js?v=3b';

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
function vibrar(p) { try { if (navigator.vibrate && Sonido.on) { navigator.vibrate(p); } } catch (e) { /* sin vibración */ } }
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
function pintarAvatar(nodo, nombre) { nodo.textContent = iniciales(nombre); nodo.style.setProperty('--av', colorAvatar(nombre)); }

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
const PREGUNTAS = [].concat(CPI_1, CPI_2, ING, EXTRA).map(function (q) {
  return { id: q[0] + '-' + hash(q[2]), cat: q[0], dif: q[1], texto: q[2], ops: q[3], exp: q[4], fuente: q[5] };
});
const POR_CAT = {};
const POR_ID = {};
PREGUNTAS.forEach(function (q) { (POR_CAT[q.cat] = POR_CAT[q.cat] || []).push(q); POR_ID[q.id] = q; });

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
  if (ok) {
    s.a += 1;
    if (s.pend) { s.rep += 1; if (s.rep >= 2) { s.pend = false; s.rep = 0; } }
  } else {
    s.pend = true; s.rep = 0;
  }
  const c = prog.cats[q.cat] || (prog.cats[q.cat] = { v: 0, a: 0 });
  c.v += 1; if (ok) { c.a += 1; }
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
  const pesos = pool.map(function (q) {
    const s = prog.preg[q.id];
    if (!s) { return 3; }
    if (s.pend) { return 5; }
    return s.a < s.v ? 2 : 1;
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
  };
  mostrar('p-registro');
  setTimeout(function () { nombre.focus(); }, 100);
}

/* ---------------- Inicio ---------------- */
function irInicio() {
  const p = puestoActual();
  $('i-nombre').textContent = jugador.nombre;
  pintarAvatar($('i-avatar'), jugador.nombre);
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

  renderDominio(p);
  suscribirTop(p);
  $('pie-modo').textContent = ranking.modo === 'firebase'
    ? 'Ranking en línea: se actualiza en tiempo real.'
    : 'Ranking local de este dispositivo (falta configurar Firebase para el ranking en línea).';
  mostrar('p-inicio');
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
  const nom = el('span', 'nom', f.nombre);
  const pct = f.preguntas ? Math.round(f.aciertos / f.preguntas * 100) : 0;
  nom.append(el('small', null, plural(f.partidas, 'partida', 'partidas') + ' · ' + pct + ' % de aciertos'));
  const valor = orden === 'racha' ? '🔥 ' + (f.racha || 0) : miles(f.mejor);
  li.append(el('span', 'pos', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)), nom, el('span', 'pts', valor));
  return li;
}
function renderTop(lista, filas, miId, orden) {
  lista.innerHTML = '';
  if (filas === null) { lista.append(el('li', 'vacio', 'No se pudo cargar el ranking. Revisá tu conexión.')); return; }
  if (!filas.length) { lista.append(el('li', 'vacio', 'Todavía nadie jugó en este puesto. ¡Sé la primera persona del top!')); return; }
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
    // El perfil propio usa los datos locales (incluye todo lo practicado) y agrega el plan privado.
    renderPerfil({
      nombre: jugador.nombre,
      partidas: Object.keys(prog.puestos).reduce(function (n, k) { return n + prog.puestos[k].partidas; }, 0),
      cats: prog.cats, puestos: prog.puestos, creado: prog.creado || null
    }, true);
  } else {
    $('pf-sub').textContent = 'Cargando…';
    quitarPerfil = ranking.escucharPerfil(id, function (d) {
      if (!d) { $('pf-sub').textContent = 'No se encontró el perfil.'; return; }
      renderPerfil(d, false);
    });
  }
  mostrar('p-perfil');
}
function pintarPerfilBase(nombre, propio) {
  $('pf-nombre').textContent = nombre;
  pintarAvatar($('pf-avatar'), nombre);
  $('pf-stats').innerHTML = '';
  $('pf-puestos').innerHTML = '';
  $('pf-areas').innerHTML = '';
  $('pf-privado').hidden = !propio;
}
function renderPerfil(d, propio) {
  $('pf-nombre').textContent = d.nombre;
  pintarAvatar($('pf-avatar'), d.nombre);
  const cats = d.cats || {};
  const resp = Object.keys(cats).reduce(function (n, k) { return n + (cats[k].v || 0); }, 0);
  const ac = Object.keys(cats).reduce(function (n, k) { return n + (cats[k].a || 0); }, 0);
  const pct = resp ? Math.round(ac / resp * 100) : 0;
  const lvGlobal = nivel({ v: resp, a: ac });
  $('pf-sub').textContent = (propio ? 'Tu perfil · ' : '') + (resp ? lvGlobal.n + ' en general' : 'Todavía sin respuestas');

  const st = $('pf-stats');
  st.innerHTML = '';
  const mr = propio ? Math.max(prog.mejorRacha || 0, d.mejorRacha || 0) : (d.mejorRacha || 0);
  const du = propio ? (prog.duelos || d.duelos) : d.duelos;
  const datos = [[miles(d.partidas || 0), 'partidas con ranking'], [miles(resp), 'respuestas'], [resp ? pct + '%' : '—', 'de aciertos'], ['🔥 ' + mr, 'mejor racha sin errores']];
  if (du && du.jugados) { datos.push(['⚔️ ' + du.ganados + '/' + du.jugados, 'duelos ganados']); }
  if (propio) {
    const sp = (prog.simulacros || {})[puestoActual().id];
    if (sp) { datos.push(['📝 ' + String(sp.mejor).replace('.', ','), 'mejor simulacro (' + puestoActual().corto + ')']); }
  }
  datos.forEach(function (x) {
    const c = el('div'); c.append(el('b', null, x[0]), el('span', null, x[1])); st.append(c);
  });
  if (propio) {
    const c = el('div'); c.append(el('b', null, '📅 ' + rachaVigente()), el('span', null, 'días seguidos estudiando'));
    st.append(c);
  }
  st.style.gridTemplateColumns = '';

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

  // Áreas: en el perfil propio, las del puesto actual; en el ajeno, todas las que respondió.
  const areas = $('pf-areas');
  areas.innerHTML = '';
  const lista = propio
    ? puestoActual().cats.concat(Object.keys(cats).filter(function (k) { return puestoActual().cats.indexOf(k) === -1; }))
    : Object.keys(CATEGORIAS).filter(function (k) { return cats[k] && cats[k].v; });
  if (!lista.length) { areas.append(el('p', 'ayuda', 'Todavía no respondió preguntas.')); }
  lista.forEach(function (k) { areas.append(filaDominio(k, cats[k])); });

  if (propio) { renderPlan(); renderMemoria(); }
  $('pf-memoria').hidden = !propio;
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
  });
  d.showModal();
}
function abrirModalTema() {
  const p = puestoActual(), caja = $('mt-temas'), d = $('m-tema');
  caja.innerHTML = '';
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
  } else {
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
      el('span', 'prog', ({ repaso: '🔁 Repaso', entreno: '🧠 Entreno', practica: '🎯 Práctica' }[partida.modo]) + ' · ' + num + ' de ' + partida.total),
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
  giro += 360 * 5 + ((360 - centro - actual) % 360 + 360) % 360;
  $('ruleta').style.transform = 'rotate(' + giro + 'deg)';
  $('ruleta-msg').textContent = 'Girando…';
  let ticks = 0;
  const tic = setInterval(function () { Sonido.tick(); if (++ticks > 22) { clearInterval(tic); } }, 160);
  setTimeout(function () {
    clearInterval(tic);
    const k = segs[i];
    $('ruleta-msg').textContent = CATEGORIAS[k].icono + ' ' + CATEGORIAS[k].n;
    setTimeout(function () { preguntaDeCategoria(k); }, 700);
  }, 4100);
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
          partida.pleno = true; partida.puntos += BONO_PLENO;
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
      const r = await ranking.guardarPartida(jugador.nombre, p.id, { puntos: partida.puntos, aciertos: partida.aciertos, preguntas: partida.n, deltas: partida.deltas, racha: partida.maxRacha, mejorRacha: prog.mejorRacha });
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
    $('f-emoji').textContent = { repaso: '🔁', entreno: '🧠', practica: '🎯' }[partida.modo];
    $('f-titulo').textContent = { repaso: 'Repaso terminado', entreno: 'Entrenamiento terminado', practica: 'Práctica terminada' }[partida.modo];
    $('f-puntos').textContent = partida.aciertos + '/' + partida.n;
    $('f-sub').textContent = pct + ' % de aciertos · suma a tu perfil, no al ranking';
    $('f-medallas').hidden = true;
    if (pct >= 80) { confeti(100); }
    ranking.guardarStats(jugador.nombre, partida.deltas, prog.mejorRacha).catch(function (e) { console.error(e); });
  }
  $('btn-compartir').hidden = !partida.compartir;

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
  hist.ultimos = hist.ultimos.concat([{ f: Date.now(), nota: nota }]).slice(-10);
  actualizarRacha();
  guardarProg();
  ranking.guardarStats(jugador.nombre, partida.deltas, prog.mejorRacha || 0).catch(function (e) { console.error(e); });

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
}

/* ---------------- Duelo de estudio (2 a 4 personas) ---------------- */
const DUELO_PREG = 10;
const DUELO_TIEMPO = 45;
let duelo = null;   // { codigo, sala, quitar, idxVisto, reveladoIdx, respondido, reloj, hostTimer, deltas, cerrado }

function abrirDuelo() {
  const p = puestoActual();
  $('dm-puesto').textContent = 'Se juega con el temario de ' + p.n + ' (tu puesto actual): ' + DUELO_PREG + ' preguntas de ' + DUELO_TIEMPO + ' segundos. Pasale el código a quienes quieras invitar.';
  $('dm-error').hidden = true;
  $('dm-codigo').value = '';
  $('dm-modo').textContent = ranking.modo === 'firebase'
    ? 'Cada persona entra desde su propio celular con el código.'
    : 'Modo local: el duelo solo funciona entre pestañas de este navegador. Para jugar con otros celulares hay que activar Firebase (ver LEEME).';
  mostrar('p-duelo');
}
function preguntasDuelo(p) {
  const cats = mezclar(p.cats), usadas = new Set(), ids = [];
  for (let i = 0; i < DUELO_PREG; i++) {
    const pool = (POR_CAT[cats[i % cats.length]] || []).filter(function (q) { return !usadas.has(q.id); });
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (q) { usadas.add(q.id); ids.push(q.id); }
  }
  return mezclar(ids);
}
function errorDuelo(t) { const e = $('dm-error'); e.textContent = t; e.hidden = false; }
async function crearSalaDuelo() {
  const b = $('btn-crear-sala');
  b.disabled = true;
  b.textContent = 'Creando sala…';
  try {
    const codigo = await ranking.crearSala(jugador.nombre, puestoActual().id, preguntasDuelo(puestoActual()));
    entrarSala(codigo);
  } catch (e) {
    console.error(e); errorDuelo('No se pudo crear la sala. Revisá tu conexión.');
  } finally { b.disabled = false; b.textContent = 'Crear sala'; }
}
async function unirseSalaDuelo(ev) {
  ev.preventDefault();
  const codigo = $('dm-codigo').value.trim().toUpperCase();
  if (codigo.length !== 4) { errorDuelo('El código tiene 4 caracteres.'); return; }
  const bu = ev.target.querySelector('button[type=submit]');
  bu.disabled = true; bu.textContent = 'Entrando…';
  try {
    const r = await ranking.unirseSala(codigo, jugador.nombre);
    if (r.error) { errorDuelo(r.error); return; }
    entrarSala(codigo);
  } catch (e) { console.error(e); errorDuelo('No se pudo entrar a la sala. Revisá el código y tu conexión.'); }
  finally { bu.disabled = false; bu.textContent = 'Unirme'; }
}
function entrarSala(codigo) {
  limpiarDuelo();
  duelo = { codigo: codigo, sala: null, quitar: null, idxVisto: -1, reveladoIdx: -1, respondido: false, reloj: null, hostTimer: null, deltas: {}, cerrado: false };
  duelo.quitar = ranking.escucharSala(codigo, alCambiarSala);
}
function limpiarDuelo() {
  if (!duelo) { return; }
  if (duelo.quitar) { duelo.quitar(); }
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); }
  clearTimeout(duelo.hostTimer);
  duelo = null;
}
async function salirDuelo() {
  if (duelo && duelo.sala && duelo.sala.estado === 'espera') { try { await ranking.salirSala(duelo.codigo); } catch (e) { console.error(e); } }
  limpiarDuelo();
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
  if (!sala) { limpiarDuelo(); alert('La sala ya no existe.'); irInicio(); return; }
  if (!sala.jugadores || !sala.jugadores[ranking.miIdSala()]) {
    if (sala.estado !== 'espera') { limpiarDuelo(); alert('Ya no formás parte de esta sala.'); irInicio(); return; }
  }
  duelo.sala = sala;
  if (sala.estado === 'espera') { renderSala(); } else if (sala.estado === 'jugando') { renderDueloPregunta(); } else { renderDueloFin(); }
}

function renderSala() {
  const sala = duelo.sala, jug = jugadoresSala(sala), p = puestoPorId(sala.puesto);
  $('ds-codigo').textContent = sala.codigo;
  $('ds-puesto').textContent = 'Temario: ' + (p ? p.n : sala.puesto) + ' · ' + sala.preguntas.length + ' preguntas.';
  $('ds-cuenta').textContent = '(' + jug.length + ' de 4)';
  const ul = $('ds-jugadores');
  ul.innerHTML = '';
  jug.forEach(function (j) {
    const li = el('li'), av = el('span', 'avatar chico');
    pintarAvatar(av, j.nombre);
    li.append(av, el('span', null, j.nombre + (j.id === ranking.miIdSala() ? ' (vos)' : '')));
    if (j.id === sala.host) { li.append(el('small', 'insignia', 'anfitrión')); }
    ul.append(li);
  });
  for (let i = jug.length; i < 4; i++) { ul.append(el('li', 'libre', 'Lugar libre')); }
  const host = soyHost();
  $('btn-sala-empezar').hidden = !host;
  $('btn-sala-empezar').disabled = jug.length < 2;
  const anfitrion = jug.find(function (j) { return j.id === sala.host; });
  $('ds-espera').textContent = host
    ? (jug.length < 2 ? 'Esperando que se una al menos una persona más…' : '¡Listos! Empezá cuando estén todos.')
    : 'Esperando que ' + (anfitrion ? anfitrion.nombre : 'el anfitrión') + ' empiece el duelo…';
  mostrar('p-sala');
}

function puntosDuelo(sala) {
  const t = {};
  jugadoresSala(sala).forEach(function (j) { t[j.id] = { pts: 0, ok: 0 }; });
  Object.keys(sala.respuestas || {}).forEach(function (i) {
    const r = sala.respuestas[i];
    Object.keys(r).forEach(function (id) { if (t[id]) { t[id].pts += r[id].pts || 0; if (r[id].ok) { t[id].ok += 1; } } });
  });
  return t;
}

function renderDueloPregunta() {
  const sala = duelo.sala, idx = sala.idx, q = POR_ID[sala.preguntas[idx]];
  if (!q) { return; }
  const yo = ranking.miIdSala(), jug = jugadoresSala(sala);
  const resp = (sala.respuestas && sala.respuestas[idx]) || {};

  if (duelo.idxVisto !== idx) {
    duelo.idxVisto = idx;
    duelo.respondido = !!resp[yo];
    const c = CATEGORIAS[q.cat], banda = $('dp-cat');
    banda.innerHTML = '';
    banda.style.setProperty('--c', c.color);
    banda.append(el('span', 'ic', c.icono), document.createTextNode(c.n));
    $('dp-texto').textContent = q.texto;
    const caja = $('dp-opciones');
    caja.innerHTML = '';
    mezclar(q.ops).forEach(function (txt, i) {
      const b = el('button', 'op');
      b.type = 'button';
      b.dataset.ok = String(txt === q.ops[0]);
      b.dataset.txt = txt;
      b.append(el('span', 'letra', LETRAS[i]), el('span', null, txt));
      b.disabled = duelo.respondido;
      b.addEventListener('click', function () { responderDuelo(b, q, idx); });
      caja.append(b);
    });
    $('dp-revela').hidden = true;
    mostrar('p-dpreg');
    if (!duelo.respondido) { relojDuelo(q, idx); } else { $('dp-reloj').hidden = true; }
    if (soyHost()) {
      clearTimeout(duelo.hostTimer);
      duelo.hostTimer = setTimeout(function () {
        if (duelo && duelo.sala.idx === idx && duelo.sala.fase === 'pregunta') { ranking.actualizarSala(duelo.codigo, { fase: 'revelar' }); }
      }, (DUELO_TIEMPO + 3) * 1000);
    }
  }

  const tot = puntosDuelo(sala);
  const m = $('dp-marcador');
  m.innerHTML = '';
  m.append(el('span', 'prog', '⚔️ Pregunta ' + (idx + 1) + ' de ' + sala.preguntas.length), el('span', 'pts', miles((tot[yo] || { pts: 0 }).pts)));

  const est = $('dp-estado');
  est.innerHTML = '';
  jug.forEach(function (j) {
    const chip = el('span', 'jug-chip' + (resp[j.id] ? ' listo' : '')), av = el('span', 'avatar mini');
    pintarAvatar(av, j.nombre);
    chip.append(av, el('span', null, j.nombre), el('b', null, resp[j.id] ? '✓' : '…'));
    est.append(chip);
  });

  if (sala.fase === 'pregunta') {
    if (soyHost() && jug.every(function (j) { return resp[j.id]; })) { ranking.actualizarSala(duelo.codigo, { fase: 'revelar' }); }
  } else if (sala.fase === 'revelar' && duelo.reveladoIdx !== idx) {
    duelo.reveladoIdx = idx;
    revelarDuelo(q, resp, jug, idx);
  }
}

function relojDuelo(q, idx) {
  const caja = $('dp-reloj'), barra = $('dp-barra');
  caja.hidden = false;
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); }
  const t0 = performance.now();
  duelo.reloj = { restante: DUELO_TIEMPO, raf: 0, ultimoTic: DUELO_TIEMPO };
  (function cuadro(t) {
    if (!duelo || !duelo.reloj || duelo.idxVisto !== idx) { return; }
    const rest = Math.max(0, DUELO_TIEMPO - (t - t0) / 1000);
    duelo.reloj.restante = rest;
    barra.style.transform = 'scaleX(' + (rest / DUELO_TIEMPO) + ')';
    barra.className = 'reloj-barra' + (rest < 6 ? ' poco' : rest < 14 ? ' medio' : '');
    if (rest < 5 && Math.ceil(rest) < duelo.reloj.ultimoTic) { duelo.reloj.ultimoTic = Math.ceil(rest); Sonido.tick(); }
    if (rest <= 0) { responderDuelo(null, q, idx); return; }
    duelo.reloj.raf = requestAnimationFrame(cuadro);
  })(t0);
}

function responderDuelo(boton, q, idx) {
  if (!duelo || duelo.respondido || duelo.idxVisto !== idx) { return; }
  duelo.respondido = true;
  const rest = duelo.reloj ? duelo.reloj.restante : 0;
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); duelo.reloj = null; }
  $('dp-reloj').hidden = true;
  Array.from($('dp-opciones').children).forEach(function (b) { b.disabled = true; if (b === boton) { b.classList.add('elegida'); } });
  const ok = !!boton && boton.dataset.ok === 'true';
  registrarRespuesta(q, ok);
  const dl = duelo.deltas[q.cat] || (duelo.deltas[q.cat] = { v: 0, a: 0 });
  dl.v += 1; if (ok) { dl.a += 1; }
  vibrar(30);
  const pts = ok ? 100 + Math.round(rest / DUELO_TIEMPO * 50) : 0;
  ranking.responderSala(duelo.codigo, idx, { op: boton ? boton.dataset.txt : null, ok: ok, pts: pts })
    .catch(function (e) { console.error(e); });
}

function revelarDuelo(q, resp, jug, idx) {
  if (duelo.reloj) { cancelAnimationFrame(duelo.reloj.raf); duelo.reloj = null; }
  $('dp-reloj').hidden = true;
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
      document.createTextNode('explicale' + (acertaron.length > 1 ? 'n' : '') + ' a ' + nombres(fallaron) + ' por qué la respuesta es «' + q.ops[0] + '».'));
    const yoAcerte = acertaron.some(function (j) { return j.id === yo; });
    ex.append(el('p', 'tu-rol', yoAcerte ? '👉 Te toca explicar. Usá la explicación de abajo como guía.' : '👉 Pedí que te expliquen antes de seguir.'));
  } else if (acertaron.length) {
    ex.className = 'explica bien';
    ex.append(el('b', null, '🎉 ¡Todos acertaron!'));
  } else {
    ex.className = 'explica nadie';
    ex.append(el('b', null, '📖 Nadie acertó: '), document.createTextNode('lean juntos la explicación y la fuente.'));
  }

  const ul = $('dp-resultados');
  ul.innerHTML = '';
  jug.forEach(function (j) {
    const r = resp[j.id], li = el('li', r && r.ok ? 'ok' : 'no'), av = el('span', 'avatar mini');
    pintarAvatar(av, j.nombre);
    li.append(av, el('span', 'rn', j.nombre), el('span', 'rr', r && r.ok ? '✔ +' + r.pts : (r && r.op ? '✘ «' + r.op + '»' : '⏰ sin respuesta')));
    ul.append(li);
  });
  $('dp-exp').textContent = q.exp;
  const f = citar(q.fuente), fuente = $('dp-fuente');
  fuente.textContent = 'Fuente: ' + f.texto + ' ';
  if (f.url) { const a = el('a', null, 'Ver fuente'); a.href = f.url; a.target = '_blank'; a.rel = 'noopener'; fuente.append(a); }

  const ultima = idx >= duelo.sala.preguntas.length - 1;
  const host = soyHost();
  $('btn-dp-sig').hidden = !host;
  $('btn-dp-sig').textContent = ultima ? 'Ver resultados' : 'Siguiente pregunta';
  const anf = jug.find(function (j) { return j.id === duelo.sala.host; });
  $('dp-esperando').hidden = host;
  $('dp-esperando').textContent = 'Cuando terminen de explicar, ' + (anf ? anf.nombre : 'el anfitrión') + ' pasa a la siguiente.';
  $('dp-revela').hidden = false;
  setTimeout(function () { $('dp-revela').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
}

function siguienteDuelo() {
  if (!soyHost()) { return; }
  const sala = duelo.sala;
  $('btn-dp-sig').hidden = true;
  if (sala.idx >= sala.preguntas.length - 1) { ranking.actualizarSala(duelo.codigo, { estado: 'fin' }); }
  else { ranking.actualizarSala(duelo.codigo, { idx: sala.idx + 1, fase: 'pregunta' }); }
}

function renderDueloFin() {
  const sala = duelo.sala, yo = ranking.miIdSala(), jug = jugadoresSala(sala), tot = puntosDuelo(sala);
  const orden = jug.slice().sort(function (a, b) { return tot[b.id].pts - tot[a.id].pts || tot[b.id].ok - tot[a.id].ok; });
  const max = orden.length ? tot[orden[0].id].pts : 0;
  const ganadores = orden.filter(function (j) { return tot[j.id].pts === max; });
  $('df-titulo').textContent = ganadores.length > 1 ? '¡Empate entre ' + nombres(ganadores) + '!' : '¡Ganó ' + (ganadores[0] ? ganadores[0].nombre : '') + '!';
  const podio = $('df-podio');
  podio.innerHTML = '';
  orden.forEach(function (j, i) {
    const li = el('li', j.id === yo ? 'yo' : null), av = el('span', 'avatar chico');
    pintarAvatar(av, j.nombre);
    li.append(el('span', 'pos', ['🥇', '🥈', '🥉', '4'][i] || String(i + 1)), av,
      el('span', 'nom', j.nombre), el('span', 'pts', miles(tot[j.id].pts)), el('small', null, tot[j.id].ok + '/' + sala.preguntas.length));
    podio.append(li);
  });

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

  if (!duelo.cerrado) {
    duelo.cerrado = true;
    const gano = tot[yo] && tot[yo].pts === max && max > 0;
    if (gano) { confeti(160); Sonido.fin(); }
    actualizarRacha();
    prog.duelos = prog.duelos || { jugados: 0, ganados: 0 };
    prog.duelos.jugados += 1; if (gano) { prog.duelos.ganados += 1; }
    guardarProg();
    ranking.guardarStats(jugador.nombre, duelo.deltas, prog.mejorRacha || 0, { duelo: { gano: gano } }).catch(function (e) { console.error(e); });
  }
  mostrar('p-dfin');
}

function invitarSala() {
  if (!duelo) { return; }
  const txt = '⚔️ ¡Te desafío a un duelo de estudio en «Camino a la libertad»! Entrá y poné el código ' + duelo.codigo + ': ';
  const url = location.href.split('#')[0];
  if (navigator.share) { navigator.share({ title: 'Duelo · Camino a la libertad', text: txt, url: url }).catch(function () {}); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt + url), '_blank', 'noopener');
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
      await ranking.guardarPartida(n, x.pid, { puntos: x.mejor, aciertos: Math.min(a, v), preguntas: v, deltas: {}, racha: Math.min(15, prog.mejorRacha || 0), mejorRacha: Math.min(400, prog.mejorRacha || 0) });
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
  $('btn-sala-salir').addEventListener('click', salirDuelo);
  $('btn-sala-compartir').addEventListener('click', invitarSala);
  $('btn-sala-empezar').addEventListener('click', function () {
    if (!soyHost() || jugadoresSala(duelo.sala).length < 2) { return; }
    $('btn-sala-empezar').disabled = true;
    ranking.actualizarSala(duelo.codigo, { estado: 'jugando', idx: 0, fase: 'pregunta' });
  });
  $('btn-dp-sig').addEventListener('click', siguienteDuelo);
  $('btn-df-otro').addEventListener('click', function () { limpiarDuelo(); abrirDuelo(); });
  $('btn-df-inicio').addEventListener('click', function () { limpiarDuelo(); irInicio(); });
  document.querySelectorAll('[data-volver]').forEach(function (b) { b.addEventListener('click', irInicio); });
  document.querySelectorAll('#t-orden .tab').forEach(function (t) {
    t.addEventListener('click', function () { ordenTop = t.dataset.o; suscribirTop(puestoActual()); });
  });
  $('btn-practica').addEventListener('click', abrirModalTema);
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
      if (duelo.sala && duelo.sala.estado === 'jugando' && !confirm('¿Salir del duelo?')) { return; }
      salirDuelo(); return;
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

(async function arrancar() {
  enlazar();
  prepararMovil();
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
    revisarInscripcion();
  } else {
    jugador = null;
    iniciarRegistro();
  }
})();
