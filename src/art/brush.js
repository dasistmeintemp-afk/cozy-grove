/**
 * Mal-Werkzeugkasten für den Tinte-und-Aquarell-Stil.
 *
 * Grundgedanke: Erst werden weiche Farbflächen gelegt (die absichtlich ein
 * Stück neben der Form liegen), dann kommt die Tuschelinie obendrauf. Genau
 * so entsteht der Eindruck von Hand koloriert – und nicht von Vektorgrafik.
 */
import { makeRng } from '../core/rng.js';
import { makeCanvas, ctx2d } from '../core/util.js';

/**
 * Die Tusche. Fast schwarz, nicht graubraun – und das ist eine Messung.
 *
 * Hier stand `#4a4038`, ein warmes Dunkelgrau mit einer Helligkeit von 66.
 * Das klingt dunkel und war es nicht: Nach Alphaschwankung, Weichzeichner
 * und dem Papier darunter kam im fertigen Bild NICHTS unter 60 heraus –
 * im ganzen Spielbild kein einziger dunkler Punkt. Gemessen gegen das
 * Vorbild (Cozy Grove): dort sind 9 % aller Punkte dunkler als 60, und
 * die Streuung der Helligkeit ist mit 60 fast dreimal so groß wie unsere
 * 24. Das Bild wirkte daneben ausgewaschen, obwohl es sogar MEHR Farbe
 * hat (Farbigkeit 81 gegen 70).
 *
 * Es fehlte also nicht an Farbe, sondern am Tiefton. Eine Zeichnung
 * braucht etwas, wogegen das Helle hell ist.
 *
 * Warm bleibt sie trotzdem: Reines Schwarz macht aus Aquarell einen
 * Comic. 36/30/26 ist Sepia, nur endlich dunkel genug, um als Strich zu
 * gelten.
 */
export const TUSCHE = '#241e1a';

/**
 * Wie breit die Umrisse insgesamt sind – ein Faktor auf alle Angaben.
 *
 * Jeder Maler nennt seine eigene Strichstärke (ein Falter dünner als ein
 * Haus), und die Verhältnisse untereinander stimmen. Was nicht stimmte,
 * war das Gesamtmaß: Zwei Bildpunkte auf einer 220 Punkte hohen Zeichnung
 * sind im fertigen Spiel ein Haar. Dunklere Tusche allein brachte den
 * Anteil dunkler Punkte nur von 0,0 auf 0,9 Prozent – es gab schlicht zu
 * wenige davon.
 *
 * Deshalb ein Faktor statt dreißig geänderter Zahlen: Die Abstufung
 * zwischen den Malern bleibt, das Ganze wird kräftiger. Jede Änderung
 * hier ist eine an der Handschrift des ganzen Spiels.
 */
export const STRICH = 1.65;

/**
 * Wie kräftig Schlagschatten insgesamt sind – ein Faktor auf alle
 * Angaben an `groundShadow`.
 *
 * Im Vorbild sitzt jedes Ding auf einem deutlichen Schatten; bei uns
 * musste man ihn suchen. Ein Schatten, den man suchen muss, ist der
 * teuerste Weg, keinen zu haben: Er kostet dieselbe Rechenzeit und bringt
 * weder Bodenkontakt noch Tiefton.
 */
export const SCHATTEN = 1.75;

/**
 * Wie kräftig Innenlinien auftragen – ein Faktor auf jede Deckkraft, die
 * an `inkStroke` und `inkLine` übergeben wird.
 *
 * **Gemessen, nicht geschätzt.** Im Vergleichsbild (Lagerplatz, Hochsommer,
 * Mittag) gegen die Vorlage war der Unterschied nicht die Zahl der Striche,
 * sondern ihre Kraft. Anteil der Bildpunkte unter einer Helligkeit von …
 *
 *            40      60      80     100     120     150
 *   Vorbild  4,6 %   9,0 %  16,1 %  22,2 %  28,9 %  55,6 %
 *   vorher   0,2 %   2,0 %   5,6 %   8,4 %  13,3 %  29,1 %
 *
 * In unserem Bild war praktisch kein Schwarz. Die Striche lagen alle da –
 * nur mit Deckkraft 0,3 bis 0,5 auf mittlerem Grün, und das ergibt eine
 * Helligkeit um 110: sichtbar, wenn man danach sucht, aber eben keine
 * Zeichnung. Eine Tuschezeichnung erkennt man am TIEFTON, nicht an der
 * Strichzahl.
 *
 * Der Faktor sitzt an einer Stelle, weil 117 Maler sonst 117 Zahlen hätten
 * und niemand sie gemeinsam verstellen könnte. Deckkraft 1 bleibt 1 – wer
 * volle Tusche wollte, hatte sie schon.
 */
export const TINTE = 1.5;

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

/**
 * Beschneidet auf die Vereinigung mehrerer Formen. `pathFrom` beginnt jedes
 * Mal einen neuen Pfad – für ein gemeinsames Clip müssen die Teilpfade in
 * einem Pfad liegen. Ruft `save()` selbst; der Aufrufer braucht `restore()`.
 */
export function clipTo(ctx, shapes) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < shapes.length; i++) {
    const pts = shapes[i];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath();
  }
  ctx.clip();
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
  ctx.globalAlpha = o.alpha == null ? 1 : Math.min(1, o.alpha * TINTE);
  ctx.strokeStyle = o.color || TUSCHE;
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
  rc.fillStyle = color || TUSCHE;
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
      // Die Stärke wandert, aber die Linie bleibt eine Linie. Vorher fiel sie
      // stellenweise auf 44 Prozent und wirkte dadurch weich statt gezeichnet.
      const m = 0.93
        + 0.13 * Math.sin(x * f1 + y * f2 * 1.7 + p1)
        + 0.07 * Math.sin(x * f2 * 2.3 - y * f1 + p2);
      d[i] = Math.max(0, Math.min(255, d[i] * Math.max(0.78, Math.min(1.1, m))));
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
    color: o.color || TUSCHE,
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
/**
 * Kann der Browser selbst weichzeichnen?
 *
 * `ctx.filter` gibt es in Chrome und Firefox seit Langem, in Safari erst seit
 * Version 17. Die blosse Anwesenheit der Eigenschaft genügt daher nicht – es
 * wird einmal wirklich ausprobiert: ein deckender Fleck, weichgezeichnet, und
 * danach ein Blick auf eine Ecke. Ist sie noch leer, hat der Browser den Filter
 * ignoriert, und wir rechnen weiter selbst.
 */
let nativeBlur = null;

function canBlurNatively() {
  if (nativeBlur !== null) return nativeBlur;
  nativeBlur = false;
  try {
    const c = makeCanvas(32, 32);
    const g = ctx2d(c);
    if (typeof g.filter !== 'string') return nativeBlur;
    g.filter = 'blur(4px)';
    g.fillStyle = '#000000';
    g.fillRect(8, 8, 16, 16);
    g.filter = 'none';
    // Ohne Filter wäre diese Stelle unberührt und damit vollständig leer
    const a = g.getImageData(5, 16, 1, 1).data[3];
    nativeBlur = a > 4;
  } catch (err) {
    nativeBlur = false;
  }
  return nativeBlur;
}

export function blurCanvas(canvas, radius, passes) {
  const r = Math.max(1, Math.round(radius));
  const w = canvas.width;
  const h = canvas.height;
  if (w < 3 || h < 3) return;

  // Der eigene Kastenweichzeichner war die Hälfte der Kosten eines
  // Bodenstücks. Kann der Browser es selbst, ist es ein Bruchteil davon.
  if (canBlurNatively()) {
    const rounds = passes || 2;
    // Mehrere Kastendurchgänge nähern eine Glocke; sigma entsprechend
    const sigma = r * Math.sqrt(rounds * 2) * 0.5;
    try {
      const tmp = makeCanvas(w, h);
      const tctx = ctx2d(tmp);
      tctx.drawImage(canvas, 0, 0);
      const ctx = ctx2d(canvas);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.filter = 'blur(' + sigma.toFixed(2) + 'px)';
      ctx.drawImage(tmp, 0, 0);
      ctx.filter = 'none';
      ctx.restore();
      return;
    } catch (err) {
      nativeBlur = false;
    }
  }

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
 * Würde der Rand fortgesetzt, bekäme jede Grafik, deren Farbe bis an den
 * Rand ihrer Leinwand reicht, einen blassen Streifen ringsherum – im Spiel
 * standen dort rechteckige Schleier im Boden, wo sich Bäume überlagerten.
 * Beim Boden ist das unkritisch: Dort liegt ein Malrand um jedes Stück, und
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
 * Mehrere Formen als EINE Farbfläche legen.
 *
 * Halbdurchsichtig übereinander gelegte Formen addieren sich in den
 * Überlappungen: Aus sechs Lappen mit je 34 Prozent wird in der Mitte fast
 * Deckung, und die Schattenseite einer Baumkrone verläuft zu Matsch statt eine
 * Fläche mit Kante zu sein. Hier wird die Gruppe erst deckend auf eine eigene
 * Leinwand gelegt und dann einmal als Ganzes eingeblendet.
 *
 * @param {Array<Array<[number,number]>>} groups Liste von Punktfolgen
 */
export function washGroup(ctx, groups, color, opts) {
  const o = opts || {};
  if (!groups.length) return;
  const c = ctx.canvas;
  const layer = makeCanvas(c.width, c.height);
  const lg = ctx2d(layer);
  lg.imageSmoothingEnabled = true;
  // Dieselbe Verschiebung wie die Zielebene, damit alles zusammenpasst
  const tr = ctx.getTransform ? ctx.getTransform() : null;
  if (tr) lg.setTransform(tr.a, tr.b, tr.c, tr.d, tr.e, tr.f);
  lg.fillStyle = color;
  for (let i = 0; i < groups.length; i++) {
    pathFrom(lg, groups[i], true);
    lg.fill();
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.drawImage(layer, 0, 0);
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
  // Wenig Weichzeichnung: die Vorlage hat Farbflächen mit erkennbarer Kante,
  // keinen Airbrush. Zu viel Weichzeichner nimmt der Zeichnung den Strich.
  blurCanvas(washLayer, o.blur == null ? 1.6 : o.blur, o.blurPasses || 2);

  // Farbige Feinheiten liegen hinter dem Weichzeichner, aber vor dem
  // Entfärben: in der kolorierten Fassung ein scharfer Strich, im Malbuch
  // blasses Grau. Farbe in `ink` würde dagegen als Farbfleck stehenbleiben.
  if (o.detail) {
    wctx.save();
    o.detail(wctx);
    wctx.restore();
  }

  const paleWash = makeCanvas(W, H);
  const pctx = ctx2d(paleWash);
  pctx.drawImage(washLayer, 0, 0);
  toPaleGrey(paleWash);

  let ring = null;
  if (o.shape) {
    const sl = layer();
    sl[1].fillStyle = '#000000';
    o.shape(sl[1]);
    ring = unionOutline(sl[0], (o.outline == null ? 1.9 : o.outline) * STRICH,
      o.outlineColor || TUSCHE, o.seed || 5);
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

/**
 * Woher das Licht kommt: von oben links.
 *
 * Ein einziger Wert für die ganze Insel. Vorher lag jeder Schatten mittig
 * unter seinem Objekt, und die Lichtseiten der Objekte zeigten in
 * unterschiedliche Richtungen – die Szene zerfiel dadurch in Einzelteile,
 * statt unter einer Sonne zu stehen.
 */
export const LIGHT = { x: -0.6, y: -0.8 };

/**
 * Weicher Bodenschatten unter einem Objekt.
 *
 * Zwei Lagen: eine breite, die vom Licht weg versetzt liegt, und ein
 * dunklerer Kern direkt am Fußpunkt. Der Kern ist das Entscheidende – ohne
 * ihn schwebt ein Baum über der Wiese, statt auf ihr zu stehen.
 */
export function groundShadow(ctx, cx, cy, rx, ry, seed, alpha) {
  // Von 0,16 auf 0,27, und der Ton von Oliv (Helligkeit 115) auf ein
  // tiefes Graugrün (65). Gemessen gegen das Vorbild fehlte dem Bild der
  // Tiefton; ein Schatten, den man suchen muss, ist der teuerste Weg,
  // keinen zu haben. Jetzt sitzt jedes Ding wirklich auf dem Boden.
  // Die 76 Aufrufstellen nennen ihre eigene Deckung (ein Pilz wirft
  // weniger als ein Haus), und die Verhältnisse stimmen. Zu schwach war
  // das Gesamtmaß – darum ein Faktor darüber statt 76 geänderter Zahlen,
  // genau wie bei der Strichstärke.
  const a = (alpha == null ? 0.16 : alpha) * SCHATTEN;
  // Der Schatten lag fast mittig unter dem Objekt und war kaum größer als
  // dessen Fuß. Damit hatte die Szene keine Lichtrichtung: Eine Lichtung sah
  // aus, als stünden die Bäume bei bedecktem Himmel. Jetzt liegt er
  // deutlicher vom Licht weg und ist in dessen Richtung etwas gestreckt.
  //
  // Hier und nicht an den dreißig Aufrufstellen: Eine Lichtrichtung ist
  // nichts, was ein Baum für sich hat – sie gilt für die ganze Insel, und
  // einzeln gepflegt liefe sie über kurz oder lang auseinander.
  const ox = -LIGHT.x * rx * 0.40;
  const oy = -LIGHT.y * ry * 0.50;
  const s = seed || 11;
  ctx.save();
  ctx.fillStyle = '#414a35';

  ctx.globalAlpha = a;
  pathFrom(ctx, smoothClosed(
    blob(cx + ox, cy + oy, rx * 1.16, ry * 1.1, s, 0.16, 14), 4), true);
  ctx.fill();

  // Der Kernschatten bleibt dicht am Fuß. Ohne ihn verlöre das Objekt den
  // Bodenkontakt und schwebte über seinem eigenen Schatten.
  ctx.globalAlpha = a * 1.45;
  pathFrom(ctx, smoothClosed(
    blob(cx + ox * 0.22, cy + oy * 0.22, rx * 0.58, ry * 0.62, s + 3, 0.2, 12), 4), true);
  ctx.fill();
  ctx.restore();
}
