/**
 * Farbfeld – das Herzstück der Insel.
 *
 * Die Welt wird entsättigt gezeichnet. Überall dort, wo eine „Farbquelle“
 * sitzt (ein zufriedener Geist, das Lagerfeuer), wird die farbige Fassung
 * durch eine weiche Maske eingeblendet.
 */
import { TILE_SIZE, MAP_W, MAP_H } from './worldgen.js';
import { isWalkable } from '../art/tiles.js';

/**
 * Welcher Radius entsteht, wenn zu einem Kreis mit Radius `r` die Fläche
 * `area` dazukommt.
 *
 * πr² + A = πR², also R = √(r² + A/π). Bei r = 0 wächst der Kreis kräftig,
 * bei r = 800 nur noch um ein paar Pixel – genau der Verlauf, den ein
 * Fortschrittsbalken braucht, der Wochen halten soll.
 */
export function radiusForArea(r, area) {
  return Math.sqrt(r * r + Math.max(0, area) / Math.PI);
}

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

  /**
   * Wachsen um eine FLÄCHE statt um einen Radius.
   *
   * Der Unterschied entscheidet, wie lange das Spiel trägt. Mit festem
   * Radiuszuwachs färbt der hundertste Auftrag ein Vielfaches dessen ein, was
   * der erste einfärbte – die Anzeige raste. Gemessen stand sie nach rund 130
   * Aufträgen auf 100 %, also nach knapp zwei Wochen; danach stieg nichts mehr.
   *
   * Gleiche Fläche je Auftrag ist die ehrlichere Regel: Jede Bitte bringt
   * gleich viel Insel zurück, und weil ein großer Kreis dafür weniger Radius
   * braucht, streckt sich der Bogen von selbst. Gemessen: 100 % erst bei rund
   * 330 Aufträgen. Die ersten Tage fühlen sich dabei fast unverändert an
   * (Auftrag 1: 5,3 % vorher, 4,7 % jetzt) – gestreckt wird das Ende.
   */
  growByArea(key, area) {
    const s = this.find(key);
    if (!s) return null;
    s.target = radiusForArea(s.target, area);
    this._dirty = true;
    return s;
  }

  /**
   * Setzt ein Ziel absolut – auch nach unten.
   *
   * `grow` kann nur wachsen, und für Erledigtes ist das richtig: einmal
   * zurückgebrachte Farbe bleibt. Die Gemütlichkeit einer Ecke hängt aber
   * daran, was dort gerade steht; nimmt man die Deko weg, muss der Kreis
   * wieder schrumpfen können.
   */
  setTarget(x, y, value, key) {
    let s = this.find(key);
    if (!s) {
      if (value <= 0) return null;
      s = { x: x, y: y, r: 0, target: value, key: key };
      this.sources.push(s);
    } else {
      s.x = x;
      s.y = y;
      s.target = value;
    }
    this._dirty = true;
    return s;
  }

  /** Weiches Nachwachsen, damit Farbe sichtbar „ausblüht“ – und Schrumpfen. */
  update(dt) {
    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i];
      if (s.r < s.target) {
        s.r = Math.min(s.target, s.r + (s.target - s.r) * Math.min(1, dt * 1.6) + dt * 6);
        this._dirty = true;
      } else if (s.r > s.target) {
        // Langsamer als das Wachsen: Farbe soll nicht wegzucken, wenn man
        // eine Bank nur versetzt.
        s.r = Math.max(s.target, s.r - (s.r - s.target) * Math.min(1, dt * 0.9) - dt * 4);
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

  /** Anteil der eingefärbten Landfläche (0..1). Wird gepuffert. */
  coverage(world) {
    if (!this._dirty) return this._coverage;
    let land = 0;
    let colored = 0;
    const step = 2; // jede zweite Kachel abtasten – reicht für die Anzeige
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

  /** Sind im Sichtfeld überhaupt Farbquellen? */
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

  /**
   * Zeichnet die Maske (weiß = Farbe) in Weltkoordinaten.
   *
   * Die Quellen werden normal übereinandergelegt und vereinigen sich dadurch.
   * Der Verlauf ist bewusst genau derselbe wie in `at()`: linear von voller
   * Deckung bei 0,55·r bis null am Rand. Vorher hatte die Maske bei 0,865·r
   * noch 0,72 Deckung, `at()` dort aber nur 0,30 – der Boden war also viel
   * farbiger als die Bäume, die darauf standen.
   */
  drawMask(ctx, sources) {
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      const x = s.x;
      const y = s.y;
      const grad = ctx.createRadialGradient(x, y, Math.max(1, s.r * 0.55), x, y, s.r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
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
