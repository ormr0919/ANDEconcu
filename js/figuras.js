/*
 * Gráficos de apoyo para las preguntas: circuitos, triángulo de potencias, transformador, trifásico,
 * ondas, pinza, planilla de Excel, tablas y diagramas de caja. Todo se dibuja en SVG o HTML, sin imágenes.
 * Las etiquetas que llevan «?» se resaltan: es el dato que hay que calcular.
 */
const TINTA = '#1C1636', GRIS = '#776E92', DUDA = '#E0483A', AZUL = '#3F5BD8', SOL = '#F28A2E';

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function n(v) { return Math.round(v * 10) / 10; }
function texto(x, y, t, o) {
  if (t == null || t === '') { return ''; }
  o = o || {};
  const duda = String(t).indexOf('?') !== -1;
  return '<text x="' + n(x) + '" y="' + n(y) + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.s || 13) + '" font-weight="' + (duda || o.b ? 800 : 600)
    + '" fill="' + (duda ? DUDA : (o.c || TINTA)) + '"' + (o.rot ? ' transform="rotate(' + o.rot + ' ' + n(x) + ' ' + n(y) + ')"' : '') + '>'
    + String(t).split('\n').map(function (l, i) { return i ? '<tspan x="' + n(x) + '" dy="1.2em">' + esc(l) + '</tspan>' : esc(l); }).join('') + '</text>';
}
function linea(x1, y1, x2, y2, o) {
  o = o || {};
  return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + (o.c || TINTA) + '" stroke-width="' + (o.w || 2.2) + '"'
    + (o.d ? ' stroke-dasharray="' + o.d + '"' : '') + ' stroke-linecap="round"/>';
}
function punto(x, y) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="4" fill="' + TINTA + '"/>'; }
function borne(x, y) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="4.5" fill="#fff" stroke="' + TINTA + '" stroke-width="2"/>'; }
function flecha(x1, y1, x2, y2, c) {
  c = c || AZUL;
  const a = Math.atan2(y2 - y1, x2 - x1), L = 9;
  const p1 = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)], p2 = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
  return linea(x1, y1, x2, y2, { c: c, w: 2 }) + '<path d="M' + n(x2) + ' ' + n(y2) + ' L' + n(p1[0]) + ' ' + n(p1[1]) + ' L' + n(p2[0]) + ' ' + n(p2[1]) + ' Z" fill="' + c + '"/>';
}

// Elemento entre dos puntos: resistencia (zigzag), lámpara, carga (caja) o fuente de CA.
function elemento(x1, y1, x2, y2, tipo) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const largo = tipo === 'l' || tipo === 'm' || tipo === 'a' || tipo === 'v' ? 30 : 44, a = (L - largo) / 2;
  const sx = x1 + ux * a, sy = y1 + uy * a, ex = x2 - ux * a, ey = y2 - uy * a, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  let s = linea(x1, y1, sx, sy) + linea(ex, ey, x2, y2);
  if (tipo === 'l') {
    s += '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="15" fill="#FFF6D6" stroke="' + TINTA + '" stroke-width="2.2"/>';
    const k = 10.6;
    s += linea(cx - k * 0.7, cy - k * 0.7, cx + k * 0.7, cy + k * 0.7, { w: 1.8 }) + linea(cx - k * 0.7, cy + k * 0.7, cx + k * 0.7, cy - k * 0.7, { w: 1.8 });
  } else if (tipo === 'c') {
    const w = 44, h = 20;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    s += '<rect x="' + n(cx - w / 2) + '" y="' + n(cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="4" fill="#EEF2FF" stroke="' + TINTA + '" stroke-width="2.2" transform="rotate(' + n(ang) + ' ' + n(cx) + ' ' + n(cy) + ')"/>';
  } else if (tipo === 'a' || tipo === 'v') {
    s += '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="15" fill="#fff" stroke="' + AZUL + '" stroke-width="2.2"/>' + texto(cx, cy + 5, tipo === 'a' ? 'A' : 'V', { s: 14, b: true, c: AZUL });
  } else if (tipo === 'b' || tipo === 'k') {
    // Bobina (4 rizos) o capacitor (dos placas), dibujados en horizontal y girados.
    const ang = Math.atan2(dy, dx) * 180 / Math.PI, h = largo / 2;
    let g = '';
    if (tipo === 'b') {
      let d = 'M' + n(cx - h) + ' ' + n(cy);
      for (let i = 0; i < 4; i++) { d += ' a' + n(h / 4) + ' ' + n(h / 4) + ' 0 0 1 ' + n(h / 2) + ' 0'; }
      g = '<path d="' + d + '" fill="none" stroke="' + TINTA + '" stroke-width="2.4"/>';
    } else {
      g = linea(cx - h, cy, cx - 5, cy) + linea(cx + 5, cy, cx + h, cy) + linea(cx - 5, cy - 14, cx - 5, cy + 14, { w: 3 }) + linea(cx + 5, cy - 14, cx + 5, cy + 14, { w: 3 });
    }
    s += '<g transform="rotate(' + n(ang) + ' ' + n(cx) + ' ' + n(cy) + ')">' + g + '</g>';
  } else if (tipo === 'm') {
    s += '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="15" fill="#fff" stroke="' + TINTA + '" stroke-width="2.2"/>' + texto(cx, cy + 5, 'M', { s: 14, b: true });
  } else {
    let d = 'M' + n(sx) + ' ' + n(sy);
    const picos = 6;
    for (let i = 1; i <= picos; i++) {
      const t = (i - 0.5) / picos, o = (i % 2 ? 1 : -1) * 8;
      d += ' L' + n(sx + ux * largo * t + px * o) + ' ' + n(sy + uy * largo * t + py * o);
    }
    d += ' L' + n(ex) + ' ' + n(ey);
    s += '<path d="' + d + '" fill="none" stroke="' + TINTA + '" stroke-width="2.2" stroke-linejoin="round"/>';
  }
  return s;
}
function tipoDe(e) { return typeof e === 'object' && e ? (e.k || 'r') : 'r'; }
function etiq(e) { return typeof e === 'object' && e ? e.t : e; }

// Fuente sobre un tramo vertical (x fijo, de y1 a y2). Continua: pila; alterna: círculo con «~».
function fuenteV(x, y1, y2, rotulo, ca) {
  const cy = (y1 + y2) / 2;
  let s = '';
  if (ca) {
    s += linea(x, y1, x, cy - 16) + linea(x, cy + 16, x, y2);
    s += '<circle cx="' + x + '" cy="' + cy + '" r="16" fill="#fff" stroke="' + TINTA + '" stroke-width="2.2"/>';
    s += '<path d="M' + (x - 9) + ' ' + cy + ' q4.5 -9 9 0 t9 0" fill="none" stroke="' + TINTA + '" stroke-width="2"/>';
  } else {
    s += linea(x, y1, x, cy - 6) + linea(x, cy + 6, x, y2);
    s += linea(x - 15, cy - 6, x + 15, cy - 6, { w: 3 }) + linea(x - 8, cy + 6, x + 8, cy + 6, { w: 4 });
    s += texto(x + 19, cy - 9, '+', { s: 12, c: GRIS });
  }
  s += texto(x - 22, cy + 5, rotulo, { a: 'end', s: 14, b: true });
  return s;
}
function svg(w, h, cuerpo, alt) {
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(alt || 'Esquema') + '" xmlns="http://www.w3.org/2000/svg" font-family="Bricolage Grotesque, system-ui, sans-serif">' + cuerpo + '</svg>';
}

/* ---- Circuito en serie (también sirve para mallas y divisores) ---- */
function serie(f) {
  const els = f.r || [], X0 = 90, X1 = 300, Y0 = 44, Y1 = 150, k = els.length;
  let s = '';
  if (f.v) { s += fuenteV(X0, Y0, Y1, f.v, f.ca); } else { s += borne(X0, Y0) + borne(X0, Y1) + texto(X0 - 10, (Y0 + Y1) / 2 + 5, f.bornes || 'a – b', { a: 'end' }); }
  // Elementos arriba (hasta 3) y, si hay un cuarto, a la derecha.
  const arriba = els.slice(0, 3), der = f.der || els[3];
  const paso = (X1 - X0) / (arriba.length + 1);
  let xa = X0;
  arriba.forEach(function (e, i) {
    const cx = X0 + paso * (i + 1), med = Math.min(paso * 0.8, 64), x1 = cx - med / 2, x2 = cx + med / 2;
    s += linea(xa, Y0, x1, Y0) + elemento(x1, Y0, x2, Y0, tipoDe(e));
    xa = x2;
    s += texto(cx, Y0 - 16, etiq(e));
    const v = f.vr && f.vr[i];
    if (v) { s += texto(cx, Y0 + 30, v, { c: AZUL }); }
    if (f.med && f.med.en === i) {
      // Voltímetro en paralelo con el elemento i
      const y = Y0 + 46;
      s += linea(x1 + 2, Y0, x1 + 2, y) + linea(x2 - 2, Y0, x2 - 2, y) + linea(x1 + 2, y, cx - 15, y) + linea(cx + 15, y, x2 - 2, y);
      s += '<circle cx="' + n(cx) + '" cy="' + y + '" r="15" fill="#fff" stroke="' + AZUL + '" stroke-width="2.2"/>' + texto(cx, y + 5, 'V', { s: 14, c: AZUL, b: true });
      s += punto(x1 + 2, Y0) + punto(x2 - 2, Y0);
      if (f.med.t) { s += texto((X0 + X1) / 2, Y1 + 28, f.med.t, { c: AZUL }); }
    }
  });
  s += linea(xa, Y0, X1, Y0);
  if (der) {
    s += elemento(X1, Y0, X1, Y1, tipoDe(der)) + texto(X1 + 12, (Y0 + Y1) / 2 + 5, etiq(der), { a: 'start' });
    if (f.vr && f.vr[3]) { s += texto(X1 - 14, (Y0 + Y1) / 2 + 22, f.vr[3], { a: 'end', c: AZUL }); }
  } else { s += linea(X1, Y0, X1, Y1); }
  s += linea(X0, Y1, X1, Y1);
  if (f.i) { s += flecha((X0 + X1) / 2 + 24, Y1, (X0 + X1) / 2 - 18, Y1) + texto((X0 + X1) / 2 + 4, Y1 + 22, f.i, { c: AZUL }); }
  return svg(360, f.med ? 200 : 180, s, f.alt || 'Circuito en serie');
}

/* ---- Circuito en paralelo ---- */
function paralelo(f) {
  const els = f.r || [], X0 = 80, Y0 = 40, Y1 = 160, k = els.length;
  const xs = els.map(function (e, i) { return 160 + i * (k > 3 ? 56 : 82); });
  const XF = xs[xs.length - 1];
  let s = '';
  if (f.v) { s += fuenteV(X0, Y0, Y1, f.v, f.ca); } else { s += borne(X0, Y0) + borne(X0, Y1) + texto(X0 - 10, (Y0 + Y1) / 2 + 5, f.bornes || 'R eq = ?', { a: 'end' }); }
  s += linea(X0, Y0, XF, Y0) + linea(X0, Y1, XF, Y1);
  els.forEach(function (e, i) {
    const x = xs[i];
    s += elemento(x, Y0, x, Y1, tipoDe(e));
    s += texto(x + (tipoDe(e) === 'l' ? 19 : 13), (Y0 + Y1) / 2 + 5, etiq(e), { a: 'start', s: k > 3 ? 12 : 13 });
    if (i < k - 1) { s += punto(x, Y0) + punto(x, Y1); }
    if (f.ir && f.ir[i]) { s += flecha(x, Y0 + 8, x, Y0 + 30) + texto(x - 6, Y0 + 26, f.ir[i], { a: 'end', c: AZUL, s: 12 }); }
  });
  if (f.i) { s += flecha(X0 + 14, Y0, X0 + 58, Y0) + texto(X0 + 36, Y0 - 12, f.i, { c: AZUL }); }
  return svg(Math.max(360, XF + 90), 190, s, f.alt || 'Circuito en paralelo');
}

/* ---- Mixto: un elemento en serie y después un paralelo ---- */
function mixto(f) {
  const X0 = 70, Y0 = 44, Y1 = 160, XN = 200, xs = [222, 300];
  let s = fuenteV(X0, Y0, Y1, f.v, f.ca);
  s += elemento(X0, Y0, XN, Y0, tipoDe(f.s)) + texto((X0 + XN) / 2, Y0 - 16, etiq(f.s));
  s += linea(XN, Y0, xs[1], Y0) + linea(X0, Y1, xs[1], Y1) + punto(xs[0], Y0) + punto(xs[0], Y1);
  (f.p || []).forEach(function (e, i) {
    const x = xs[i];
    s += elemento(x, Y0, x, Y1, tipoDe(e)) + texto(x + 13, (Y0 + Y1) / 2 + 5, etiq(e), { a: 'start' });
    if (f.ir && f.ir[i]) { s += flecha(x, Y0 + 8, x, Y0 + 30) + texto(x - 6, Y0 + 26, f.ir[i], { a: 'end', c: AZUL, s: 12 }); }
  });
  if (f.i) { s += flecha(X0 + 30, Y1, X0 + 8, Y1) + texto(X0 + 40, Y1 + 22, f.i, { c: AZUL }); }
  return svg(380, 190, s, 'Circuito mixto');
}

/* ---- Nodo (ley de corrientes de Kirchhoff) ---- */
function nodo(f) {
  const cx = 180, cy = 95, R = 120;
  let s = '';
  const ent = f.ent || [], sal = f.sal || [];
  function rayos(lista, entra) {
    lista.forEach(function (t, i) {
      const k = lista.length, ang = (entra ? 180 : 0) + (k === 1 ? 0 : (i - (k - 1) / 2) * (k > 2 ? 38 : 50));
      const r = ang * Math.PI / 180, x = cx + R * Math.cos(r), y = cy + R * 0.62 * Math.sin(r);
      s += linea(x, y, cx, cy, { c: TINTA });
      const mx = cx + (x - cx) * 0.55, my = cy + (y - cy) * 0.55, mx2 = cx + (x - cx) * 0.3, my2 = cy + (y - cy) * 0.3;
      s += entra ? flecha(mx, my, mx2, my2) : flecha(mx2, my2, mx, my);
      s += texto(x + (entra ? -6 : 6), y + 5, t, { a: entra ? 'end' : 'start', s: 14 });
    });
  }
  rayos(ent, true); rayos(sal, false);
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + TINTA + '"/>';
  s += texto(cx, 182, 'Entran ← → Salen', { c: GRIS, s: 12 });
  return svg(360, 190, s, 'Nodo con corrientes que entran y salen');
}

/* ---- Triángulo de potencias ---- */
function potencias(f) {
  const ax = 60, ay = 150, bx = 270, cy = 46;
  let s = '<path d="M' + ax + ' ' + ay + ' L' + bx + ' ' + ay + ' L' + bx + ' ' + cy + ' Z" fill="#FFF3E4" stroke="none"/>';
  s += flecha(ax, ay, bx, ay, SOL) + flecha(bx, ay, bx, cy, AZUL) + flecha(ax, ay, bx, cy, TINTA);
  s += '<path d="M' + (ax + 38) + ' ' + ay + ' A38 38 0 0 0 ' + n(ax + 38 * Math.cos(0.46)) + ' ' + n(ay - 38 * Math.sin(0.46)) + '" fill="none" stroke="' + GRIS + '" stroke-width="1.6"/>';
  s += texto(ax + 50, ay - 6, 'φ', { c: GRIS, s: 14 });
  s += '<rect x="' + (bx - 12) + '" y="' + (ay - 12) + '" width="12" height="12" fill="none" stroke="' + GRIS + '" stroke-width="1.4"/>';
  s += texto((ax + bx) / 2, ay + 24, 'P (activa) ' + (f.p || ''), { c: TINTA });
  s += texto(bx + 10, (ay + cy) / 2 - 4, 'Q (reactiva)', { a: 'start', s: 12, c: AZUL }) + texto(bx + 10, (ay + cy) / 2 + 13, f.q || '', { a: 'start', c: AZUL });
  s += texto((ax + bx) / 2 - 24, (ay + cy) / 2 - 12, 'S (aparente) ' + (f.s || ''), { rot: -26 });
  if (f.fp) { s += texto(ax, 30, 'fp = cos φ = ' + f.fp, { a: 'start' }); }
  return svg(380, 180, s, 'Triángulo de potencias');
}

/* ---- Transformador ---- */
function bobina(x, y0, vueltas, lado) {
  let d = 'M' + x + ' ' + y0;
  for (let i = 0; i < vueltas; i++) { d += ' a11 11 0 0 ' + (lado > 0 ? 1 : 0) + ' 0 22'; }
  return '<path d="' + d + '" fill="none" stroke="' + TINTA + '" stroke-width="2.4"/>';
}
function trafo(f) {
  const xl = 150, xr = 210, y0 = 40, v = 5, y1 = y0 + 22 * v;
  let s = bobina(xl, y0, v, 1) + bobina(xr, y0, v, -1);
  s += linea(xl - 70, y0, xl, y0) + linea(xl - 70, y1, xl, y1) + linea(xr, y0, xr + 70, y0) + linea(xr, y1, xr + 70, y1);
  s += linea(176, y0 - 6, 176, y1 + 6, { w: 3 }) + linea(184, y0 - 6, 184, y1 + 6, { w: 3 });
  s += borne(xl - 70, y0) + borne(xl - 70, y1) + borne(xr + 70, y0) + borne(xr + 70, y1);
  s += texto(xl - 40, y0 - 14, 'Primario', { c: GRIS, s: 12 }) + texto(xr + 40, y0 - 14, 'Secundario', { c: GRIS, s: 12 });
  const izq = [f.v1, f.i1, f.n1].filter(Boolean), der = [f.v2, f.i2, f.n2].filter(Boolean);
  izq.forEach(function (t, i) { s += texto(xl - 80, y0 + 42 + i * 22, t, { a: 'end', s: 14 }); });
  der.forEach(function (t, i) { s += texto(xr + 80, y0 + 42 + i * 22, t, { a: 'start', s: 14 }); });
  if (f.s) { s += texto(180, y1 + 30, f.s, { s: 14 }); }
  return svg(380, f.s ? 200 : 180, s, 'Transformador');
}

/* ---- Trifásico: estrella o triángulo ---- */
function trifasico(f) {
  let s = '';
  const L1 = [180, 30], L2 = [90, 168], L3 = [270, 168], C = [180, 118];
  if (f.con === 'triangulo') {
    s += elemento(L1[0], L1[1], L2[0], L2[1], 'r') + elemento(L2[0], L2[1], L3[0], L3[1], 'r') + elemento(L3[0], L3[1], L1[0], L1[1], 'r');
    s += punto(L1[0], L1[1]) + punto(L2[0], L2[1]) + punto(L3[0], L3[1]);
    if (f.rama) { s += texto(180, 196, f.rama, { c: AZUL }); }
  } else {
    s += elemento(L1[0], L1[1], C[0], C[1], 'r') + elemento(L2[0], L2[1], C[0], C[1], 'r') + elemento(L3[0], L3[1], C[0], C[1], 'r');
    s += punto(C[0], C[1]) + linea(C[0], C[1], C[0], 196, { d: '5 4' }) + texto(C[0] + 8, 192, 'N', { a: 'start', c: GRIS });
    if (f.rama) { s += texto(300, 112, f.rama, { a: 'start', c: AZUL }); }
  }
  s += texto(L1[0], L1[1] - 10, 'L1', { b: true }) + texto(L2[0] - 12, L2[1] + 5, 'L2', { a: 'end', b: true }) + texto(L3[0] + 12, L3[1] + 5, 'L3', { a: 'start', b: true });
  if (f.linea) { s += texto(20, 30, f.linea, { a: 'start' }); }
  s += texto(20, 50, f.con === 'triangulo' ? 'Conexión triángulo (Δ)' : 'Conexión estrella (Y)', { a: 'start', c: GRIS, s: 12 });
  return svg(420, 205, s, f.con === 'triangulo' ? 'Carga trifásica en triángulo' : 'Carga trifásica en estrella');
}

/* ---- Onda senoidal (una o tres fases) ---- */
function senoide(f) {
  const x0 = 46, x1 = 340, y0 = 100, A = 58, ciclos = f.ciclos || 1.5, W = (x1 - x0) / ciclos;
  let s = linea(x0, y0, x1 + 6, y0, { c: GRIS, w: 1.4 }) + linea(x0, 20, x0, 180, { c: GRIS, w: 1.4 });
  s += texto(x1 + 6, y0 + 18, 't', { c: GRIS, a: 'end' });
  const cols = [TINTA, SOL, AZUL];
  for (let k = 0; k < (f.fases || 1); k++) {
    let d = '';
    for (let i = 0; i <= 160; i++) {
      const x = x0 + (x1 - x0) * i / 160, ang = 2 * Math.PI * (x - x0) / W - k * 2 * Math.PI / 3;
      d += (i ? ' L' : 'M') + n(x) + ' ' + n(y0 - A * Math.sin(ang));
    }
    s += '<path d="' + d + '" fill="none" stroke="' + cols[k] + '" stroke-width="2.6"/>';
    if (f.fases === 3) { s += texto(x1 + 10, 34 + k * 18, 'L' + (k + 1), { a: 'start', c: cols[k], b: true }); }
  }
  if (f.pico) { s += linea(x0, y0 - A, x0 + W * 0.25, y0 - A, { c: SOL, w: 1.6, d: '5 4' }) + texto(x0 + 6, y0 - A - 8, f.pico, { a: 'start' }); }
  if (f.ef) { const e = A / Math.SQRT2; s += linea(x0, y0 - e, x1, y0 - e, { c: AZUL, w: 1.5, d: '3 4' }) + texto(x0 + W * 0.55, y0 - e - 6, f.ef, { c: AZUL }); }
  if (f.pp) {
    const x = x0 + W * 0.75;
    s += linea(x, y0 - A, x, y0 + A, { c: SOL, w: 1.6, d: '5 4' }) + texto(x + 8, y0 + A - 4, f.pp, { a: 'start' });
  }
  if (f.T) {
    const y = y0 + A + 18;
    s += linea(x0, y, x0 + W, y, { c: GRIS, w: 1.6 }) + linea(x0, y - 5, x0, y + 5, { c: GRIS }) + linea(x0 + W, y - 5, x0 + W, y + 5, { c: GRIS }) + texto(x0 + W / 2, y + 16, f.T);
  }
  if (f.desfase) { s += texto(x0 + 8, 24, f.desfase, { a: 'start' }); }
  return svg(380, 200, s, f.fases === 3 ? 'Tensiones de las tres fases' : 'Onda senoidal');
}

/* ---- Pinza amperimétrica ---- */
function pinza(f) {
  const cx = 110, cy = 100, R = 58;
  let s = '<path d="M' + (cx - 14) + ' ' + (cy - R) + ' A' + R + ' ' + R + ' 0 1 0 ' + (cx + 14) + ' ' + (cy - R) + '" fill="none" stroke="' + SOL + '" stroke-width="12" stroke-linecap="round"/>';
  s += '<rect x="' + (cx - 30) + '" y="' + (cy + R - 4) + '" width="60" height="34" rx="8" fill="' + TINTA + '"/>' + texto(cx, cy + R + 19, f.lectura || 'A = ?', { c: '#fff', b: true });
  const cond = f.cond || [];
  cond.forEach(function (c, i) {
    const k = cond.length, x = cx + (k === 1 ? 0 : (i - (k - 1) / 2) * (k > 2 ? 36 : 44)), y = cy - 4;
    s += '<circle cx="' + n(x) + '" cy="' + y + '" r="11" fill="#fff" stroke="' + TINTA + '" stroke-width="2.2"/>';
    if (c.s) { s += texto(x, y + 5, c.s, { s: 13, b: true, c: c.s === '•' ? TINTA : AZUL }); }
    s += texto(x, y + 30, c.t, { s: 10.5 });
  });
  if (f.nota) { s += texto(196, 80, f.nota, { a: 'start', s: 13, c: GRIS }); }
  return svg(380, 200, s, 'Pinza amperimétrica');
}

/* ---- Planilla de Excel (HTML) ---- */
function colNum(c) { let v = 0; for (const ch of c) { v = v * 26 + ch.charCodeAt(0) - 64; } return v; }
function colLet(v) { let s = ''; while (v > 0) { const m = (v - 1) % 26; s = String.fromCharCode(65 + m) + s; v = Math.floor((v - 1) / 26); } return s; }
function enRango(ref, rangos) {
  const m = ref.match(/^([A-Z]+)(\d+)$/), c = colNum(m[1]), r = +m[2];
  return (rangos || []).some(function (rg) {
    const p = rg.split(':'), a = p[0].match(/^([A-Z]+)(\d+)$/), b = (p[1] || p[0]).match(/^([A-Z]+)(\d+)$/);
    return c >= colNum(a[1]) && c <= colNum(b[1]) && r >= +a[2] && r <= +b[2];
  });
}
function hoja(f) {
  const d = f.d || {}, refs = Object.keys(d).concat(f.vacias || []).concat(f.ver || []);
  let c0 = 99, c1 = 0, r0 = 9999, r1 = 0;
  refs.forEach(function (ref) { const m = ref.match(/^([A-Z]+)(\d+)$/); const c = colNum(m[1]), r = +m[2]; c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); });
  c0 = Math.min(c0, f.c0 || 99); r0 = Math.max(1, Math.min(r0, f.r0 || 9999));
  let h = '<div class="xl" role="img" aria-label="Planilla de cálculo">';
  if (f.fx) { h += '<div class="xl-fx"><span class="xl-ref">' + esc(f.en || '') + '</span><i>fx</i><code>' + esc(f.fx) + '</code></div>'; }
  h += '<table><thead><tr><th></th>';
  for (let c = c0; c <= c1; c++) { h += '<th>' + colLet(c) + '</th>'; }
  h += '</tr></thead><tbody>';
  for (let r = r0; r <= r1; r++) {
    h += '<tr><th>' + r + '</th>';
    for (let c = c0; c <= c1; c++) {
      const ref = colLet(c) + r, v = d[ref];
      const num = v != null && /^[−\-]?[\d.,]+%?$/.test(String(v));
      const cls = [num ? 'num' : '', enRango(ref, f.sel) ? 'sel' : '', ref === f.en ? 'act' : '', v != null && String(v).indexOf('?') !== -1 ? 'duda' : ''].filter(Boolean).join(' ');
      h += '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(v == null ? '' : v) + '</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table></div>';
  return h;
}

/* ---- Tabla de datos (HTML) ---- */
function tabla(f) {
  let h = '<div class="tb" role="img" aria-label="Tabla de datos"><table>';
  if (f.cab) { h += '<thead><tr>' + f.cab.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>'; }
  h += '<tbody>' + (f.filas || []).map(function (fila) {
    return '<tr>' + fila.map(function (c, i) { const duda = String(c).indexOf('?') !== -1; return (i === 0 ? '<th>' : '<td' + (duda ? ' class="duda"' : '') + '>') + esc(c) + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
  }).join('') + '</tbody></table>';
  if (f.nota) { h += '<p>' + esc(f.nota) + '</p>'; }
  return h + '</div>';
}

/* ---- Diagrama de caja ---- */
function caja(f) {
  const min = f.min, max = f.max, x0 = 40, x1 = 340, y = 80;
  const X = function (v) { return x0 + (v - min) / (max - min) * (x1 - x0); };
  let s = linea(X(f.min), y, X(f.q1), y) + linea(X(f.q3), y, X(f.max), y);
  s += linea(X(f.min), y - 12, X(f.min), y + 12) + linea(X(f.max), y - 12, X(f.max), y + 12);
  s += '<rect x="' + n(X(f.q1)) + '" y="' + (y - 26) + '" width="' + n(X(f.q3) - X(f.q1)) + '" height="52" fill="#EAF0FF" stroke="' + AZUL + '" stroke-width="2.2" rx="3"/>';
  if (f.med != null) { s += linea(X(f.med), y - 26, X(f.med), y + 26, { c: SOL, w: 3 }); }
  const et = f.et || {};
  ['min', 'q1', 'med', 'q3', 'max'].forEach(function (k, i) {
    if (et[k] == null || f[k] == null) { return; }
    s += texto(X(f[k]), i % 2 ? y - 34 : y + 46, et[k], { s: 12 });
  });
  if (f.rango) {
    const yy = 150;
    s += linea(X(f.q1), yy, X(f.q3), yy, { c: AZUL }) + linea(X(f.q1), yy - 5, X(f.q1), yy + 5, { c: AZUL }) + linea(X(f.q3), yy - 5, X(f.q3), yy + 5, { c: AZUL });
    s += texto((X(f.q1) + X(f.q3)) / 2, yy + 18, f.rango, { c: AZUL });
  }
  return svg(380, f.rango ? 180 : 140, s, 'Diagrama de caja');
}

/* ---- Conductor (resistividad) ---- */
function conductor(f) {
  let s = '';
  (f.c || []).forEach(function (c, i) {
    const y = 46 + i * 80, L = c.l, H = c.h || 16;
    s += '<rect x="40" y="' + (y - H / 2) + '" width="' + L + '" height="' + H + '" rx="' + H / 2 + '" fill="#F2B07A" stroke="' + SOL + '" stroke-width="2"/>';
    s += texto(40 + L / 2, y + H / 2 + 18, c.t, { s: 13 }) + texto(48 + L, y + 5, c.r, { a: 'start', s: 14 });
  });
  return svg(380, 40 + (f.c || []).length * 80, s, 'Conductores comparados');
}

const DIBUJOS = { serie: serie, paralelo: paralelo, mixto: mixto, nodo: nodo, potencias: potencias, trafo: trafo, trifasico: trifasico, senoide: senoide, pinza: pinza, hoja: hoja, tabla: tabla, caja: caja, conductor: conductor };

export function figuraHtml(f) {
  if (!f || !DIBUJOS[f.t]) { return ''; }
  try { return DIBUJOS[f.t](f); } catch (e) { console.warn('No se pudo dibujar la figura', f, e); return ''; }
}
