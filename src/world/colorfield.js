/**
 * Farbfeld – das Herzstueck der Insel.
 *
 * Die Welt wird entsaettigt gezeichnet. Ueberall dort, wo eine „Farbquelle“
 * sitzt (ein zufriedener Geist, das Lagerfeuer), wird die farbige Fassung
 * durch eine weiche Maske eingeblendet.
 */
import { TILE_SIZE, MAP_W, MAP_H } from './worldgen.js';
import { isWalkable } from '../art/tiles.js';

export class ColorField {
  constructor() {
    this.sources = [];
    this._coverage = 0;
    this._dirty = true;
  }

  addSource(x, y, r, key) {
    const existing = key ? this.find(key) : null;
    if (existing) {
      existing.x = x;
      existing.y = y;
      if (r > existing.r) existing.target = r;
      this._dirty = true;
      return existing;
    }
    const s = { x: x, y: y, r: 0, target: r, key: key || null };
    this.sources.push(s);
    this._dirty = true;
    return s;
  }

  find(key) {
    for (let i = 0; i < this.sources.length; i++) {
      if (this.sources[i].key === key) return this.sources[i];
    }
    return null;
  }

  grow(key, amount) {
    const s = this.find(key);
    if (!s) return null;
    s.target += amount;
    this._dirty = true;
    return s;
  }

  /** Weiches Nachwachsen, damit Farbe sichtbar „ausblueht“. */
  update(dt) {
    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i];
      if (s.r < s.target) {
        s.r = Math.min(s.target, s.r + (s.target - s.r) * Math.min(1, dt * 1.6) + dt * 6);
        this._dirty = true;
      }
    }
  }

  /** 0 = grau, 1 = volle Farbe. */
  at(x, y) {
    let best = 0;
    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i];
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= s.r) continue;
      const inner = s.r * 0.55;
      const v = d <= inner ? 1 : 1 - (d - inner) / (s.r - inner);
      if (v > best) best = v;
    }
    return best;
  }

  /** Anteil der eingefaerbten Landflaeche (0..1). Wird gepuffert. */
  coverage(world) {
    if (!this._dirty) return this._coverage;
    let land = 0;
    let colored = 0;
    const step = 2; // jede zweite Kachel abtasten – reicht fuer die Anzeige
    for (let ty = 0; ty < MAP_H; ty += step) {
      for (let tx = 0; tx < MAP_W; tx += step) {
        if (!isWalkable(world.tileAtTile(tx, ty))) continue;
        land++;
        if (this.at((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE) > 0.5) colored++;
      }
    }
    this._coverage = land ? colored / land : 0;
    this._dirty = false;
    return this._coverage;
  }

  markDirty() {
    this._dirty = true;
  }

  /** Sind im Sichtfeld ueberhaupt Farbquellen? */
  visibleSources(camX, camY, w, h) {
    const out = [];
    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i];
      if (s.r <= 0) continue;
      if (s.x + s.r < camX || s.x - s.r > camX + w) continue;
      if (s.y + s.r < camY || s.y - s.r > camY + h) continue;
      out.push(s);
    }
    return out;
  }

  /** Zeichnet die Maske (weiss = Farbe) in Bildschirmkoordinaten. */
  drawMask(ctx, camX, camY, sources) {
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      const x = s.x - camX;
      const y = s.y - camY;
      const grad = ctx.createRadialGradient(x, y, Math.max(1, s.r * 0.55), x, y, s.r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.72)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - s.r, y - s.r, s.r * 2, s.r * 2);
    }
  }

  toJSON() {
    return this.sources.map(function (s) {
      return { x: Math.round(s.x), y: Math.round(s.y), r: Math.round(s.r), t: Math.round(s.target), k: s.key };
    });
  }

  static fromJSON(list) {
    const f = new ColorField();
    if (!list) return f;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      f.sources.push({ x: s.x, y: s.y, r: s.r, target: s.t != null ? s.t : s.r, key: s.k || null });
    }
    f._dirty = true;
    return f;
  }
}
