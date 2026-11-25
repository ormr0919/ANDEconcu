/*
 * Ranking, registro de partidas y perfiles públicos.
 *  - Con FIREBASE_CONFIG: Firestore + autenticación anónima, con tops y perfiles en tiempo real.
 *  - Sin configuración: modo local (localStorage), que se actualiza en vivo entre pestañas.
 *
 * Datos en Firestore:
 *   jugadores/{uid}                 { nombre, partidas, ultimo, creado,
 *                                     cats: { fund: { v, a }, … },          ← respuestas y aciertos por área
 *                                     puestos: { lector: { mejor, partidas }, … } }
 *   puestos/{puesto}                { partidas, jugadores }
 *   puestos/{puesto}/ranking/{uid}  { nombre, mejor, partidas, aciertos, preguntas, ultimo }
 *
 * El perfil público solo guarda números agregados. Las recomendaciones personales
 * se calculan en el navegador de cada jugador y no se publican.
 */
import { FIREBASE_CONFIG } from './firebase-config.js?v=4';

const SDK = 'https://www.gstatic.com/firebasejs/11.0.2/';
const TOP_N = 10;

// Con ?local=1 en la dirección se usa el modo local aunque haya Firebase: sirve para probar
// cambios sin tocar la base de datos real.
const FORZAR_LOCAL = new URLSearchParams(location.search).has('local');
export const EN_LINEA_SEG = 90;   // se considera «en línea» a quien dio señales en los últimos 90 s

export async function crearRanking() {
  if (FIREBASE_CONFIG && !FORZAR_LOCAL) {
    try {
      return await rankingFirebase(FIREBASE_CONFIG);
    } catch (e) {
      console.error('No se pudo conectar con Firebase; se usa el ranking local.', e);
      const local = rankingLocal();
      local.errorFirebase = (e && (e.code || e.message)) || 'desconocido';
      return local;
    }
  }
  return rankingLocal();
}

/* ---------------- Firebase ---------------- */
async function rankingFirebase(cfg) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js')
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);

  async function asegurarSesion() {
    if (!auth.currentUser) { await A.signInAnonymously(auth); }
    return auth.currentUser.uid;
  }
  await asegurarSesion();

  function incrementos(deltas) {
    const cats = {};
    Object.keys(deltas || {}).forEach(function (k) {
      cats[k] = { v: F.increment(deltas[k].v), a: F.increment(deltas[k].a) };
    });
    return cats;
  }

  return {
    modo: 'firebase',

    async registrar(nombre) {
      const uid = await asegurarSesion();
      const ref = F.doc(db, 'jugadores', uid);
      const s = await F.getDoc(ref);
      await F.setDoc(ref, s.exists()
        ? { nombre: nombre, ultimo: F.serverTimestamp() }
        : { nombre: nombre, partidas: 0, creado: F.serverTimestamp(), ultimo: F.serverTimestamp() }, { merge: true });
      return uid;
    },

    // Un jugador nuevo en el mismo navegador recibe otra identidad anónima.
    async cambiarJugador() {
      await A.signOut(auth);
      await A.signInAnonymously(auth);
    },

    // r = { puntos, aciertos, preguntas, deltas: { cat: { v, a } } }
    async guardarPartida(nombre, puesto, r) {
      const uid = await asegurarSesion();
      const refRank = F.doc(db, 'puestos', puesto, 'ranking', uid);
      const refPuesto = F.doc(db, 'puestos', puesto);
      const refJug = F.doc(db, 'jugadores', uid);
      let resultado = null;
      await F.runTransaction(db, async function (tx) {
        const s = await tx.get(refRank);
        const p = await tx.get(refPuesto);
        const j = await tx.get(refJug);
        const d = s.exists() ? s.data() : { mejor: 0, partidas: 0, aciertos: 0, preguntas: 0 };
        const fila = {
          nombre: nombre,
          mejor: Math.max(d.mejor || 0, r.puntos),
          partidas: (d.partidas || 0) + 1,
          aciertos: (d.aciertos || 0) + r.aciertos,
          preguntas: (d.preguntas || 0) + r.preguntas,
          racha: Math.max(d.racha || 0, r.racha || 0),
          ultimo: F.serverTimestamp()
        };
        Object.assign(fila, cosmeticos(r.identidad));
        tx.set(refRank, fila);
        const pd = p.exists() ? p.data() : { partidas: 0, jugadores: 0 };
        tx.set(refPuesto, { partidas: (pd.partidas || 0) + 1, jugadores: (pd.jugadores || 0) + (s.exists() ? 0 : 1) });
        const jd = j.exists() ? j.data() : {};
        const puestos = {};
        puestos[puesto] = { mejor: fila.mejor, partidas: fila.partidas };
        const datosJug = {
          nombre: nombre,
          partidas: (jd.partidas || 0) + 1,
          ultimo: F.serverTimestamp(),
          puestos: puestos,
          mejorRacha: Math.max(jd.mejorRacha || 0, r.mejorRacha || 0)
        };
        if (!r.privado && Object.keys(r.deltas || {}).length) { datosJug.cats = incrementos(r.deltas); }
        tx.set(refJug, datosJug, { merge: true });
        resultado = { record: r.puntos > (d.mejor || 0), mejorAnterior: d.mejor || 0 };
      });
      return resultado;
    },

    // Respuestas de práctica y repaso: suman al perfil, no al ranking.
    async guardarStats(nombre, deltas, mejorRacha, extra) {
      if (!Object.keys(deltas || {}).length) { return; }
      const uid = await asegurarSesion();
      const ref = F.doc(db, 'jugadores', uid);
      await F.runTransaction(db, async function (tx) {
        const j = await tx.get(ref);
        const jd = j.exists() ? j.data() : {};
        const datos = { nombre: nombre, ultimo: F.serverTimestamp(), mejorRacha: Math.max(jd.mejorRacha || 0, mejorRacha || 0) };
        if (!(extra && extra.privado)) { datos.cats = incrementos(deltas); }
        if (!j.exists()) { datos.partidas = 0; datos.creado = F.serverTimestamp(); }
        if (extra && extra.duelo) {
          const du = jd.duelos || { jugados: 0, ganados: 0 };
          datos.duelos = { jugados: (du.jugados || 0) + 1, ganados: (du.ganados || 0) + (extra.duelo.gano ? 1 : 0) };
        }
        tx.set(ref, datos, { merge: true });
      });
    },

    // Lectura del estado en la nube, para recuperar lo que no se haya podido subir.
    async leerFila(puesto) {
      const uid = await asegurarSesion();
      const s = await F.getDoc(F.doc(db, 'puestos', puesto, 'ranking', uid));
      return s.exists() ? s.data() : null;
    },
    async leerPerfil() {
      const uid = await asegurarSesion();
      const s = await F.getDoc(F.doc(db, 'jugadores', uid));
      return s.exists() ? s.data() : null;
    },

    // Perfil público: avatar, color, marco, frase, vitrina, insignias, nivel, puestos a los que postula y privacidad.
    async actualizarPerfil(datos) {
      const uid = await asegurarSesion();
      const d = Object.assign({}, datos);
      if (d.borrarCats) { d.cats = F.deleteField(); }
      delete d.borrarCats;
      await F.setDoc(F.doc(db, 'jugadores', uid), d, { merge: true });
    },
    // Cambio de nombre o de aspecto: actualiza el perfil y las filas del ranking que ya existan.
    async actualizarIdentidad(nombre, identidad, puestos) {
      const uid = await asegurarSesion();
      const cos = Object.assign({ nombre: nombre }, cosmeticos(identidad));
      await F.setDoc(F.doc(db, 'jugadores', uid), { nombre: nombre }, { merge: true });
      for (const pid of puestos || []) {
        try { await F.updateDoc(F.doc(db, 'puestos', pid, 'ranking', uid), cos); } catch (e) { /* todavía no jugó ese puesto */ }
      }
    },

    escucharTop(puesto, cb, orden) {
      const q = F.query(F.collection(db, 'puestos', puesto, 'ranking'), F.orderBy(orden || 'mejor', 'desc'), F.limit(TOP_N));
      return F.onSnapshot(q, function (snap) {
        cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }), auth.currentUser && auth.currentUser.uid);
      }, function (e) { console.error(e); cb(null); });
    },

    escucharTotales(cb) {
      return F.onSnapshot(F.collection(db, 'puestos'), function (snap) {
        const t = {};
        snap.docs.forEach(function (d) { t[d.id] = d.data(); });
        cb(t);
      }, function (e) { console.error(e); });
    },

    escucharPerfil(id, cb) {
      return F.onSnapshot(F.doc(db, 'jugadores', id), function (s) {
        cb(s.exists() ? Object.assign({ id: id }, s.data(), { creado: s.data().creado && s.data().creado.toMillis ? s.data().creado.toMillis() : null }) : null);
      }, function (e) { console.error(e); cb(null); });
    },


    /* ----- Memoria: copia privada del progreso en la nube ----- */
    async guardarProgreso(datos) {
      const uid = await asegurarSesion();
      await F.setDoc(F.doc(db, 'progreso', uid), { datos: JSON.stringify(datos), actualizado: F.serverTimestamp() });
    },
    async cargarProgreso() {
      const uid = await asegurarSesion();
      const s = await F.getDoc(F.doc(db, 'progreso', uid));
      if (!s.exists()) { return null; }
      try { return JSON.parse(s.data().datos); } catch (e) { return null; }
    },

    /* ----- Presencia («en línea ahora») e invitaciones de desafío ----- */
    async latido(datos) {
      const uid = await asegurarSesion();
      await F.setDoc(F.doc(db, 'presencia', uid), Object.assign({ nombre: datos.nombre, puesto: datos.puesto, ocupado: !!datos.ocupado, desafios: datos.desafios !== false, ultimo: F.serverTimestamp() }, cosmeticos(datos.identidad)));
    },
    async desconectar() {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (uid) { try { await F.deleteDoc(F.doc(db, 'presencia', uid)); } catch (e) { /* sin conexión */ } }
    },
    escucharEnLinea(cb) {
      const desde = F.Timestamp.fromMillis(Date.now() - 10 * 60000);
      const q = F.query(F.collection(db, 'presencia'), F.where('ultimo', '>', desde), F.orderBy('ultimo', 'desc'), F.limit(60));
      return F.onSnapshot(q, function (snap) {
        cb(snap.docs.map(function (d) { const x = d.data(); return Object.assign({}, x, { id: d.id, ultimo: x.ultimo ? x.ultimo.toMillis() : Date.now() }); }));
      }, function (e) { console.error(e); cb([]); });
    },
    async invitar(datos) {
      const uid = await asegurarSesion();
      const ref = await F.addDoc(F.collection(db, 'invitaciones'), {
        de: uid, deNombre: datos.deNombre, para: datos.para, paraNombre: datos.paraNombre,
        puesto: datos.puesto, codigo: datos.codigo, estado: 'pendiente', creado: F.serverTimestamp()
      });
      return ref.id;
    },
    escucharInvitaciones(cb) {
      const uid = auth.currentUser.uid;
      const q = F.query(F.collection(db, 'invitaciones'), F.where('para', '==', uid), F.where('estado', '==', 'pendiente'));
      return F.onSnapshot(q, function (snap) {
        cb(snap.docs.map(function (d) { const x = d.data(); return Object.assign({ id: d.id }, x, { creado: x.creado ? x.creado.toMillis() : Date.now() }); }));
      }, function (e) { console.error(e); });
    },
    escucharInvitacion(id, cb) {
      return F.onSnapshot(F.doc(db, 'invitaciones', id), function (s) { cb(s.exists() ? s.data() : null); }, function (e) { console.error(e); });
    },
    async responderInvitacion(id, estado) { await F.updateDoc(F.doc(db, 'invitaciones', id), { estado: estado }); },

    /* ----- Salas de duelo (2 a 4 jugadores) ----- */
    miIdSala() { return auth.currentUser && auth.currentUser.uid; },

    async crearSala(nombre, puesto, preguntas, identidad) {
      const uid = await asegurarSesion();
      for (let intento = 0; intento < 6; intento++) {
        const codigo = codigoSala();
        const ref = F.doc(db, 'salas', codigo);
        const s = await F.getDoc(ref);
        if (s.exists()) { continue; }
        const jugadores = {}; jugadores[uid] = Object.assign({ nombre: nombre, orden: 0 }, cosmeticos(identidad));
        await F.setDoc(ref, { codigo: codigo, host: uid, puesto: puesto, preguntas: preguntas, estado: 'espera', idx: 0, fase: 'pregunta', jugadores: jugadores, respuestas: {}, creado: F.serverTimestamp() });
        return codigo;
      }
      throw new Error('No se pudo crear la sala');
    },

    async unirseSala(codigo, nombre, identidad) {
      const uid = await asegurarSesion();
      const ref = F.doc(db, 'salas', codigo);
      return F.runTransaction(db, async function (tx) {
        const s = await tx.get(ref);
        if (!s.exists()) { return { error: 'No existe una sala con ese código.' }; }
        const d = s.data(), ids = Object.keys(d.jugadores || {});
        if (ids.indexOf(uid) !== -1) { return { ok: true }; }
        if (d.estado !== 'espera') { return { error: 'Ese duelo ya empezó.' }; }
        if (ids.length >= 4) { return { error: 'La sala está llena (máximo 4).' }; }
        const c = {}; c['jugadores.' + uid] = Object.assign({ nombre: nombre, orden: ids.length }, cosmeticos(identidad));
        tx.update(ref, c);
        return { ok: true };
      });
    },

    escucharSala(codigo, cb) {
      return F.onSnapshot(F.doc(db, 'salas', codigo), function (s) { cb(s.exists() ? s.data() : null); }, function (e) { console.error(e); cb(null); });
    },

    async actualizarSala(codigo, cambios) { await F.updateDoc(F.doc(db, 'salas', codigo), cambios); },

    async responderSala(codigo, idx, r) {
      const uid = await asegurarSesion();
      const c = {}; c['respuestas.' + idx + '.' + uid] = r;
      await F.updateDoc(F.doc(db, 'salas', codigo), c);
    },

    async salirSala(codigo) {
      const uid = await asegurarSesion();
      const c = {}; c['jugadores.' + uid] = F.deleteField();
      try { await F.updateDoc(F.doc(db, 'salas', codigo), c); } catch (e) { /* ya no existe */ }
    },

    miId() { return auth.currentUser && auth.currentUser.uid; }
  };
}

/* ---------------- Local (sin servidor) ---------------- */
function rankingLocal() {
  const CLAVE = 'andeJuego.rankingLocal';
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel('andeJuego') : null;
  const oyentes = new Set();

  function leer() {
    let d;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    d = d || {};
    d.puestos = d.puestos || {};
    d.jugadores = d.jugadores || {};
    return d;
  }
  function escribir(d) {
    localStorage.setItem(CLAVE, JSON.stringify(d));
    avisar();
    if (canal) { canal.postMessage('cambio'); }
  }
  function avisar() { oyentes.forEach(function (f) { f(); }); }
  if (canal) { canal.onmessage = avisar; }
  window.addEventListener('storage', function (e) { if (e.key === CLAVE) { avisar(); } });

  let miId = localStorage.getItem('andeJuego.idLocal');
  function nuevoId() {
    miId = 'L' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('andeJuego.idLocal', miId);
  }
  if (!miId) { nuevoId(); }
  // Cada pestaña es un jugador distinto en las salas locales, así se puede probar el duelo con dos pestañas.
  let idTab = sessionStorage.getItem('andeJuego.idTab');
  if (!idTab) { idTab = 'T' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('andeJuego.idTab', idTab); }

  function jugadorDe(d, nombre) {
    const j = d.jugadores[miId] || (d.jugadores[miId] = { nombre: nombre, partidas: 0, cats: {}, puestos: {}, creado: Date.now() });
    j.nombre = nombre;
    j.ultimo = Date.now();
    return j;
  }
  function sumar(j, deltas) {
    Object.keys(deltas || {}).forEach(function (k) {
      const c = j.cats[k] || (j.cats[k] = { v: 0, a: 0 });
      c.v += deltas[k].v; c.a += deltas[k].a;
    });
  }
  function escuchar(emitir) {
    oyentes.add(emitir);
    emitir();
    return function () { oyentes.delete(emitir); };
  }

  return {
    modo: 'local',
    prueba: FORZAR_LOCAL,
    async registrar(nombre) { const d = leer(); jugadorDe(d, nombre); escribir(d); return miId; },
    async cambiarJugador() { nuevoId(); },

    async guardarPartida(nombre, puesto, r) {
      const d = leer();
      const p = d.puestos[puesto] || (d.puestos[puesto] = { partidas: 0, jugadores: 0, ranking: {} });
      const prev = p.ranking[miId];
      const fila = {
        nombre: nombre,
        mejor: Math.max(prev ? prev.mejor : 0, r.puntos),
        partidas: (prev ? prev.partidas : 0) + 1,
        aciertos: (prev ? prev.aciertos : 0) + r.aciertos,
        preguntas: (prev ? prev.preguntas : 0) + r.preguntas,
        racha: Math.max(prev ? prev.racha || 0 : 0, r.racha || 0),
        ultimo: Date.now()
      };
      Object.assign(fila, cosmeticos(r.identidad));
      p.ranking[miId] = fila;
      p.partidas += 1;
      if (!prev) { p.jugadores += 1; }
      const j = jugadorDe(d, nombre);
      j.partidas += 1;
      j.puestos[puesto] = { mejor: fila.mejor, partidas: fila.partidas };
      j.mejorRacha = Math.max(j.mejorRacha || 0, r.mejorRacha || 0);
      if (!r.privado) { sumar(j, r.deltas); }
      escribir(d);
      return { record: r.puntos > (prev ? prev.mejor : 0), mejorAnterior: prev ? prev.mejor : 0 };
    },

    async guardarStats(nombre, deltas, mejorRacha, extra) {
      if (!Object.keys(deltas || {}).length) { return; }
      const d = leer();
      const j = jugadorDe(d, nombre);
      if (!(extra && extra.privado)) { sumar(j, deltas); }
      j.mejorRacha = Math.max(j.mejorRacha || 0, mejorRacha || 0);
      if (extra && extra.duelo) {
        j.duelos = j.duelos || { jugados: 0, ganados: 0 };
        j.duelos.jugados += 1; if (extra.duelo.gano) { j.duelos.ganados += 1; }
      }
      escribir(d);
    },

    async leerFila(puesto) { const p = leer().puestos[puesto]; return p && p.ranking[miId] ? p.ranking[miId] : null; },
    async leerPerfil() { return leer().jugadores[miId] || null; },
    async actualizarPerfil(datos) {
      const d = leer(), j = jugadorDe(d, datos.nombre || (d.jugadores[miId] || {}).nombre || 'Jugador');
      const x = Object.assign({}, datos);
      if (x.borrarCats) { delete j.cats; }
      delete x.borrarCats;
      Object.assign(j, x);
      escribir(d);
    },
    async actualizarIdentidad(nombre, identidad, puestos) {
      const d = leer(), cos = Object.assign({ nombre: nombre }, cosmeticos(identidad));
      jugadorDe(d, nombre);
      (puestos || []).forEach(function (pid) { const p = d.puestos[pid]; if (p && p.ranking[miId]) { Object.assign(p.ranking[miId], cos); } });
      escribir(d);
    },

    escucharTop(puesto, cb, orden) {
      const campo = orden || 'mejor';
      return escuchar(function () {
        const p = leer().puestos[puesto];
        const filas = p ? Object.keys(p.ranking).map(function (id) { return Object.assign({ id: id }, p.ranking[id]); }) : [];
        filas.sort(function (a, b) { return (b[campo] || 0) - (a[campo] || 0) || a.ultimo - b.ultimo; });
        cb(filas.slice(0, TOP_N), miId);
      });
    },

    escucharTotales(cb) {
      return escuchar(function () {
        const t = {};
        const ps = leer().puestos;
        Object.keys(ps).forEach(function (k) { t[k] = { partidas: ps[k].partidas, jugadores: ps[k].jugadores }; });
        cb(t);
      });
    },

    escucharPerfil(id, cb) {
      return escuchar(function () {
        const j = leer().jugadores[id];
        cb(j ? Object.assign({ id: id }, j) : null);
      });
    },


    /* ----- Memoria: en modo local, el progreso vive en este navegador. ----- */
    async guardarProgreso() { },
    async cargarProgreso() { return null; },

    /* ----- Presencia e invitaciones en modo local: entre pestañas de este navegador (para probar). ----- */
    async latido(datos) {
      const d = leer();
      d.presencia = d.presencia || {};
      d.presencia[idTab] = Object.assign({ nombre: datos.nombre, puesto: datos.puesto, ocupado: !!datos.ocupado, desafios: datos.desafios !== false, ultimo: Date.now() }, cosmeticos(datos.identidad));
      escribir(d);
    },
    async desconectar() {
      const d = leer();
      if (d.presencia && d.presencia[idTab]) { delete d.presencia[idTab]; escribir(d); }
    },
    escucharEnLinea(cb) {
      return escuchar(function () {
        const pr = leer().presencia || {};
        cb(Object.keys(pr).map(function (id) { return Object.assign({ id: id }, pr[id]); }));
      });
    },
    async invitar(datos) {
      const d = leer();
      d.invitaciones = d.invitaciones || {};
      const id = 'I' + Math.random().toString(36).slice(2, 10);
      d.invitaciones[id] = Object.assign({ de: idTab, estado: 'pendiente', creado: Date.now() }, datos);
      escribir(d);
      return id;
    },
    escucharInvitaciones(cb) {
      return escuchar(function () {
        const inv = leer().invitaciones || {};
        cb(Object.keys(inv).filter(function (id) { return inv[id].para === idTab && inv[id].estado === 'pendiente'; })
          .map(function (id) { return Object.assign({ id: id }, inv[id]); }));
      });
    },
    escucharInvitacion(id, cb) {
      return escuchar(function () { const inv = leer().invitaciones || {}; cb(inv[id] || null); });
    },
    async responderInvitacion(id, estado) {
      const d = leer();
      if (d.invitaciones && d.invitaciones[id]) { d.invitaciones[id].estado = estado; escribir(d); }
    },

    /* ----- Salas de duelo: en modo local funcionan entre pestañas del mismo navegador (para probar). ----- */
    miIdSala() { return idTab; },

    async crearSala(nombre, puesto, preguntas, identidad) {
      const d = leer();
      d.salas = d.salas || {};
      const codigo = codigoSala();
      const jugadores = {}; jugadores[idTab] = Object.assign({ nombre: nombre, orden: 0 }, cosmeticos(identidad));
      d.salas[codigo] = { codigo: codigo, host: idTab, puesto: puesto, preguntas: preguntas, estado: 'espera', idx: 0, fase: 'pregunta', jugadores: jugadores, respuestas: {}, creado: Date.now() };
      escribir(d);
      return codigo;
    },

    async unirseSala(codigo, nombre, identidad) {
      const d = leer(), sala = d.salas && d.salas[codigo];
      if (!sala) { return { error: 'No existe una sala con ese código.' }; }
      const ids = Object.keys(sala.jugadores);
      if (ids.indexOf(idTab) !== -1) { return { ok: true }; }
      if (sala.estado !== 'espera') { return { error: 'Ese duelo ya empezó.' }; }
      if (ids.length >= 4) { return { error: 'La sala está llena (máximo 4).' }; }
      sala.jugadores[idTab] = Object.assign({ nombre: nombre, orden: ids.length }, cosmeticos(identidad));
      escribir(d);
      return { ok: true };
    },

    escucharSala(codigo, cb) {
      return escuchar(function () { const d = leer(); cb(d.salas && d.salas[codigo] ? JSON.parse(JSON.stringify(d.salas[codigo])) : null); });
    },

    async actualizarSala(codigo, cambios) {
      const d = leer(), sala = d.salas && d.salas[codigo];
      if (!sala) { return; }
      Object.keys(cambios).forEach(function (k) { ponerRuta(sala, k, cambios[k]); });
      escribir(d);
    },

    async responderSala(codigo, idx, r) {
      const d = leer(), sala = d.salas && d.salas[codigo];
      if (!sala) { return; }
      ponerRuta(sala, 'respuestas.' + idx + '.' + idTab, r);
      escribir(d);
    },

    async salirSala(codigo) {
      const d = leer(), sala = d.salas && d.salas[codigo];
      if (sala && sala.jugadores[idTab]) { delete sala.jugadores[idTab]; escribir(d); }
    },

    miId() { return miId; }
  };
}

/* ---------------- Utilidades de salas ---------------- */
function codigoSala() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) { c += letras[Math.floor(Math.random() * letras.length)]; }
  return c;
}
function ponerRuta(obj, ruta, valor) {
  const partes = ruta.split('.');
  let o = obj;
  for (let i = 0; i < partes.length - 1; i++) { o = o[partes[i]] = (o[partes[i]] && typeof o[partes[i]] === 'object') ? o[partes[i]] : {}; }
  o[partes[partes.length - 1]] = valor;
}

// Solo los campos visuales que se muestran junto al nombre (ranking, en línea, salas).
function cosmeticos(id) {
  const c = {};
  if (!id) { return c; }
  if (id.avatar) { c.avatar = String(id.avatar).slice(0, 8); }
  if (id.color) { c.color = String(id.color).slice(0, 9); }
  if (id.marco) { c.marco = String(id.marco).slice(0, 10); }
  if (id.nivel) { c.nivel = Math.min(200, Math.max(1, Math.round(id.nivel))); }
  return c;
}
