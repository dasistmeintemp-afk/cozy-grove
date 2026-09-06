/**
 * Symbole für Tasche, Aufgabenkarten und HUD – im selben Malstil.
 * Größere Gegenstände borgen sich ihre Weltgrafik und werden hineinskaliert,
 * alles andere ist eigens gezeichnet.
 */
import {
  blob, teardrop, smoothClosed, offsetShape,
  inkStroke, inkLine, wash, paintObject,
} from './brush.js';
import { INK as ink, fill, dot } from './painted.js';
import { makeCanvas, ctx2d } from '../core/util.js';

export const ICON_SIZE = 64;

/** Nimmt eine fertige Weltgrafik und passt sie in ein Symbolquadrat ein. */
export function iconFromArt(art, opts) {
  const o = opts || {};
  const s = ICON_SIZE;
  const pad = o.pad == null ? 4 : o.pad;
  const scale = Math.min((s - pad * 2) / art.w, (s - pad * 2) / art.h);
  const dw = art.w * scale;
  const dh = art.h * scale;
  const dx = (s - dw) / 2;
  const dy = (s - dh) / 2;

  function shrink(src) {
    const c = makeCanvas(s, s);
    const ctx = ctx2d(c);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, dx, dy, dw, dh);
    return c;
  }
  return { color: shrink(art.color), line: shrink(art.line), w: s, h: s, ax: s / 2, ay: s };
}

/**
 * Symbole haben eine feste Kantenlänge, weil die Oberfläche damit rechnet.
 * Gemalt wird trotzdem mit Rand – sonst schneidet die Leinwand die Kontur ab –
 * und das Ergebnis anschließend wieder auf die Sollgröße gebracht.
 */
function fitIcon(res) {
  const m = res.margin || 0;
  const s = ICON_SIZE;
  if (!m) return { color: res.color, line: res.line, w: s, h: s, ax: s / 2, ay: s };
  const full = s + m * 2;
  function shrink(src) {
    const c = makeCanvas(s, s);
    const ctx = ctx2d(c);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, full, full, 0, 0, s, s);
    return c;
  }
  return { color: shrink(res.color), line: shrink(res.line), w: s, h: s, ax: s / 2, ay: s };
}

function icon(seed, washFn, shapeFn, inkFn, opts) {
  const o = opts || {};
  const res = paintObject(ICON_SIZE, ICON_SIZE, {
    seed: seed,
    blur: o.blur == null ? 2 : o.blur,
    outline: o.outline == null ? 2.4 : o.outline,
    wash: washFn,
    shape: shapeFn,
    ink: inkFn,
  });
  return fitIcon(res);
}

const C = ICON_SIZE / 2;

/* ------------------------------------------------------------- Rohstoffe -- */

function logShape(cx, cy, len, r, seed) {
  return smoothClosed([
    [cx - len, cy - r], [cx + len, cy - r * 1.1],
    [cx + len, cy + r], [cx - len, cy + r * 1.1],
  ], 5);
}

export const ICON_PAINTERS = {
  wood: function () {
    const body = logShape(C, C + 2, 22, 11, 11);
    const cap = smoothClosed(blob(C - 21, C + 2, 6, 11, 12, 0.1, 12), 5);
    return icon(11,
      function (g) {
        wash(g, body, ink.bark, { seed: 13, scale: 1.05 });
        wash(g, offsetShape(body, 0, 6, 0.85), ink.barkDark, { seed: 14, alpha: 0.6 });
        wash(g, cap, ink.trunk, { seed: 15 });
      },
      function (g) { fill(g, body); fill(g, cap); },
      function (g) {
        inkStroke(g, cap, { width: 1.8, vary: 0.3, seed: 16, color: ink.line, alpha: 0.8 });
        inkStroke(g, offsetShape(cap, 0, 0, 0.5), { width: 1.3, vary: 0.3, seed: 17, color: ink.line, alpha: 0.5 });
      });
  },
  hardwood: function () {
    const a = logShape(C, C - 7, 20, 8, 21);
    const b = logShape(C + 2, C + 11, 18, 8, 22);
    return icon(21,
      function (g) {
        wash(g, a, ink.barkDark, { seed: 23, scale: 1.04 });
        wash(g, b, ink.bark, { seed: 24, scale: 1.04 });
      },
      function (g) { fill(g, a); fill(g, b); },
      function (g) { inkStroke(g, b, { width: 1.6, vary: 0.3, seed: 25, color: ink.line, alpha: 0.6 }); });
  },
  stone: function () {
    const body = smoothClosed(blob(C, C + 4, 22, 18, 31, 0.16, 16), 5);
    return icon(31,
      function (g) {
        wash(g, body, ink.rock, { seed: 32, scale: 1.06 });
        wash(g, offsetShape(body, 8, 6, 0.66), ink.rockShade, { seed: 33, alpha: 0.75 });
      },
      function (g) { fill(g, body); },
      function (g) { inkLine(g, C - 6, C - 10, C + 2, C + 8, { width: 1.5, bend: 0.15, seed: 34, alpha: 0.5 }); });
  },
  copper_ore: function () {
    const body = smoothClosed(blob(C, C + 4, 22, 18, 41, 0.16, 16), 5);
    return icon(41,
      function (g) {
        wash(g, body, ink.rock, { seed: 42, scale: 1.06 });
        wash(g, offsetShape(body, 8, 6, 0.66), ink.rockShade, { seed: 43, alpha: 0.7 });
        dot(g, null, C - 5, C + 2, 7, ink.copper, 44);
        dot(g, null, C + 9, C + 10, 5, ink.copper, 45);
      },
      function (g) { fill(g, body); },
      function (g) { dot(null, g, C - 5, C + 2, 7, ink.copper, 44); dot(null, g, C + 9, C + 10, 5, ink.copper, 45); });
  },
  fiber: function () {
    return icon(51, function (g) {
      wash(g, smoothClosed(blob(C, C + 16, 16, 7, 52, 0.2, 12), 4), ink.grass, { seed: 53, alpha: 0.8 });
    }, null, function (g) {
      const angles = [-0.5, -0.2, 0.05, 0.3, 0.55];
      for (let i = 0; i < angles.length; i++) {
        inkLine(g, C - 12 + i * 6, C + 20, C - 20 + i * 10 + angles[i] * 14, C - 18,
          { width: 2.2, bend: 0.2, seed: 54 + i, color: ink.lineSoft });
      }
    });
  },
  resin: function () {
    const drop = smoothClosed(teardrop(C, C + 2, 15, 20, 61, 0.1), 6);
    return icon(61,
      function (g) {
        wash(g, drop, '#eab54f', { seed: 62, scale: 1.06 });
        wash(g, offsetShape(drop, -4, -4, 0.5), '#f7dd94', { seed: 63, alpha: 0.9 });
      },
      function (g) { fill(g, drop); }, null);
  },
  clay: function () {
    const body = smoothClosed(blob(C, C + 8, 22, 14, 71, 0.12, 16), 5);
    return icon(71,
      function (g) {
        wash(g, body, '#c2825f', { seed: 72, scale: 1.05 });
        wash(g, offsetShape(body, -6, -5, 0.6), '#d9a181', { seed: 73, alpha: 0.8 });
      },
      function (g) { fill(g, body); }, null);
  },
  shell: function () {
    const body = smoothClosed([[C - 22, C + 16], [C - 16, C - 8], [C, C - 20], [C + 16, C - 8], [C + 22, C + 16]], 6);
    return icon(81,
      function (g) {
        wash(g, body, '#f7e6d4', { seed: 82, scale: 1.05 });
        wash(g, offsetShape(body, 6, 3, 0.6), '#e3c3a6', { seed: 83, alpha: 0.6 });
      },
      function (g) { fill(g, body); },
      function (g) {
        for (let i = -2; i <= 2; i++) {
          inkLine(g, C + i * 2, C - 16, C + i * 8, C + 14, { width: 1.4, bend: 0.05, seed: 84 + i, alpha: 0.5 });
        }
      });
  },
  feather: function () {
    const body = smoothClosed(blob(C + 2, C - 2, 12, 22, 91, 0.12, 16), 6);
    return icon(91,
      function (g) {
        wash(g, body, '#dde7ee', { seed: 92, scale: 1.05 });
        wash(g, offsetShape(body, 6, 4, 0.55), '#b9cbd8', { seed: 93, alpha: 0.7 });
      },
      function (g) { fill(g, body); },
      function (g) { inkLine(g, C - 6, C + 24, C + 6, C - 22, { width: 2.0, bend: 0.06, seed: 94 }); });
  },
  driftwood: function () {
    // Schräg gestellter Ast mit Gabel – als Blase war er nicht von einem
    // Kiesel zu unterscheiden.
    const body = smoothClosed([
      [C - 24, C + 14], [C - 18, C + 6], [C + 6, C - 6], [C + 24, C - 16],
      [C + 26, C - 9], [C + 10, C + 1], [C - 14, C + 20],
    ], 6);
    const fork = smoothClosed([
      [C + 2, C - 1], [C + 12, C - 20], [C + 18, C - 22],
      [C + 15, C - 15], [C + 8, C + 3],
    ], 6);
    return icon(101,
      function (g) {
        wash(g, body, '#e2d7c1', { seed: 102, scale: 1.05 });
        wash(g, fork, '#ddd0b8', { seed: 105, scale: 1.04 });
        wash(g, offsetShape(body, 4, 5, 0.75), '#b8a68a', { seed: 103, alpha: 0.6 });
      },
      function (g) { fill(g, body); fill(g, fork); },
      function (g) {
        inkLine(g, C - 18, C + 10, C + 20, C - 12, { width: 1.4, bend: 0.05, seed: 104, alpha: 0.5 });
      });
  },

  /* ------------------------------------------------------------ Sammelgut */

  berry: function () {
    const a = smoothClosed(blob(C - 8, C + 8, 11, 11, 111, 0.1, 12), 5);
    const b = smoothClosed(blob(C + 9, C + 10, 10, 10, 112, 0.1, 12), 5);
    const c = smoothClosed(blob(C + 1, C - 6, 11, 11, 113, 0.1, 12), 5);
    return icon(111,
      function (g) {
        wash(g, a, '#b8455a', { seed: 114 });
        wash(g, b, '#b8455a', { seed: 115 });
        wash(g, c, ink.berry, { seed: 116 });
      },
      function (g) { fill(g, a); fill(g, b); fill(g, c); },
      function (g) {
        inkStroke(g, c, { width: 1.6, vary: 0.3, seed: 117, color: ink.line, alpha: 0.6 });
        inkLine(g, C + 2, C - 16, C + 10, C - 24, { width: 2.0, bend: 0.2, seed: 118, color: ink.lineSoft });
      });
  },
  mushroom: function () {
    const stem = smoothClosed([[C - 8, C + 22], [C - 10, C], [C + 10, C], [C + 8, C + 22]], 4);
    const cap = smoothClosed(blob(C, C - 6, 24, 16, 121, 0.1, 16), 5);
    return icon(121,
      function (g) {
        wash(g, stem, ink.mushroomStem, { seed: 122 });
        wash(g, cap, ink.mushroomCap, { seed: 123, scale: 1.06 });
        wash(g, offsetShape(cap, 8, 4, 0.55), '#c25344', { seed: 124, alpha: 0.5 });
        dot(g, null, C - 8, C - 10, 5, '#fdf3e2', 125);
        dot(g, null, C + 8, C - 4, 4, '#fdf3e2', 126);
      },
      function (g) { fill(g, stem); fill(g, cap); },
      function (g) { inkStroke(g, cap, { width: 1.8, vary: 0.3, seed: 127, color: ink.line, alpha: 0.5 }); });
  },
  herb: function () {
    const l1 = smoothClosed(blob(C - 14, C + 4, 13, 8, 131, 0.2, 12), 5);
    const l2 = smoothClosed(blob(C + 15, C - 4, 12, 8, 132, 0.2, 12), 5);
    const l3 = smoothClosed(blob(C - 1, C - 16, 10, 9, 133, 0.2, 12), 5);
    return icon(131,
      function (g) {
        wash(g, l1, ink.leafDark, { seed: 134, scale: 1.06 });
        wash(g, l2, ink.leafDark, { seed: 135, scale: 1.06 });
        wash(g, l3, ink.leaf, { seed: 136, scale: 1.06 });
      },
      function (g) { fill(g, l1); fill(g, l2); fill(g, l3); },
      function (g) { inkLine(g, C, C + 24, C - 1, C - 14, { width: 2.0, bend: 0.06, seed: 137, color: ink.lineSoft }); });
  },

  /* ---------------------------------------------------------- Fundstücke */

  bone: function () {
    const shaft = smoothClosed([[C - 14, C + 12], [C + 12, C - 14], [C + 18, C - 8], [C - 8, C + 18]], 5);
    const k1 = smoothClosed(blob(C - 15, C + 15, 9, 9, 141, 0.12, 12), 5);
    const k2 = smoothClosed(blob(C + 15, C - 15, 9, 9, 142, 0.12, 12), 5);
    return icon(141,
      function (g) {
        wash(g, shaft, ink.bone, { seed: 143, scale: 1.05 });
        wash(g, k1, ink.bone, { seed: 144 });
        wash(g, k2, ink.bone, { seed: 145 });
        wash(g, offsetShape(shaft, 5, 5, 0.7), '#ddd3bb', { seed: 146, alpha: 0.6 });
      },
      function (g) { fill(g, shaft); fill(g, k1); fill(g, k2); }, null);
  },
  shard: function () {
    const body = smoothClosed([[C - 16, C + 18], [C - 10, C - 12], [C + 6, C - 20], [C + 18, C + 2], [C + 8, C + 20]], 5);
    return icon(151,
      function (g) {
        wash(g, body, '#d59a72', { seed: 152, scale: 1.05 });
        wash(g, offsetShape(body, -6, -6, 0.55), '#eec19c', { seed: 153, alpha: 0.8 });
      },
      function (g) { fill(g, body); },
      function (g) { inkLine(g, C - 8, C - 10, C + 4, C + 14, { width: 1.5, bend: 0.1, seed: 154, alpha: 0.55 }); });
  },
  bottle: function () {
    const body = smoothClosed([[C - 13, C + 20], [C - 14, C - 2], [C - 6, C - 14], [C + 6, C - 14], [C + 14, C - 2], [C + 13, C + 20]], 6);
    const neck = smoothClosed([[C - 6, C - 12], [C + 6, C - 12], [C + 5, C - 24], [C - 5, C - 24]], 4);
    return icon(161,
      function (g) {
        wash(g, body, ink.glass, { seed: 162, scale: 1.05 });
        wash(g, neck, ink.glass, { seed: 163 });
        wash(g, offsetShape(body, -6, 0, 0.4), '#e6f6f8', { seed: 164, alpha: 0.9 });
      },
      function (g) { fill(g, body); fill(g, neck); },
      function (g) {
        const cork = smoothClosed([[C - 5, C - 22], [C + 5, C - 22], [C + 5, C - 30], [C - 5, C - 30]], 4);
        g.fillStyle = ink.wood;
        fill(g, cork);
        inkStroke(g, cork, { width: 1.8, vary: 0.3, seed: 165, color: ink.line });
      });
  },
  gem: function () {
    const body = smoothClosed([[C, C - 22], [C + 20, C - 4], [C, C + 22], [C - 20, C - 4]], 4);
    return icon(171,
      function (g) {
        wash(g, body, '#63c0d8', { seed: 172, scale: 1.05 });
        wash(g, offsetShape(body, -5, -5, 0.5), '#a8e6f2', { seed: 173, alpha: 0.9 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkLine(g, C - 20, C - 4, C + 20, C - 4, { width: 1.6, bend: 0.03, seed: 174, alpha: 0.6 });
        inkLine(g, C, C - 22, C, C + 22, { width: 1.4, bend: 0.02, seed: 175, alpha: 0.45 });
      });
  },
  coin_pouch: function () {
    const body = smoothClosed(blob(C, C + 8, 20, 18, 181, 0.1, 16), 5);
    const neck = smoothClosed([[C - 10, C - 8], [C + 10, C - 8], [C + 8, C - 18], [C - 8, C - 18]], 4);
    return icon(181,
      function (g) {
        wash(g, body, '#c49a5e', { seed: 182, scale: 1.05 });
        wash(g, offsetShape(body, 7, 5, 0.62), '#a37d45', { seed: 183, alpha: 0.65 });
        wash(g, neck, '#a37d45', { seed: 184 });
      },
      function (g) { fill(g, body); fill(g, neck); },
      function (g) {
        inkLine(g, C - 12, C - 12, C + 12, C - 12, { width: 2.0, bend: 0.15, seed: 185, alpha: 0.8 });
        dot(null, g, C, C + 8, 7, ink.gold, 186);
      });
  },

  /* ---------------------------------------------------- Währung & Zustand */

  ember: function () {
    const outer = smoothClosed(teardrop(C, C + 4, 17, 24, 191, 0.14), 6);
    const inner = smoothClosed(teardrop(C + 1, C + 9, 9, 14, 192, 0.12), 6);
    return icon(191,
      function (g) {
        wash(g, outer, ink.emberDeep, { seed: 193, scale: 1.05 });
        wash(g, inner, ink.emberLight, { seed: 194 });
      },
      function (g) { fill(g, outer); }, null, { outline: 2.6 });
  },
  coin: function () {
    const body = smoothClosed(blob(C, C, 21, 21, 201, 0.05, 18), 6);
    return icon(201,
      function (g) {
        wash(g, body, ink.gold, { seed: 202, scale: 1.05 });
        wash(g, offsetShape(body, -5, -5, 0.55), '#f6e2a0', { seed: 203, alpha: 0.9 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkStroke(g, offsetShape(body, 0, 0, 0.62), { width: 1.8, vary: 0.3, seed: 204, color: ink.line, alpha: 0.65 });
      });
  },
  heart: function () {
    const body = smoothClosed([
      [C, C + 20], [C - 20, C - 2], [C - 18, C - 14], [C - 8, C - 18],
      [C, C - 8], [C + 8, C - 18], [C + 18, C - 14], [C + 20, C - 2],
    ], 7);
    return icon(211,
      function (g) {
        wash(g, body, '#e0798a', { seed: 212, scale: 1.05 });
        wash(g, offsetShape(body, -5, -5, 0.5), '#f4b0ba', { seed: 213, alpha: 0.85 });
      },
      function (g) { fill(g, body); }, null);
  },
  color: function () {
    const body = smoothClosed(blob(C, C, 21, 21, 221, 0.06, 18), 6);
    const half = smoothClosed([[C, C - 21], [C + 21, C], [C, C + 21]], 5);
    return icon(221,
      function (g) {
        wash(g, body, '#d8d4c6', { seed: 222, scale: 1.05 });
        wash(g, half, ink.leaf, { seed: 223 });
      },
      function (g) { fill(g, body); },
      function (g) { inkLine(g, C, C - 20, C, C + 20, { width: 1.8, bend: 0.02, seed: 224, alpha: 0.7 }); });
  },
  sparkle: function () {
    return icon(231, function (g) {
      wash(g, smoothClosed(blob(C, C, 13, 13, 232, 0.1, 12), 5), ink.emberLight, { seed: 233, alpha: 0.85 });
    }, null, function (g) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        inkLine(g, C + Math.cos(a) * 6, C + Math.sin(a) * 6, C + Math.cos(a) * 24, C + Math.sin(a) * 24,
          { width: 2.6, bend: 0, seed: 234 + i, color: ink.warm });
      }
    });
  },
  star: function () {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 22 : 9;
      pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
    }
    const body = smoothClosed(pts, 4);
    return icon(241,
      function (g) {
        wash(g, body, ink.gold, { seed: 242, scale: 1.04 });
        wash(g, offsetShape(body, -4, -4, 0.5), '#f6e2a0', { seed: 243, alpha: 0.85 });
      },
      function (g) { fill(g, body); }, null);
  },
  check: function () {
    return icon(251, function (g) {
      wash(g, smoothClosed(blob(C, C, 20, 20, 252, 0.08, 16), 5), '#b6d98f', { seed: 253, alpha: 0.75 });
    }, null, function (g) {
      inkLine(g, C - 14, C, C - 4, C + 12, { width: 4.2, bend: 0.05, seed: 254, color: '#4b7a37' });
      inkLine(g, C - 4, C + 12, C + 16, C - 14, { width: 4.2, bend: 0.05, seed: 255, color: '#4b7a37' });
    });
  },
  lock: function () {
    const body = smoothClosed([[C - 16, C + 20], [C + 16, C + 20], [C + 16, C - 4], [C - 16, C - 4]], 4);
    return icon(261,
      function (g) {
        wash(g, body, '#c8cbc0', { seed: 262, scale: 1.05 });
        wash(g, offsetShape(body, 6, 4, 0.6), '#a4a99c', { seed: 263, alpha: 0.6 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkLine(g, C - 9, C - 4, C - 9, C - 16, { width: 3.0, bend: 0, seed: 264 });
        inkLine(g, C - 9, C - 16, C + 9, C - 16, { width: 3.0, bend: 0.5, seed: 265 });
        inkLine(g, C + 9, C - 16, C + 9, C - 4, { width: 3.0, bend: 0, seed: 266 });
        dot(null, g, C, C + 8, 4, ink.line, 267);
      });
  },
  ghost: function () {
    const body = smoothClosed(blob(C, C - 4, 20, 19, 271, 0.08, 16), 6);
    const skirt = smoothClosed([
      [C - 20, C - 2], [C + 20, C - 2], [C + 18, C + 20], [C + 8, C + 12],
      [C, C + 20], [C - 8, C + 12], [C - 18, C + 20],
    ], 5);
    return icon(271,
      function (g) {
        wash(g, skirt, ink.fur, { seed: 272 });
        wash(g, body, ink.fur, { seed: 273, scale: 1.05 });
        wash(g, offsetShape(body, 7, 5, 0.6), ink.furShade, { seed: 274, alpha: 0.5 });
      },
      function (g) { fill(g, skirt); fill(g, body); },
      function (g) {
        g.fillStyle = ink.line;
        fill(g, smoothClosed(blob(C - 7, C - 5, 3, 4, 275, 0.08, 8), 4));
        fill(g, smoothClosed(blob(C + 7, C - 5, 3, 4, 276, 0.08, 8), 4));
      });
  },
  arrow: function () {
    const body = smoothClosed([
      [C, C - 22], [C + 18, C - 2], [C + 8, C - 2], [C + 8, C + 20],
      [C - 8, C + 20], [C - 8, C - 2], [C - 18, C - 2],
    ], 4);
    return icon(281,
      function (g) { wash(g, body, ink.warm, { seed: 282, scale: 1.04 }); },
      function (g) { fill(g, body); }, null);
  },
  day: function () {
    const body = smoothClosed(blob(C, C, 15, 15, 291, 0.06, 16), 6);
    return icon(291,
      function (g) {
        wash(g, body, ink.warm, { seed: 292, scale: 1.06 });
        wash(g, offsetShape(body, -3, -3, 0.5), ink.emberLight, { seed: 293, alpha: 0.9 });
      },
      function (g) { fill(g, body); },
      function (g) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          inkLine(g, C + Math.cos(a) * 19, C + Math.sin(a) * 19, C + Math.cos(a) * 27, C + Math.sin(a) * 27,
            { width: 2.6, bend: 0, seed: 294 + i, color: ink.warm });
        }
      });
  },
  clock: function () {
    const body = smoothClosed(blob(C, C, 21, 21, 301, 0.05, 18), 6);
    return icon(301,
      function (g) {
        wash(g, body, '#e9e3d4', { seed: 302, scale: 1.05 });
        wash(g, offsetShape(body, 6, 5, 0.6), '#cfc8b6', { seed: 303, alpha: 0.5 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkLine(g, C, C, C, C - 13, { width: 2.6, bend: 0, seed: 304 });
        inkLine(g, C, C, C + 11, C + 5, { width: 2.4, bend: 0, seed: 305 });
      });
  },
  quest: function () {
    const body = smoothClosed([[C - 16, C - 22], [C + 16, C - 22], [C + 16, C + 22], [C - 16, C + 22]], 4);
    return icon(311,
      function (g) {
        wash(g, body, '#f6f0e0', { seed: 312, scale: 1.04 });
        wash(g, smoothClosed([[C - 16, C - 22], [C + 16, C - 22], [C + 16, C - 12], [C - 16, C - 12]], 4),
          ink.warm, { seed: 313 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkLine(g, C - 9, C - 4, C + 9, C - 4, { width: 2.0, bend: 0.02, seed: 314, alpha: 0.6 });
        inkLine(g, C - 9, C + 6, C + 9, C + 6, { width: 2.0, bend: 0.02, seed: 315, alpha: 0.6 });
        inkLine(g, C - 9, C + 16, C + 2, C + 16, { width: 2.0, bend: 0.02, seed: 316, alpha: 0.5 });
      });
  },
  bag: function () {
    const body = smoothClosed([[C - 19, C - 6], [C + 19, C - 6], [C + 22, C + 22], [C - 22, C + 22]], 5);
    return icon(321,
      function (g) {
        wash(g, body, '#c49a5e', { seed: 322, scale: 1.04 });
        wash(g, offsetShape(body, 8, 6, 0.62), '#a37d45', { seed: 323, alpha: 0.6 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkLine(g, C - 12, C - 6, C - 8, C - 22, { width: 2.4, bend: 0.25, seed: 324 });
        inkLine(g, C + 12, C - 6, C + 8, C - 22, { width: 2.4, bend: -0.25, seed: 325 });
        inkLine(g, C - 8, C - 22, C + 8, C - 22, { width: 2.4, bend: 0.3, seed: 326 });
      });
  },
  craft: function () {
    const head = smoothClosed([[C - 2, C - 22], [C + 20, C - 16], [C + 18, C - 4], [C - 4, C - 8]], 4);
    const shaft = smoothClosed([[C - 20, C + 22], [C - 10, C + 22], [C + 2, C - 10], [C - 6, C - 12]], 4);
    return icon(331,
      function (g) {
        wash(g, shaft, ink.wood, { seed: 332 });
        wash(g, head, ink.iron, { seed: 333, scale: 1.05 });
        wash(g, offsetShape(head, 5, 4, 0.6), ink.ironDark, { seed: 334, alpha: 0.6 });
      },
      function (g) { fill(g, shaft); fill(g, head); }, null);
  },
  map: function () {
    const body = smoothClosed([
      [C - 24, C - 16], [C - 8, C - 22], [C + 8, C - 16], [C + 24, C - 22],
      [C + 24, C + 16], [C + 8, C + 22], [C - 8, C + 16], [C - 24, C + 22],
    ], 5);
    return icon(341,
      function (g) {
        wash(g, body, '#f2e9d4', { seed: 342, scale: 1.04 });
        wash(g, smoothClosed(blob(C + 6, C + 2, 12, 8, 343, 0.2, 12), 5), ink.leaf, { seed: 344, alpha: 0.7 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkLine(g, C - 8, C - 20, C - 8, C + 18, { width: 1.6, bend: 0.02, seed: 345, alpha: 0.5 });
        inkLine(g, C + 8, C - 16, C + 8, C + 22, { width: 1.6, bend: 0.02, seed: 346, alpha: 0.5 });
        inkLine(g, C - 18, C + 8, C - 2, C - 6, { width: 2.0, bend: 0.2, seed: 347, color: ink.berry });
        inkLine(g, C + 12, C - 8, C + 18, C - 2, { width: 2.6, bend: 0, seed: 348, color: ink.berry });
        inkLine(g, C + 18, C - 8, C + 12, C - 2, { width: 2.6, bend: 0, seed: 349, color: ink.berry });
      });
  },
  gear: function () {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? 22 : 15;
      pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
    }
    const body = smoothClosed(pts, 3);
    return icon(351,
      function (g) {
        wash(g, body, '#c8cbc0', { seed: 352, scale: 1.04 });
        wash(g, offsetShape(body, 6, 5, 0.6), '#a4a99c', { seed: 353, alpha: 0.55 });
      },
      function (g) { fill(g, body); },
      function (g) {
        inkStroke(g, smoothClosed(blob(C, C, 7, 7, 354, 0.06, 12), 5),
          { width: 2.4, vary: 0.25, seed: 355, color: ink.line });
      });
  },
  campfire: function () {
    const flame = smoothClosed(teardrop(C, C - 4, 15, 22, 361, 0.14), 6);
    const logA = smoothClosed([[C - 22, C + 18], [C + 20, C + 10], [C + 22, C + 18], [C - 20, C + 24]], 4);
    return icon(361,
      function (g) {
        wash(g, logA, ink.bark, { seed: 362 });
        wash(g, flame, ink.ember, { seed: 363, scale: 1.05 });
        wash(g, offsetShape(flame, 0, 6, 0.5), ink.emberLight, { seed: 364 });
      },
      function (g) { fill(g, logA); fill(g, flame); }, null);
  },
};

/** Fisch-Symbol mit austauschbaren Farben. */
export function paintFishIcon(body, belly, fin, seed) {
  const s = ICON_SIZE;
  const cx = s / 2;
  const cy = s / 2;
  const shape = smoothClosed(blob(cx - 3, cy, 20, 13, seed, 0.09, 16), 6);
  const tail = smoothClosed([[cx + 14, cy], [cx + 28, cy - 14], [cx + 28, cy + 14]], 5);
  const finTop = smoothClosed([[cx - 6, cy - 10], [cx + 4, cy - 24], [cx + 8, cy - 8]], 5);

  const res = paintObject(s, s, {
    seed: seed,
    blur: 2,
    outline: 2.4,
    wash: function (g) {
      wash(g, tail, fin, { seed: seed + 1 });
      wash(g, finTop, fin, { seed: seed + 2 });
      wash(g, shape, body, { seed: seed + 3, scale: 1.05 });
      wash(g, offsetShape(shape, 0, 8, 0.7), belly, { seed: seed + 4, alpha: 0.85 });
    },
    shape: function (g) { fill(g, tail); fill(g, finTop); fill(g, shape); },
    ink: function (g) {
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx - 13, cy - 3, 3, 3.4, seed + 5, 0.08, 8), 4));
      inkLine(g, cx - 20, cy + 4, cx - 12, cy + 5, { width: 1.6, bend: 0.3, seed: seed + 6, alpha: 0.6 });
    },
  });
  return fitIcon(res);
}
