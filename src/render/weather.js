/**
 * Wetter: Regen, Nebel und Schnee.
 *
 * Beides wird im Bildschirmraum gezeichnet, nicht in der Welt. Regen als
 * Partikel durch das normale System zu schicken hätte dessen Budget gesprengt –
 * ein paar hundert Striche direkt auf die Leinwand kosten fast nichts und
 * ziehen zudem sauber über den ganzen Bildschirm, egal wie die Kamera steht.
 *
 * Welches Wetter ein Tag hat, hängt nur an Inselzahl und Tag. Es steht damit
 * schon fest, bevor der Tag beginnt, und ist nach dem Laden dasselbe – ohne
 * dass etwas davon im Spielstand liegen muss.
 */
import { dailyRng } from '../core/rng.js';
import { seasonWeather } from '../game/seasons.js';
import { makeCanvas, ctx2d } from '../core/util.js';

export const WEATHER = { CLEAR: 'clear', RAIN: 'rain', FOG: 'fog', SNOW: 'snow' };

/**
 * Wie das Wetter heißt.
 *
 * Steht hier und nicht in der Oberfläche: Der Wetterhahn sagt das Wetter von
 * MORGEN an und hat dafür kein `Weather`-Objekt, sondern nur eine Kennung
 * aus `weatherFor`. Zwei Wörterlisten hießen, dass eine beim nächsten Wetter
 * vergessen wird.
 */
export const WEATHER_LABEL = {
  clear: 'Klar', rain: 'Regen', fog: 'Nebel', snow: 'Schnee',
};

/** Wie viele Tropfen bzw. Schwaden bei voller Stärke. */
const DROPS = 260;
const WISPS = 22;

/**
 * Das Wetter eines Tages. Tag 1 ist immer klar, damit der Start freundlich ist.
 *
 * Die Mischung hängt an der Jahreszeit: Vorher galt für jeden Tag im Jahr
 * dieselbe – 18 Prozent Regen, 16 Prozent Nebel –, und ein Julitag sah aus
 * wie ein Novembertag. Ohne Angabe gilt die Frühlingsmischung, damit alte
 * Aufrufe und Tests weiterlaufen.
 */
export function weatherFor(seed, day, season) {
  if (day <= 1) return { kind: WEATHER.CLEAR, strength: 0 };
  const m = seasonWeather(season);
  const r = dailyRng(seed, day, 'weather');
  const roll = r();
  let schwelle = m.snow || 0;
  if (roll < schwelle) return { kind: WEATHER.SNOW, strength: 0.45 + r() * 0.5 };
  schwelle += m.rain;
  if (roll < schwelle) return { kind: WEATHER.RAIN, strength: 0.55 + r() * 0.45 };
  schwelle += m.fog;
  if (roll < schwelle) return { kind: WEATHER.FOG, strength: 0.4 + r() * 0.4 };
  return { kind: WEATHER.CLEAR, strength: 0 };
}

export class Weather {
  constructor(rng) {
    this.rng = rng || Math.random;
    this.kind = WEATHER.CLEAR;
    this.strength = 0;   // was der Tag vorsieht
    this.level = 0;      // was gerade zu sehen ist – zieht der Stärke nach
    this.drops = [];
    this.wisps = [];
    this._t = 0;
  }

  /** Wetter des Tages setzen. Der Übergang läuft weich. */
  setDay(seed, day, season) {
    const w = weatherFor(seed, day, season);
    this.kind = w.kind;
    this.strength = w.strength;
  }

  /** Für Ladevorgänge: sofort auf den Zielwert, ohne Überblendung. */
  snap() {
    this.level = this.strength;
    this._fill();
  }

  get raining() {
    return this.kind === WEATHER.RAIN && this.level > 0.05;
  }

  get foggy() {
    return this.kind === WEATHER.FOG && this.level > 0.05;
  }

  get snowing() {
    return this.kind === WEATHER.SNOW && this.level > 0.05;
  }

  /** Name für die Anzeige. */
  get label() {
    if (this.raining) return WEATHER_LABEL.rain;
    if (this.foggy) return WEATHER_LABEL.fog;
    if (this.snowing) return WEATHER_LABEL.snow;
    return WEATHER_LABEL.clear;
  }

  _fill() {
    const rng = this.rng;
    const n = Math.round(DROPS * this.level);
    while (this.drops.length < n) {
      this.drops.push({
        x: rng(), y: rng(),
        len: 0.6 + rng() * 0.9,
        speed: 0.75 + rng() * 0.5,
      });
    }
    this.drops.length = Math.min(this.drops.length, n);

    const m = Math.round(WISPS * this.level);
    while (this.wisps.length < m) {
      this.wisps.push({
        x: rng(), y: rng(),
        r: 0.12 + rng() * 0.22,
        speed: 0.01 + rng() * 0.025,
        phase: rng() * 6.28,
      });
    }
    this.wisps.length = Math.min(this.wisps.length, m);
  }

  update(dt) {
    this._t += dt;
    // Weicher Übergang, damit Wetter nicht schlagartig einsetzt
    const step = dt * 0.25;
    if (this.level < this.strength) this.level = Math.min(this.strength, this.level + step);
    else if (this.level > this.strength) this.level = Math.max(this.strength, this.level - step);
    this._fill();

    if (this.kind === WEATHER.RAIN) {
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.y += d.speed * dt * 1.9;
        d.x += d.speed * dt * 0.26;
        if (d.y > 1.05) { d.y -= 1.15; d.x = this.rng(); }
        if (d.x > 1.05) d.x -= 1.1;
      }
    } else if (this.kind === WEATHER.SNOW) {
      // Schnee fällt langsam und pendelt seitlich. Mit der Bewegung des
      // Regens sah er aus wie weißer Regen; das Pendeln ist der ganze
      // Unterschied zwischen Tropfen und Flocke.
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.y += d.speed * dt * 0.30;
        d.x += Math.sin(this._t * 0.7 + d.len * 9) * dt * 0.045;
        if (d.y > 1.05) { d.y -= 1.15; d.x = this.rng(); }
        if (d.x > 1.05) d.x -= 1.1;
        if (d.x < -0.05) d.x += 1.1;
      }
    } else if (this.kind === WEATHER.FOG) {
      for (let i = 0; i < this.wisps.length; i++) {
        const w = this.wisps[i];
        w.x += w.speed * dt;
        if (w.x > 1.3) w.x -= 1.6;
      }
    }
  }

  /**
   * Wie stark der Tag zusätzlich abgedunkelt wird.
   * Regen macht die Insel kühler und grauer, Nebel nur heller und flacher.
   */
  tint() {
    if (this.level <= 0.02) return null;
    if (this.kind === WEATHER.RAIN) {
      return { r: 92, g: 104, b: 126, a: 0.2 * this.level };
    }
    if (this.kind === WEATHER.SNOW) {
      return { r: 214, g: 228, b: 244, a: 0.18 * this.level };
    }
    return { r: 236, g: 238, b: 234, a: 0.24 * this.level };
  }

  /** Eine weiche Nebelschwade, einmal gemalt und dann nur noch skaliert. */
  _wispTile() {
    if (this._wisp) return this._wisp;
    const size = 128;
    const c = makeCanvas(size, size);
    const g = ctx2d(c);
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(246,244,236,0.5)');
    grad.addColorStop(0.5, 'rgba(246,244,236,0.22)');
    grad.addColorStop(1, 'rgba(246,244,236,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this._wisp = c;
    return c;
  }

  /** Die Nebelschicht in Viertelauflösung, je Bild neu gemischt. */
  _fogLayer(w, h) {
    const sw = Math.max(2, Math.round(w / 4));
    const sh = Math.max(2, Math.round(h / 4));
    if (!this._fog || this._fog.width !== sw || this._fog.height !== sh) {
      this._fog = makeCanvas(sw, sh);
      this._fogCtx = ctx2d(this._fog);
    }
    const g = this._fogCtx;
    g.clearRect(0, 0, sw, sh);
    const wisp = this._wispTile();
    for (let i = 0; i < this.wisps.length; i++) {
      const s = this.wisps[i];
      const x = ((s.x % 1.6) - 0.3) * sw;
      const y = (s.y + Math.sin(this._t * 0.2 + s.phase) * 0.03) * sh;
      const r = s.r * sw;
      g.drawImage(wisp, x - r, y - r, r * 2, r * 2);
    }
    return this._fog;
  }

  /** Zeichnet im Bildschirmraum. */
  draw(ctx, w, h) {
    if (this.level <= 0.02) return;
    ctx.save();
    if (this.kind === WEATHER.RAIN) {
      ctx.strokeStyle = 'rgba(226,240,248,0.5)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55 * this.level;
      ctx.beginPath();
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        const x = d.x * w;
        const y = d.y * h;
        const l = d.len * 26;
        ctx.moveTo(x, y);
        ctx.lineTo(x - l * 0.22, y + l);
      }
      ctx.stroke();
    } else if (this.kind === WEATHER.SNOW) {
      ctx.fillStyle = 'rgba(250,252,255,0.92)';
      ctx.globalAlpha = 0.8 * this.level;
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        // `len` dient hier als Größe: vorn große Flocken, hinten kleine.
        const r = 1.1 + d.len * 2.0;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.kind === WEATHER.FOG) {
      // Nebel entsteht in Viertelauflösung und wird dann hochgezogen.
      //
      // Nicht die Farbverläufe kosten, sondern das Übereinanderblenden: 22
      // Schwaden über den ganzen Bildschirm sind fast zwei Megapixel Mischung
      // je Bild. In einem Viertel der Kantenlänge ist das ein Sechzehntel der
      // Arbeit – und weil Nebel weich ist, sieht man den Unterschied nicht.
      const small = this._fogLayer(w, h);
      ctx.globalAlpha = 0.5 * this.level;
      ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, w, h);
    }
    ctx.restore();
  }
}
