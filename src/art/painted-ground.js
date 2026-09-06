/**
 * Der gemalte Boden.
 *
 * Die Insel wird in Stücke zerlegt und je Stück zweimal abgelegt:
 *   wash – die weichen Farbflächen (Wiese, Sand, Wasser)
 *   ink  – Küstenlinie und Bodendetails, gestochen scharf
 *
 * Getrennt deshalb, weil die Farbe verschwinden darf, die Zeichnung aber nie:
 * unkoloriert wird einfach ein Papierschleier über die Farbfläche gelegt,
 * bevor die Tinte darüberkommt.
 */
import { makeCanvas, ctx2d } from '../core/util.js';
import { makeRng, hashString } from '../core/rng.js';
import {
  blob, smoothClosed, offsetShape, pathFrom, inkStroke, inkLine, blurCanvas,
} from './brush.js';
import { INK } from './painted.js';
import { T, TILE_SIZE, TILE_DEF, isWalkable, isWater } from './tiles.js';

/**
 * Kachelbreite eines Stücks.
 * Größere Stücke heißt weniger Verschnitt: Der Malrand (PAD) wird gebraucht,
 * damit der Weichzeichner am Stückrand echte Nachbardaten sieht, kostet aber
 * Speicher. Gezeichnet wird später nur der Kern.
 */
export const CHUNK_TILES = 8;
export const CHUNK_PX = CHUNK_TILES * TILE_SIZE;
export const CHUNK_PAD = 34;
const PAD = CHUNK_PAD;

/**
 * Die Farbflächen werden in halber Auflösung gemalt und beim Zeichnen wieder
 * hochskaliert. Sie sind ohnehin weichgezeichnet – man sieht keinen
 * Unterschied, aber das Weichzeichnen kostet nur ein Viertel. Genau daran
 * hing die Bildrate beim Laufen. Die Tinte bleibt in voller Auflösung.
 */
export const WASH_SCALE = 0.5;

/** Deterministischer Versatz eines Gitterpunkts – Nachbarkanten passen dadurch. */
function cornerJitter(cx, cy) {
  const r = makeRng(hashString('c' + cx + ':' + cy));
  return [(r() - 0.5) * 13, (r() - 0.5) * 13];
}

/** Organische Fläche über einer Kachel, etwas größer als die Kachel selbst. */
function tilePatch(tx, ty, grow) {
  const g = grow == null ? 0.62 : grow;
  return smoothClosed(
    blob((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE,
      TILE_SIZE * (0.5 + g), TILE_SIZE * (0.5 + g),
      hashString('t' + tx + ':' + ty), 0.16, 12),
    5
  );
}

/**
 * Abstand einer Kachel zum nächsten Land (Schachbrett-Abstand, gedeckelt).
 * Daraus entsteht der Flachwassersaum: je näher am Ufer, desto heller.
 */
function landDistance(world, tx, ty, max) {
  for (let d = 1; d <= max; d++) {
    for (let oy = -d; oy <= d; oy++) {
      for (let ox = -d; ox <= d; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== d) continue;
        if (isWalkable(world.tileAtTile(tx + ox, ty + oy))) return d;
      }
    }
  }
  return max + 1;
}

/**
 * Malt ein Bodenstück.
 * @param {object} world Weltmodell mit tileAtTile()
 * @param {number} ctx0 Stück-Spalte
 * @param {number} cty0 Stück-Zeile
 * @returns {{wash: HTMLCanvasElement, ink: HTMLCanvasElement, ox: number, oy: number}}
 */
export function paintGroundChunk(world, ctx0, cty0) {
  const tx0 = ctx0 * CHUNK_TILES;
  const ty0 = cty0 * CHUNK_TILES;
  const originX = tx0 * TILE_SIZE - PAD;
  const originY = ty0 * TILE_SIZE - PAD;
  const size = CHUNK_PX + PAD * 2;

  const washCanvas = makeCanvas(Math.round(size * WASH_SCALE), Math.round(size * WASH_SCALE));
  const wctx = ctx2d(washCanvas);
  wctx.imageSmoothingEnabled = true;
  wctx.scale(WASH_SCALE, WASH_SCALE);
  wctx.translate(-originX, -originY);

  const inkCanvas = makeCanvas(size, size);
  const ictx = ctx2d(inkCanvas);
  ictx.imageSmoothingEnabled = true;
  ictx.translate(-originX, -originY);

  // Kacheln inkl. Randring einsammeln und nach Ebene sortieren
  const cells = [];
  const ring = 2;
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const t = world.tileAtTile(tx, ty);
      cells.push({ tx: tx, ty: ty, t: t, layer: TILE_DEF[t].layer });
    }
  }
  cells.sort(function (a, b) { return a.layer - b.layer; });

  // Grundton: tiefes Wasser überall, darüber die Kachelflächen
  wctx.fillStyle = INK.waterDark;
  wctx.fillRect(originX, originY, size, size);

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    wctx.fillStyle = TILE_DEF[c.t].base;
    pathFrom(wctx, tilePatch(c.tx, c.ty), true);
    wctx.fill();
  }

  // Flachwassersaum: Wasser nah am Land wird heller, direkt am Ufer fast weiß.
  // Das ist die auffälligste Eigenschaft der Vorlage – ohne diesen Saum stößt
  // die Wiese hart ans Meer.
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      if (!isWater(world.tileAtTile(tx, ty))) continue;
      const d = landDistance(world, tx, ty, 2);
      if (d > 2) continue;
      wctx.save();
      wctx.globalAlpha = d === 1 ? 0.72 : 0.34;
      wctx.fillStyle = d === 1 ? INK.foam : INK.waterLight;
      pathFrom(wctx, tilePatch(tx, ty, d === 1 ? 0.32 : 0.42), true);
      wctx.fill();
      wctx.restore();
    }
  }

  // Malerische Unruhe: größere, halbdurchsichtige Lasuren.
  // Wichtig: Ort und Aussehen hängen nur an der Kachel, nicht am Stück – sonst
  // würde dieselbe Lasur im Nachbarstück anders ausfallen und die Schnittkante
  // wäre als gerade Linie zu sehen.
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const r = makeRng(hashString('lasur' + tx + ':' + ty));
      if (r() > 0.55) continue;
      const t = world.tileAtTile(tx, ty);
      const water = isWater(t);
      const tone = water ? INK.waterDeep
        : t === T.SAND ? INK.sandShade
          : t === T.GRASS ? (r() < 0.5 ? INK.grassLight : INK.grassDark)
            : t === T.ROCKFLOOR ? INK.rockShade : INK.dirtDark;
      wctx.save();
      wctx.globalAlpha = water ? 0.3 : 0.2 + r() * 0.2;
      wctx.fillStyle = tone;
      pathFrom(wctx, smoothClosed(blob(
        (tx + r()) * TILE_SIZE, (ty + r()) * TILE_SIZE,
        TILE_SIZE * (water ? 1.3 : 0.7 + r() * 0.8),
        TILE_SIZE * (water ? 0.9 : 0.5 + r() * 0.7),
        hashString('lb' + tx + ':' + ty), 0.24, 14), 5), true);
      wctx.fill();
      wctx.restore();

      // Zweite, kleinere Lasur: das Gras bekommt dadurch die fleckige
      // Buntheit der Vorlage statt einer glatten Fläche.
      if (water || r() > 0.5) continue;
      wctx.save();
      wctx.globalAlpha = 0.16 + r() * 0.16;
      wctx.fillStyle = t === T.GRASS
        ? (r() < 0.55 ? INK.grassLight : INK.moss)
        : t === T.SAND ? INK.sand : INK.dirtDark;
      pathFrom(wctx, smoothClosed(blob(
        (tx + r()) * TILE_SIZE, (ty + r()) * TILE_SIZE,
        TILE_SIZE * (0.3 + r() * 0.35), TILE_SIZE * (0.24 + r() * 0.3),
        hashString('lc' + tx + ':' + ty), 0.3, 12), 5), true);
      wctx.fill();
      wctx.restore();
    }
  }

  blurCanvas(washCanvas, 3, 2);

  paintGroundInk(ictx, world, tx0, ty0, ring);

  return { wash: washCanvas, ink: inkCanvas, ox: originX, oy: originY, size: size };
}

/**
 * Küstenlinie als echte Kontur (Marching Squares über die Kachelmitten).
 *
 * Zöge man einfach die Kanten zwischen Land- und Wasserkacheln nach, entstünde
 * eine Treppe. Läuft die Linie stattdessen durch die Mittelpunkte zwischen
 * benachbarten Kachelmitten, ergeben sich saubere Diagonalen – und weil diese
 * Punkte zu einem Kachelpaar gehören, passen sie über Stückgrenzen hinweg
 * zusammen.
 */
function contour(g, world, tx0, ty0, ring, classify, width, color, alpha, jitter) {
  const T2 = TILE_SIZE;
  const j = jitter == null ? 11 : jitter;

  function midH(tx, ty) { // zwischen (tx,ty) und (tx+1,ty)
    const o = cornerJitter(tx * 2 + 1, ty * 2);
    return [(tx + 1) * T2 + o[0] * (j / 13), (ty + 0.5) * T2 + o[1] * (j / 13)];
  }
  function midV(tx, ty) { // zwischen (tx,ty) und (tx,ty+1)
    const o = cornerJitter(tx * 2, ty * 2 + 1);
    return [(tx + 0.5) * T2 + o[0] * (j / 13), (ty + 1) * T2 + o[1] * (j / 13)];
  }

  function segment(a, b, tx, ty, tag) {
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const o = cornerJitter(tx * 3 + tag, ty * 5 + tag);
    inkStroke(g, [a, [mid[0] + o[0] * 0.5, mid[1] + o[1] * 0.5], b], {
      closed: false, width: width, vary: 0.4,
      seed: hashString('s' + tx + ':' + ty + ':' + tag), color: color, alpha: alpha,
    });
  }

  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const a = classify(world.tileAtTile(tx, ty)) ? 1 : 0;
      const b = classify(world.tileAtTile(tx + 1, ty)) ? 1 : 0;
      const c = classify(world.tileAtTile(tx + 1, ty + 1)) ? 1 : 0;
      const d = classify(world.tileAtTile(tx, ty + 1)) ? 1 : 0;
      const code = a | (b << 1) | (c << 2) | (d << 3);
      if (code === 0 || code === 15) continue;

      const top = midH(tx, ty);
      const right = midV(tx + 1, ty);
      const bottom = midH(tx, ty + 1);
      const left = midV(tx, ty);

      switch (code) {
        case 1: case 14: segment(left, top, tx, ty, 1); break;
        case 2: case 13: segment(top, right, tx, ty, 2); break;
        case 3: case 12: segment(left, right, tx, ty, 3); break;
        case 4: case 11: segment(right, bottom, tx, ty, 4); break;
        case 6: case 9: segment(top, bottom, tx, ty, 6); break;
        case 7: case 8: segment(left, bottom, tx, ty, 7); break;
        case 5: segment(left, top, tx, ty, 51); segment(right, bottom, tx, ty, 52); break;
        case 10: segment(top, right, tx, ty, 101); segment(left, bottom, tx, ty, 102); break;
        default: break;
      }
    }
  }
}

/**
 * Kurze senkrechte Striche unterhalb einer Felskante – die Stufe.
 * Gezeichnet wird nur dort, wo unter dem Felsboden kein Felsboden mehr liegt.
 */
function rockStep(g, world, tx0, ty0, ring) {
  const marks = [];
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      if (world.tileAtTile(tx, ty) !== T.ROCKFLOOR) continue;
      if (world.tileAtTile(tx, ty + 1) === T.ROCKFLOOR) continue;
      const rng = makeRng(hashString('step' + tx + ':' + ty));
      const y = (ty + 1) * TILE_SIZE;
      for (let i = 0; i < 4; i++) {
        const x = (tx + (i + 0.5) / 4) * TILE_SIZE + (rng() - 0.5) * 7;
        marks.push([x, y - 3, x + (rng() - 0.5) * 4, y + 7 + rng() * 7]);
      }
    }
  }
  if (!marks.length) return;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = INK.rockDeep;
  g.globalAlpha = 0.45;
  g.lineWidth = 2.0;
  g.beginPath();
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    g.moveTo(m[0], m[1]);
    g.lineTo(m[2], m[3]);
  }
  g.stroke();
  g.restore();
}

/** Küstenlinie und Bodendetails. */
function paintGroundInk(g, world, tx0, ty0, ring) {
  const r = Math.min(ring, 1);
  // Brandung zuerst: eine breite weiße Linie, die um die Küste herumwandert.
  // Der andere Zitterwert lässt sie neben der Tuschelinie laufen – so entsteht
  // der Schaumsaum der Vorlage statt einer sauberen Doppellinie.
  contour(g, world, tx0, ty0, r, isWalkable, 5.5, '#ffffff', 0.5, 19);
  contour(g, world, tx0, ty0, r, isWalkable, 3.2, INK.line, 0.9, 13);
  contour(g, world, tx0, ty0, r,
    function (t) { return t !== T.SAND && isWalkable(t); },
    1.7, INK.lineSoft, 0.3, 9);
  // Der Felsboden liegt höher als die Wiese. Eine kräftigere Kante plus kurze
  // Striche darunter lassen ihn als flache Stufe lesen – wie die Kreidekanten
  // der Vorlage, aber ohne eine Wand über begehbaren Boden zu malen.
  contour(g, world, tx0, ty0, r,
    function (t) { return t === T.ROCKFLOOR; },
    2.6, INK.rockDeep, 0.65, 11);
  rockStep(g, world, tx0, ty0, r);

  // Bodendetails: Grasbüschel, Kiesel, Wellenkringel.
  // Alles in wenigen Sammelpfaden – tausend einzelne stroke()-Aufrufe pro
  // Bodenstück waren der Grund, warum die Bildrate beim Laufen einbrach.
  const grass = [];
  const waves = [];
  const scratches = [];
  const pebbles = [];
  const fronds = [];

  for (let ty = ty0 - 1; ty < ty0 + CHUNK_TILES + 1; ty++) {
    for (let tx = tx0 - 1; tx < tx0 + CHUNK_TILES + 1; tx++) {
      const t = world.tileAtTile(tx, ty);
      const rng = makeRng(hashString('d' + tx + ':' + ty));
      const bx = (tx + 0.2 + rng() * 0.6) * TILE_SIZE;
      const by = (ty + 0.2 + rng() * 0.6) * TILE_SIZE;
      if (t === T.GRASS) {
        // Zwei Büschel je Kachel statt einem: die Wiese der Vorlage ist
        // durchgehend bewachsen, nicht stellenweise.
        for (let k = 0; k < 2; k++) {
          if (rng() > 0.72) continue;
          const gx = (tx + rng()) * TILE_SIZE;
          const gy = (ty + rng()) * TILE_SIZE;
          const blades = 2 + ((rng() * 3) | 0);
          for (let i = 0; i < blades; i++) {
            const x = gx + (i - (blades - 1) / 2) * 6;
            grass.push([x, gy + 7, x + (rng() - 0.5) * 11, gy - 8 - rng() * 11]);
          }
        }
        // Farnwedel: ein Bogen mit Fiedern, gibt der Wiese Struktur
        if (rng() < 0.16) fronds.push([bx, by, rng() < 0.5 ? -1 : 1]);
      } else if (t === T.SAND) {
        if (rng() < 0.5) {
          pebbles.push([bx, by, 3.5 + rng() * 1.5]);
          pebbles.push([bx + 11, by + 5, 3 + rng()]);
        }
        // Rippelmarken im Sand
        if (rng() < 0.4) {
          const y = (ty + rng()) * TILE_SIZE;
          scratches.push([(tx + 0.05) * TILE_SIZE, y, (tx + 0.85) * TILE_SIZE, y + (rng() - 0.5) * 9]);
        }
      } else if (isWater(t)) {
        if (rng() < 0.35) waves.push([bx, by, 8 + rng() * 14, 0.5 + rng(), 3.2 + rng()]);
      } else if (t === T.ROCKFLOOR) {
        if (rng() < 0.45) scratches.push([bx - 9, by, bx + 10, by - 4]);
        if (rng() < 0.3) pebbles.push([bx + 6, by + 12, 3 + rng() * 2]);
      } else if (t === T.DIRT && rng() < 0.35) {
        pebbles.push([bx, by, 2.5 + rng() * 1.5]);
      }
    }
  }

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';

  if (grass.length) {
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.42;
    g.lineWidth = 1.7;
    g.beginPath();
    for (let i = 0; i < grass.length; i++) {
      const b = grass[i];
      g.moveTo(b[0], b[1]);
      g.quadraticCurveTo((b[0] + b[2]) / 2 - 3, (b[1] + b[3]) / 2, b[2], b[3]);
    }
    g.stroke();
  }

  if (fronds.length) {
    // Neutrale Tinte, kein Grün: die Tintenschicht bleibt auch im
    // unkolorierten Zustand sichtbar und wäre sonst ein Farbfleck im Malbuch.
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.5;
    g.lineWidth = 1.8;
    g.beginPath();
    for (let i = 0; i < fronds.length; i++) {
      const f = fronds[i];
      const dir = f[2];
      g.moveTo(f[0], f[1] + 9);
      g.quadraticCurveTo(f[0] + dir * 6, f[1] - 4, f[0] + dir * 17, f[1] - 13);
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        const px = f[0] + dir * (6 * 2 * t * (1 - t) + 17 * t * t);
        const py = f[1] + 9 + (-13 * 2 * t * (1 - t) - 22 * t * t);
        g.moveTo(px, py);
        g.lineTo(px + dir * 7, py - 5);
        g.moveTo(px, py);
        g.lineTo(px - dir * 4, py - 6);
      }
    }
    g.stroke();
  }

  if (scratches.length) {
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.35;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < scratches.length; i++) {
      const b = scratches[i];
      g.moveTo(b[0], b[1]);
      g.quadraticCurveTo((b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + 4, b[2], b[3]);
    }
    g.stroke();
  }

  if (waves.length) {
    g.strokeStyle = '#ffffff';
    g.globalAlpha = 0.5;
    g.lineWidth = 1.8;
    g.beginPath();
    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      g.moveTo(w[0] + Math.cos(w[3]) * w[2], w[1] + Math.sin(w[3]) * w[2]);
      g.arc(w[0], w[1], w[2], w[3], w[4]);
    }
    g.stroke();
  }

  if (pebbles.length) {
    g.globalAlpha = 0.5;
    g.fillStyle = '#bcaf90';
    g.beginPath();
    for (let i = 0; i < pebbles.length; i++) {
      const b = pebbles[i];
      g.moveTo(b[0] + b[2], b[1]);
      g.ellipse(b[0], b[1], b[2], b[2] * 0.72, 0, 0, Math.PI * 2);
    }
    g.fill();
  }
  g.restore();
}

/* ------------------------------------------------- Aufstellbare Bodenstücke */

/** Kleine Bodenflächen zum Aufstellen: Steinweg und Brückenplanken. */
export function paintGroundDecal(kind, seed) {
  const s = TILE_SIZE;
  const color = makeCanvas(s, s);
  const cctx = ctx2d(color);
  const line = makeCanvas(s, s);
  const lctx = ctx2d(line);
  const rng = makeRng(seed);

  function draw(g, pale) {
    g.imageSmoothingEnabled = true;
    if (kind === 'path') {
      const stones = [];
      for (let i = 0; i < 4; i++) {
        const x = s * (0.28 + (i % 2) * 0.44);
        const y = s * (0.28 + Math.floor(i / 2) * 0.44);
        stones.push(smoothClosed(blob(x, y, s * 0.19, s * 0.16, seed + i, 0.18, 12), 5));
      }
      g.fillStyle = pale ? '#e7e2d4' : '#d5c8ad';
      for (let i = 0; i < stones.length; i++) { pathFrom(g, stones[i], true); g.fill(); }
      for (let i = 0; i < stones.length; i++) {
        inkStroke(g, stones[i], { width: 2.0, vary: 0.3, seed: seed + 10 + i, color: INK.line, alpha: 0.8 });
      }
    } else {
      g.fillStyle = pale ? '#e9e3d3' : INK.wood;
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 3; i++) {
        const y = (i + 1) * (s / 4) + (rng() - 0.5) * 3;
        inkLine(g, -2, y, s + 2, y + (rng() - 0.5) * 4,
          { width: 2.0, bend: 0.02, seed: seed + 20 + i, color: INK.line, alpha: 0.7 });
      }
      inkLine(g, 1, 0, 1, s, { width: 2.4, bend: 0, seed: seed + 30, color: INK.line, alpha: 0.6 });
      inkLine(g, s - 1, 0, s - 1, s, { width: 2.4, bend: 0, seed: seed + 31, color: INK.line, alpha: 0.6 });
    }
  }

  draw(cctx, false);
  draw(lctx, true);
  return { color: color, line: line, w: s, h: s, ax: s / 2, ay: s / 2 };
}
