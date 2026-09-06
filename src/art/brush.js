/**
 * Mal-Werkzeugkasten für den Tinte-und-Aquarell-Stil.
 *
 * Grundgedanke: Erst werden weiche Farbflächen gelegt (die absichtlich ein
 * Stück neben der Form liegen), dann kommt die Tuschelinie obendrauf. Genau
 * so entsteht der Eindruck von Hand koloriert – und nicht von Vektorgrafik.
 */
import { makeRng } from '../core/rng.js';
import { makeCanvas, ctx2d } from '../core/util.js';

/* ------------------------------------------------------------------ Formen */

/**
 * Organische, geschlossene Form: ein Kreis, dessen Radius von mehreren
 * Sinuswellen verbogen wird. Ergibt Blätterkronen, Steine, Pfützen.
 */
export function blob(cx, cy, rx, ry, seed, wobble, points) {
  const rng = makeRng(seed >>> 0);
  const n = points || 26;
  const amp = wobble == null ? 0.12 : wobble;
  const harmonics = [];
  for (let h = 0; h < 3; h++) {
    harmonics.push({
      freq: 2 + Math.floor(rng() * 4) + h,
      phase: rng() * Math.PI * 2,
      amp: amp * (1 - h * 0.28) * (0.6 + rng() * 0.8),
    });
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 1;
    for (let h = 0; h < harmonics.length; h++) {
      r += Math.sin(a * harmonics[h].freq + harmonics[h].phase) * harmonics[h].amp;
    }
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
}

/** Tropfenform – oben schmal, unten breit. Für Baumkronen und Flammen. */
export function teardrop(cx, cy, rx, ry, seed, wobble) {
  const pts = blob(cx, cy, rx, ry, seed, wobble);
  for (let i = 0; i < pts.length; i++) {
    const t = (pts[i][1] - (cy - ry)) / (2 * ry); // 0 oben, 1 unten
    const squeeze = 0.55 + t * 0.65;
    pts[i][0] = cx + (pts[i][0] - cx) * squeeze;
  }
  return pts;
}

/** Catmull-Rom-Glättung einer geschlossenen Punktfolge. */
export function smoothClosed(pts, samplesPerSegment) {
  const s = samplesPerSegment || 6;
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let j = 0; j < s; j++) {
      const t = j / s;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

/** Verschiebt und staucht eine Form leicht – für versetzte Farbflächen. */
export function offsetShape(pts, dx, dy, scale) {
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) { cx += pts[i][0]; cy += pts[i][1]; }
  cx /= pts.length;
  cy /= pts.length;
  const s = scale == null ? 1 : scale;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    out.push([cx + (pts[i][0] - cx) * s + dx, cy + (pts[i][1] - cy) * s + dy]);
  }
  return out;
}

export function pathFrom(ctx, pts, close) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close !== false) ctx.closePath();
}

/* ------------------------------------------------------------------- Tinte */

/**
 * Tuschelinie mit veränderlicher Strichstärke.
 *
 * Jedes Teilstück wird einzeln mit runden Enden gestrichen. Das ist der
 * entscheidende Trick: Ein als Band gefüllter Umriss verschlingt sich in
 * engen Kurven zu Schleifen – überlappende Einzelstriche nie.
 */
export function inkStroke(ctx, pts, opts) {
  const o = opts || {};
  const closed = o.closed !== false;
  const base = o.width || 3;
  const vary = o.vary == null ? 0.4 : o.vary;
  const rng = makeRng((o.seed || 1) >>> 0);
  const phase = rng() * 6.28;
  const freq = 1.1 + rng() * 1.5;
  const n = pts.length;
  if (n < 2) return;

  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.strokeStyle = o.color || '#4a4038';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const t = i / n;
    let w = base * (1
      + Math.sin(t * Math.PI * 2 * freq + phase) * vary
      + Math.sin(t * Math.PI * 2 * freq * 3.3 + phase * 2) * vary * 0.35);
    if (!closed) {
      const taper = Math.min(1, Math.min(i, last - 1 - i) / Math.max(1, n * 0.2));
      w *= 0.3 + 0.7 * taper;
    }
    ctx.lineWidth = Math.max(0.4, w);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Umriss der Silhouette (Vereinigung aller Formen).
 *
 * Die gefüllte Form wird ringsum leicht versetzt kopiert (verdickt) und die
 * Mitte anschließend ausgestanzt – übrig bleibt genau die äußere Kontur.
 * Nur so bekommt eine Baumkrone aus fünf Lappen eine einzige Außenlinie
 * statt fünf sich kreuzender Kringel.
 */
export function unionOutline(shapeCanvas, width, color, seed) {
  const w = shapeCanvas.width;
  const h = shapeCanvas.height;
  const ring = makeCanvas(w, h);
  const rc = ctx2d(ring);
  rc.imageSmoothingEnabled = true;

  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    rc.drawImage(shapeCanvas, Math.cos(a) * width, Math.sin(a) * width);
  }
  rc.globalCompositeOperation = 'destination-out';
  rc.drawImage(shapeCanvas, 0, 0);
  rc.globalCompositeOperation = 'source-in';
  rc.fillStyle = color || '#4c4237';
  rc.fillRect(0, 0, w, h);
  rc.globalCompositeOperation = 'source-over';

  modulateAlpha(ring, seed || 5);
  return ring;
}

/** Lässt die Linienstärke wandern – sonst wirkt der Umriss wie ausgestanzt. */
function modulateAlpha(canvas, seed) {
  const ctx = ctx2d(canvas);
  let img;
  try {
    img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (err) {
    return;
  }
  const rng = makeRng(seed >>> 0);
  const p1 = rng() * 6.28;
  const p2 = rng() * 6.28;
  const f1 = 0.035 + rng() * 0.03;
  const f2 = 0.021 + rng() * 0.02;
  const d = img.data;
  const w = canvas.width;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4 + 3;
      if (!d[i]) continue;
      const m = 0.72
        + 0.28 * Math.sin(x * f1 + y * f2 * 1.7 + p1)
        + 0.14 * Math.sin(x * f2 * 2.3 - y * f1 + p2);
      d[i] = Math.max(0, Math.min(255, d[i] * Math.max(0.3, Math.min(1.15, m))));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Kurzer, freier Strich (Grashalm, Fell, Schraffur). */
export function inkLine(ctx, x0, y0, x1, y1, opts) {
  const o = opts || {};
  const bend = o.bend == null ? 0.12 : o.bend;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Stützpunkte nach Länge: kurze Striche brauchen keine neun Teilstücke
  const steps = o.steps || Math.max(3, Math.min(9, Math.round(len / 14)));
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * len * bend;
    pts.push([x0 + dx * t + nx * curve, y0 + dy * t + ny * curve]);
  }
  inkStroke(ctx, pts, {
    closed: false,
    width: o.width || 2,
    vary: o.vary == null ? 0.3 : o.vary,
    color: o.color || '#4a4038',
    seed: o.seed || 3,
    alpha: o.alpha,
  });
}

/* --------------------------------------------------------------- Weichzeichnen */

/**
 * Kastenweichzeichner über ImageData.
 * Alpha wird vorher multipliziert, sonst entstehen dunkle Ränder an
 * durchsichtigen Stellen.
 */
export function blurCanvas(canvas, radius, passes) {
  const r = Math.max(1, Math.round(radius));
  const w = canvas.width;
  const h = canvas.height;
  if (w < 3 || h < 3) return;
  const ctx = ctx2d(canvas);
  let img;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch (err) {
    return;
  }
  const d = img.data;
  const n = w * h;
  const src = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3] / 255;
    src[i * 4] = d[i * 4] * a;
    src[i * 4 + 1] = d[i * 4 + 1] * a;
    src[i * 4 + 2] = d[i * 4 + 2] * a;
    src[i * 4 + 3] = d[i * 4 + 3];
  }
  const tmp = new Float32Array(n * 4);
  const rounds = passes || 2;
  for (let p = 0; p < rounds; p++) {
    boxPass(src, tmp, w, h, r, true);
    boxPass(tmp, src, w, h, r, false);
  }
  for (let i = 0; i < n; i++) {
    const a = src[i * 4 + 3];
    const inv = a > 0.5 ? 255 / a : 0;
    d[i * 4] = src[i * 4] * inv;
    d[i * 4 + 1] = src[i * 4 + 1] * inv;
    d[i * 4 + 2] = src[i * 4 + 2] * inv;
    d[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Ein Kastendurchgang des Weichzeichners.
 *
 * Ausserhalb des Bildes wird mit „nichts“ gerechnet, nicht mit dem Randpixel.
 * Wuerde der Rand fortgesetzt, bekaeme jede Grafik, deren Farbe bis an den
 * Rand ihrer Leinwand reicht, einen blassen Streifen ringsherum – im Spiel
 * standen dort rechteckige Schleier im Boden, wo sich Baeume ueberlagerten.
 * Beim Boden ist das unkritisch: Dort liegt ein Malrand um jedes Stueck, und
 * gezeichnet wird nur der Kern.
 */
function boxPass(src, dst, w, h, r, horizontal) {
  const outer = horizontal ? h : w;
  const inner = horizontal ? w : h;
  const stepIn = horizontal ? 4 : w * 4;
  const stepOut = horizontal ? w * 4 : 4;
  const win = r * 2 + 1;
  for (let o = 0; o < outer; o++) {
    const base = o * stepOut;
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    for (let k = 0; k <= r && k < inner; k++) {
      const idx = base + k * stepIn;
      s0 += src[idx]; s1 += src[idx + 1]; s2 += src[idx + 2]; s3 += src[idx + 3];
    }
    for (let i = 0; i < inner; i++) {
      const out = base + i * stepIn;
      dst[out] = s0 / win;
      dst[out + 1] = s1 / win;
      dst[out + 2] = s2 / win;
      dst[out + 3] = s3 / win;
      const add = i + r + 1;
      if (add < inner) {
        const a = base + add * stepIn;
        s0 += src[a]; s1 += src[a + 1]; s2 += src[a + 2]; s3 += src[a + 3];
      }
      const sub = i - r;
      if (sub >= 0) {
        const b = base + sub * stepIn;
        s0 -= src[b]; s1 -= src[b + 1]; s2 -= src[b + 2]; s3 -= src[b + 3];
      }
    }
  }
}

/* -------------------------------------------------------------- Papierkorn */

let paperTile = null;

/** Erzeugt einmalig eine kachelbare Papierstruktur. */
export function paperTexture(size) {
  if (paperTile) return paperTile;
  const s = size || 256;
  const c = makeCanvas(s, s);
  const ctx = ctx2d(c);
  const rng = makeRng(0x9a5f);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, s, s);

  // feine Körnung
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 236 + Math.floor(rng() * 20);
    d[i] = v; d[i + 1] = v; d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  // lange Fasern
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 60; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const len = 12 + rng() * 48;
    const ang = rng() * Math.PI;
    ctx.strokeStyle = rng() < 0.5 ? '#c9c2ae' : '#ffffff';
    ctx.lineWidth = 0.6 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  // gröbere Flecken
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = '#b8b09c';
    ctx.beginPath();
    ctx.arc(rng() * s, rng() * s, 1 + rng() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  paperTile = c;
  return c;
}

/* ------------------------------------------------------------------- Malen */

/**
 * Legt eine Aquarellfläche.
 * Die Fläche wird bewusst leicht versetzt und etwas anders skaliert als die
 * Kontur – dieses „daneben“ ist das ganze Geheimnis des Looks.
 */
export function wash(ctx, pts, color, opts) {
  const o = opts || {};
  const rng = makeRng((o.seed || 7) >>> 0);
  const dx = o.dx != null ? o.dx : (rng() - 0.5) * 4;
  const dy = o.dy != null ? o.dy : (rng() - 0.5) * 4;
  const shape = offsetShape(pts, dx, dy, o.scale == null ? 1.02 : o.scale);
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.fillStyle = color;
  pathFrom(ctx, shape, true);
  ctx.fill();
  ctx.restore();
}

/**
 * Bildaufbau eines gemalten Sprites:
 *   1. Farbflächen auf eine eigene Ebene, danach weichzeichnen
 *   2. Tuschelinien scharf darüber
 * @param {number} w
 * @param {number} h
 * @param {(ctx: CanvasRenderingContext2D) => void} paintWash
 * @param {(ctx: CanvasRenderingContext2D) => void} paintInk
 * @param {object} opts blur (Radius), mode: 'color' | 'line'
 */
export function paintLayered(w, h, paintWash, paintInk, opts) {
  const o = opts || {};
  const out = makeCanvas(w, h);
  const octx = ctx2d(out);
  octx.imageSmoothingEnabled = true;

  const washLayer = makeCanvas(w, h);
  const wctx = ctx2d(washLayer);
  wctx.imageSmoothingEnabled = true;
  paintWash(wctx);
  blurCanvas(washLayer, o.blur == null ? 2 : o.blur, o.blurPasses || 2);
  if (o.mode === 'line') toPaleGrey(washLayer);
  octx.drawImage(washLayer, 0, 0);

  if (paintInk) paintInk(octx);
  return out;
}

/** Luft zwischen Malerei und Leinwandrand, in Bildpunkten. */
export const DEFAULT_MARGIN = 20;

/**
 * Vollständiger Bildaufbau eines gemalten Objekts.
 *
 *   1. Schatten und Farbflächen auf eine Ebene, weichzeichnen
 *   2. Silhouette getrennt füllen, daraus eine einzige Außenkontur bauen
 *   3. Innenlinien und Details scharf darüber
 *
 * Liefert beide Fassungen auf einmal: koloriert und als blasse Zeichnung.
 * Die aufwendigen Teile (Weichzeichnen, Kontur) werden dabei nur einmal
 * berechnet.
 *
 * Um die angegebene Fläche liegt ein Rand (`margin`). Ohne ihn schneidet die
 * Leinwand die Malerei ab: Farbflächen werden absichtlich etwas größer als die
 * Form gemalt, und die Außenkontur liegt noch einmal davor. Am einzelnen Objekt
 * fällt der gerade Schnitt kaum auf – wo sich viele Bäume überlagern, addieren
 * sich die Schnittkanten aber zu Rechtecken im Boden.
 *
 * @param {number} w Breite der Zeichenfläche (ohne Rand)
 * @param {number} h Höhe der Zeichenfläche (ohne Rand)
 * @param {object} o shadow, wash, shape, ink (Zeichenfunktionen),
 *                   outline (Strichstärke), blur, seed, margin
 * @returns {{color: HTMLCanvasElement, line: HTMLCanvasElement, margin: number}}
 */
export function paintObject(w, h, o) {
  const m = o.margin == null ? DEFAULT_MARGIN : o.margin;
  const W = w + m * 2;
  const H = h + m * 2;

  function layer() {
    const c = makeCanvas(W, H);
    const ctx = ctx2d(c);
    ctx.imageSmoothingEnabled = true;
    ctx.translate(m, m);
    return [c, ctx];
  }

  const wl = layer();
  const washLayer = wl[0];
  const wctx = wl[1];
  if (o.shadow) o.shadow(wctx);
  if (o.wash) o.wash(wctx);
  blurCanvas(washLayer, o.blur == null ? 3 : o.blur, o.blurPasses || 2);

  const paleWash = makeCanvas(W, H);
  const pctx = ctx2d(paleWash);
  pctx.drawImage(washLayer, 0, 0);
  toPaleGrey(paleWash);

  let ring = null;
  if (o.shape) {
    const sl = layer();
    sl[1].fillStyle = '#000000';
    o.shape(sl[1]);
    ring = unionOutline(sl[0], o.outline == null ? 2.6 : o.outline,
      o.outlineColor || '#4a4038', o.seed || 5);
  }

  function compose(washSource) {
    const out = makeCanvas(W, H);
    const ctx = ctx2d(out);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(washSource, 0, 0);
    if (ring) ctx.drawImage(ring, 0, 0);
    if (o.ink) {
      ctx.save();
      ctx.translate(m, m);
      o.ink(ctx);
      ctx.restore();
    }
    return out;
  }

  return { color: compose(washLayer), line: compose(paleWash), margin: m };
}

/**
 * Wandelt eine Farbebene in blasses Grau um.
 * Das ist der „noch nicht kolorierte“ Zustand: Die Zeichnung steht da wie in
 * einem Malbuch, nur die Striche und ein Hauch Schattierung.
 */
export function toPaleGrey(canvas) {
  const ctx = ctx2d(canvas);
  let img;
  try {
    img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (err) {
    return;
  }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    // in ein helles, leicht warmes Grau ziehen
    const v = 198 + (lum - 128) * 0.22;
    d[i] = v + 6;
    d[i + 1] = v + 3;
    d[i + 2] = v - 4;
    d[i + 3] = d[i + 3] * 0.62;
  }
  ctx.putImageData(img, 0, 0);
}

/** Weicher Bodenschatten unter einem Objekt. */
export function groundShadow(ctx, cx, cy, rx, ry, seed, alpha) {
  const pts = smoothClosed(blob(cx, cy, rx, ry, seed || 11, 0.16, 14), 4);
  ctx.save();
  ctx.globalAlpha = alpha == null ? 0.16 : alpha;
  ctx.fillStyle = '#6f7a5c';
  pathFrom(ctx, pts, true);
  ctx.fill();
  ctx.restore();
}
