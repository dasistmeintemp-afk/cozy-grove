/** Deterministischer Zufall – gleiche Saat, gleiche Insel. */

/** mulberry32: schnell, klein, ausreichend gute Verteilung. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Zufallsgenerator fuer einen bestimmten Tag – Tagesinhalte sind reproduzierbar. */
export function dailyRng(seed, day, salt) {
  return makeRng((hashString(String(seed) + ':' + day + ':' + (salt || '')) >>> 0));
}

export function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function randRange(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function randPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Wert-Rausch (value noise) mit bilinearer Interpolation.
 * Reicht voellig fuer Inselumrisse und Bodenvariation.
 */
export function makeNoise2D(seed) {
  const perm = new Uint8Array(512);
  const rng = makeRng(seed);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = base[i];
    base[i] = base[j];
    base[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  function grad(ix, iy) {
    return perm[(ix + perm[iy & 255]) & 255] / 255;
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  return function noise(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = grad(x0, y0);
    const b = grad(x0 + 1, y0);
    const c = grad(x0, y0 + 1);
    const d = grad(x0 + 1, y0 + 1);
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}

/** Mehrere Oktaven uebereinander – natuerlichere Formen. */
export function fbm(noise, x, y, octaves, lacunarity, gain) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
