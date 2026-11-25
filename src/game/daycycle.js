/** Tageslauf: Uhrzeit, Färbung, Schlafen. */
import { clamp, lerp, pad2, hexToRgb } from '../core/util.js';

export const DAY_START = 6;      // Stunde beim Aufwachen
export const DAY_END = 26;       // 2 Uhr nachts – dann wird zwangsweise geschlafen
export const DEFAULT_DAY_MINUTES = 14;

/** Stützpunkte der Tagesfärbung. */
const KEYS = [
  { h: 6, color: '#4c4a7a', a: 0.34 },
  { h: 8, color: '#ffd9a8', a: 0.10 },
  { h: 11, color: '#ffffff', a: 0.00 },
  { h: 16, color: '#ffffff', a: 0.00 },
  /**
   * Die goldene Stunde – und warum sie DUNKLER sein muss, nicht nur
   * oranger.
   *
   * Hier stand ein einziger Punkt: 18 Uhr, `#f0a55c`, Deckung 0,18.
   * Gemessen am Bildschirm brachte das von mittags bis 18 Uhr eine
   * Wärme (Rot minus Blau) von 31 auf 52 – und eine Helligkeit von 121
   * auf 131. Der Abend wurde also HELLER als der Mittag. Das ist das
   * Gegenteil von dem, was spätes Licht tut, und der Grund, warum man
   * den Abend im Spiel nicht gesehen hat.
   *
   * Die Ursache ist Arithmetik, keine Geschmacksfrage. Eine Lasur
   * rechnet `Ergebnis = Szene * (1-a) + Farbe * a`; sie kann nur dorthin
   * ziehen, wo die Farbe steht. `#f0a55c` hat eine Helligkeit von 175,
   * die Szene 121 – jede Deckung macht es heller, egal wie orange die
   * Farbe ist. Eine Abendfarbe muss DUNKLER sein als die Szene und
   * trotzdem mehr Rot als Blau haben.
   *
   * Drei Punkte statt einem, damit daraus ein Verlauf wird: erstes
   * Warmwerden, der goldene Höhepunkt, und das Nachglühen, das schon
   * ins Violette kippt, bevor die blaue Nacht übernimmt.
   */
  { h: 17.3, color: '#b0783e', a: 0.15 },
  { h: 18.4, color: '#a86232', a: 0.31 },
  { h: 19.3, color: '#7e4254', a: 0.46 },
  { h: 20, color: '#63406e', a: 0.48 },
  /**
   * Die Nacht ist blau, nicht grau – und das ist eine Messung.
   *
   * Hier stand `#2f3a68` / `#161d3a` mit 0,44 und 0,56. Der Ton war
   * richtig gewählt (ein sattes Marineblau), das Ergebnis auf dem Schirm
   * aber nicht: gemessen (124,116,97) – also neutralgrau mit ROTSTICH.
   * Die Nacht sah aus wie ein bedeckter Nachmittag.
   *
   * Der Grund steckt in der Rechnung einer halbdurchsichtigen Lasur. Die
   * Szene ist warm (Rot 206 gegen Blau 141, Abstand 65). Für Blau > Rot
   * muss gelten: -65 + (65 + 44)·a > 0, also a > 0,60. Mit 0,56 konnte der
   * Ton die Wärme nur neutralisieren, nie überschreiben.
   *
   * Durchgemessen wurden sieben Kombinationen aus Ton und Deckung. Diese
   * hier ergibt Blau-minus-Rot von +25 bei einer Helligkeit von 120 – klar
   * nächtlich und trotzdem hell genug, dass man etwas erkennt. Dunklere
   * Kandidaten waren weniger blau, nicht mehr.
   */
  { h: 21.5, color: '#31487f', a: 0.57 },
  { h: 24, color: '#1a3576', a: 0.74 },
  { h: 26, color: '#152c66', a: 0.76 },
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

  /**
   * Wie stark die goldene Stunde gerade ist – 0 bis 1.
   *
   * Die Tagesfärbung allein macht den Abend warm, aber nicht LEUCHTEND:
   * Eine gleichmäßige Lasur zieht jeden Bildpunkt gleich weit zur
   * Abendfarbe, und spätes Licht tut genau das nicht – es kommt flach
   * von einer Seite. Daraus wird im Renderer ein warmer Schein, der von
   * Westen her über die Szene läuft (siehe `_schraeglicht`).
   *
   * Die Kurve steigt ab 17 Uhr an, hat ihren Höhepunkt um 18:24 –
   * dieselbe Stelle wie der wärmste Punkt der Tagesfärbung – und ist um
   * 19:45 vorbei, bevor es wirklich dunkel wird. Dass sie VOR der
   * Dunkelheit endet, ist kein Detail: Ein Schein, der in die Nacht
   * hineinragt, sähe aus wie eine zweite Sonne.
   */
  goldeneStunde() {
    const h = this.hour;
    if (h <= 17 || h >= 19.75) return 0;
    const t = h < 18.4 ? (h - 17) / 1.4 : 1 - (h - 18.4) / 1.35;
    // Weich an beiden Enden, damit nichts einsetzt oder abreißt.
    return Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
  }

  /** Anteil 0..1 wie weit der Tag fortgeschritten ist. */
  progress() {
    return clamp((this.hour - DAY_START) / (DAY_END - DAY_START), 0, 1);
  }

  /** Tagesfärbung als {r,g,b,a}. */
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
