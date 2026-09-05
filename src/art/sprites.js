/**
 * Sprite-Register.
 * Jede Grafik wird beim Start in einen eigenen Canvas gemalt – einmal in Farbe,
 * einmal entsaettigt. Die entsaettigte Fassung ist die Standardansicht der Insel;
 * Farbe kommt erst zurueck, wenn Geister zufrieden sind.
 */
import { makeCanvas, ctx2d } from '../core/util.js';
import { Pixel } from './pixel.js';
import { desaturatePixels } from './palette.js';
import { PROPS } from './props.js';
import { ICONS } from './icons.js';
import { buildCritters } from './critters.js';

const registry = Object.create(null);
const iconUrlCache = Object.create(null);
let ready = false;

/**
 * Legt ein Sprite an.
 * @param {string} name
 * @param {number} w Breite in Pixeln
 * @param {number} h Hoehe in Pixeln
 * @param {number} ax Ankerpunkt X (meist Mitte)
 * @param {number} ay Ankerpunkt Y (meist Fussende)
 * @param {(g: Pixel, ctx: CanvasRenderingContext2D) => void} painter
 */
export function define(name, w, h, ax, ay, painter) {
  const canvas = makeCanvas(w, h);
  const ctx = ctx2d(canvas);
  const g = new Pixel(ctx);
  painter(g, ctx);
  const entry = { name: name, c: canvas, g: makeGray(canvas), w: w, h: h, ax: ax, ay: ay };
  registry[name] = entry;
  return entry;
}

/** Entsaettigt eine Kopie und zieht sie leicht ins Kuehle. */
function makeGray(source) {
  const out = makeCanvas(source.width, source.height);
  const ctx = ctx2d(out);
  ctx.drawImage(source, 0, 0);
  let img;
  try {
    img = ctx.getImageData(0, 0, out.width, out.height);
  } catch (err) {
    return out; // sollte nie passieren (alles selbst gemalt, kein Fremd-Bild)
  }
  desaturatePixels(img.data, null);
  ctx.putImageData(img, 0, 0);
  return out;
}

export function spr(name) {
  const s = registry[name];
  if (!s) {
    if (!spr._warned) spr._warned = Object.create(null);
    if (!spr._warned[name]) {
      spr._warned[name] = true;
      console.warn('Unbekanntes Sprite:', name);
    }
    return null;
  }
  return s;
}

export function hasSprite(name) {
  return !!registry[name];
}

/**
 * Zeichnet ein Sprite an Weltposition (Ankerpunkt).
 * @param {boolean} gray entsaettigte Fassung verwenden
 */
export function drawSprite(ctx, name, x, y, gray, opts) {
  const s = registry[name];
  if (!s) return;
  const o = opts || {};
  const img = gray ? s.g : s.c;
  const px = Math.round(x - s.ax);
  const py = Math.round(y - s.ay);

  if (!o.flip && !o.rotate && o.alpha == null && !o.scale) {
    ctx.drawImage(img, px, py);
    return;
  }
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.rotate) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(o.rotate);
    ctx.scale(o.flip ? -1 : 1, 1);
    ctx.drawImage(img, -s.ax, -s.ay);
  } else if (o.flip) {
    ctx.translate(Math.round(x), py);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -(s.w - s.ax), 0);
  } else {
    const sc = o.scale || 1;
    ctx.drawImage(img, px, py, s.w * sc, s.h * sc);
  }
  ctx.restore();
}

/** data-URL fuer DOM-Symbole (HUD, Panels). */
export function iconUrl(name) {
  if (iconUrlCache[name]) return iconUrlCache[name];
  const s = registry[name];
  if (!s) return '';
  let url = '';
  try {
    url = s.c.toDataURL('image/png');
  } catch (err) {
    url = '';
  }
  iconUrlCache[name] = url;
  return url;
}

/** Setzt ein DOM-Element als Symbol (background-image). */
export function applyIcon(el, name) {
  const url = iconUrl(name);
  if (url) el.style.backgroundImage = 'url(' + url + ')';
}

export function isArtReady() {
  return ready;
}

/** Baut das komplette Bildmaterial. Wird einmal beim Start aufgerufen. */
export function initArt() {
  if (ready) return;
  for (const key in PROPS) {
    const def = PROPS[key];
    define(key, def.w, def.h, def.ax, def.ay, def.paint);
  }
  for (const key in ICONS) {
    define('icon_' + key, 16, 16, 8, 16, ICONS[key]);
  }
  buildCritters(define);
  ready = true;
}
