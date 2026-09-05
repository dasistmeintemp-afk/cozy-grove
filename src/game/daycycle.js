/** Tageslauf: Uhrzeit, Faerbung, Schlafen. */
import { clamp, lerp, pad2, hexToRgb } from '../core/util.js';

export const DAY_START = 6;      // Stunde beim Aufwachen
export const DAY_END = 26;       // 2 Uhr nachts – dann wird zwangsweise geschlafen
export const DEFAULT_DAY_MINUTES = 14;

/** Stuetzpunkte der Tagesfaerbung. */
const KEYS = [
  { h: 6, color: '#4c4a7a', a: 0.34 },
  { h: 8, color: '#ffd9a8', a: 0.10 },
  { h: 11, color: '#ffffff', a: 0.00 },
  { h: 16, color: '#ffffff', a: 0.00 },
  { h: 18, color: '#f0a55c', a: 0.18 },
  { h: 20, color: '#8a5f8c', a: 0.30 },
  { h: 21.5, color: '#2f3a68', a: 0.44 },
  { h: 24, color: '#161d3a', a: 0.56 },
  { h: 26, color: '#111739', a: 0.60 },
];

export class DayCycle {
  constructor(dayMinutes) {
    this.day = 1;
    this.hour = DAY_START;
    this.dayMinutes = dayMinutes || DEFAULT_DAY_MINUTES;
    this.paused = false;
  }

  get secondsPerHour() {
    return (this.dayMinutes * 60) / (DAY_END - DAY_START);
  }

  update(dt) {
    if (this.paused) return false;
    this.hour += dt / this.secondsPerHour;
    if (this.hour >= DAY_END) {
      this.hour = DAY_END;
      return true; // Zeit zum Schlafen
    }
    return false;
  }

  clockString() {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour % 1) * 60);
    return pad2(h) + ':' + pad2(m);
  }

  /** Spielrelevante Nacht: Nachtfische, ruhigere Musik. */
  isNight() {
    return this.hour >= 20.5;
  }

  /** Optisch dunkel: Laternen und Lagerfeuer leuchten (auch im Morgengrauen). */
  isDark() {
    return this.hour >= 19.5 || this.hour < 6.8;
  }

  /** Anteil 0..1 wie weit der Tag fortgeschritten ist. */
  progress() {
    return clamp((this.hour - DAY_START) / (DAY_END - DAY_START), 0, 1);
  }

  /** Tagesfaerbung als {r,g,b,a}. */
  tint() {
    const h = clamp(this.hour, KEYS[0].h, KEYS[KEYS.length - 1].h);
    let a = KEYS[0];
    let b = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (h >= KEYS[i].h && h <= KEYS[i + 1].h) {
        a = KEYS[i];
        b = KEYS[i + 1];
        break;
      }
    }
    const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
    const ca = hexToRgb(a.color);
    const cb = hexToRgb(b.color);
    return {
      r: Math.round(lerp(ca.r, cb.r, t)),
      g: Math.round(lerp(ca.g, cb.g, t)),
      b: Math.round(lerp(ca.b, cb.b, t)),
      a: lerp(a.a, b.a, t),
    };
  }

  sleep() {
    this.day++;
    this.hour = DAY_START;
  }

  toJSON() {
    return { day: this.day, hour: this.hour, dayMinutes: this.dayMinutes };
  }

  static fromJSON(d) {
    const c = new DayCycle(d && d.dayMinutes);
    if (d) {
      c.day = d.day || 1;
      c.hour = d.hour != null ? d.hour : DAY_START;
    }
    return c;
  }
}
