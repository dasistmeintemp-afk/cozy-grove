/**
 * Die Tanne am Lager.
 *
 * Fünf Fassungen desselben Baums, von kahl bis voll. Welche gezeigt wird,
 * sagt `baumStufe` im Adventsmodul – also die Zahl der geöffneten Türchen.
 *
 * **Warum fünf gebackene Bilder und nicht fünfundzwanzig.** Den Unterschied
 * zwischen elf und zwölf Lichtern sieht niemand; den zwischen einem kahlen
 * und einem halb geschmückten Baum schon. Fünf Bilder kosten fünf Mal
 * Rechenzeit beim Start, fünfundzwanzig kosten fünfundzwanzig – für eine
 * Abstufung, die keiner bemerkt.
 *
 * **Warum die Lichter eine feste Reihenfolge haben.** Die vierundzwanzig
 * Plätze werden EINMAL berechnet, und jede Stufe malt davon die ersten so
 * und so vielen. Dadurch wandert kein Licht, wenn ein Türchen dazukommt:
 * Was gestern an einem Zweig hing, hängt morgen noch dort. Würden die
 * Plätze je Stufe neu gewürfelt, sähe der Baum beim Öffnen jedes Türchens
 * aus, als hätte ihn jemand nachts umdekoriert.
 */
import {
  blob, smoothClosed, offsetShape, inkLine, wash, washGroup,
  paintObject, groundShadow, LIGHT,
} from './brush.js';
import { INK as ink, fill, made, needleFringe } from './painted.js';

/** So viele Lichter hängen am vollen Baum – eines je Türchen. */
export const PLAETZE = 24;

/** Die Lichterzahl je Stufe. Stufe 0 ist der nackte Baum. */
export const STUFEN_LICHTER = [0, 6, 12, 18, 24];

const W = 204;
const H = 308;
const CX = W / 2;
const BASE_Y = H - 14;

/**
 * Die vier Etagen, von unten nach oben: [Unterkante, Halbbreite, Höhe].
 * Dieselbe Bauart wie beim gewöhnlichen Nadelbaum, nur größer – diese hier
 * ist der Baum, um den sich alles versammelt.
 */
const ETAGEN = [
  [BASE_Y - 58, 78, 52],
  [BASE_Y - 112, 65, 46],
  [BASE_Y - 160, 50, 40],
  [BASE_Y - 204, 34, 33],
];

/**
 * Die vierundzwanzig Plätze, in fester Reihenfolge.
 *
 * Reihum über die Etagen statt von unten nach oben aufgefüllt: Sonst hätte
 * ein Baum mit sechs Lichtern alle sechs unten am Rock hängen und sähe oben
 * vergessen aus.
 */
function plaetze() {
  const out = [];
  let z = 0x7a9f1;
  const rnd = () => {
    z = (z * 1664525 + 1013904223) >>> 0;
    return z / 4294967296;
  };
  for (let i = 0; i < PLAETZE; i++) {
    const e = ETAGEN[i % ETAGEN.length];
    const unten = e[0];
    const hw = e[1] * 0.82;
    // Links und rechts abwechselnd, damit der Baum nicht einseitig wird.
    const seite = i % 2 ? 1 : -1;
    // Mehrere Versuche, bis ein Platz weit genug von allen bisherigen weg
    // ist. Ohne das lagen am vollen Baum mehrere Lichter fast übereinander:
    // Gezählt vierundzwanzig, gesehen ungefähr vierzehn.
    let x = CX;
    let y = unten;
    for (let versuch = 0; versuch < 24; versuch++) {
      const rel = 0.2 + rnd() * 0.72;
      x = CX + seite * hw * rel;
      // Dieselbe Kantenform wie beim Nadelsaum: in der Mitte höher, außen
      // tiefer. Ein Licht, das daneben hängt, schwebt neben dem Baum.
      y = unten - (1 - rel) * hw * 0.34 - 4 - rnd() * 7;
      let frei = true;
      for (let k = 0; k < out.length; k++) {
        const dx = out[k].x - x;
        const dy = out[k].y - y;
        if (dx * dx + dy * dy < 17 * 17) { frei = false; break; }
      }
      if (frei) break;
    }
    // `ton` NICHT aus `i % 3`: Eine Kugel ist genau dann da, wenn `i % 3`
    // gleich 2 ist – der Ton wäre damit immer derselbe, und alle acht
    // Kugeln am Baum hätten dieselbe Farbe. Gemalt sah man es sofort.
    out.push({ x: x, y: y, kugel: i % 3 === 2, ton: ((i / 3) | 0) % 3 });
  }
  return out;
}

const PLATZ = plaetze();

const KUGEL_FARBEN = ['#c8584a', '#6f9fc4', '#d9a24c'];

/**
 * @param {object} opts `lichter` – wie viele der 24 Plätze belegt sind.
 */
export function paintTanne(opts) {
  const o = opts || {};
  const n = Math.max(0, Math.min(PLAETZE, o.lichter == null ? 0 : o.lichter));
  const seed = o.seed || 4711;

  const stamm = smoothClosed([
    [CX - 13, BASE_Y], [CX - 24, BASE_Y - 5], [CX - 12, BASE_Y - 30],
    [CX - 11, BASE_Y - 70], [CX + 11, BASE_Y - 70], [CX + 12, BASE_Y - 30],
    [CX + 24, BASE_Y - 5], [CX + 13, BASE_Y],
  ], 5);

  const etagen = [];
  for (let i = 0; i < ETAGEN.length; i++) {
    const s = ETAGEN[i];
    const pts = smoothClosed(blob(CX, s[0] - s[2] * 0.35, s[1], s[2], seed + i * 7, 0.19, 22), 7);
    for (let k = 0; k < pts.length; k++) {
      const rel = (pts[k][1] - (s[0] - s[2] * 1.35)) / (s[2] * 1.7);
      pts[k][0] = CX + (pts[k][0] - CX) * (0.3 + Math.max(0, rel) * 1.0);
      if (pts[k][1] > s[0]) pts[k][1] = s[0] + (pts[k][1] - s[0]) * 0.22;
    }
    etagen.push(pts);
  }

  const sternY = BASE_Y - 246;

  const res = paintObject(W, H, {
    seed: seed,
    blur: 1.8,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, CX + 3, BASE_Y - 3, 54, 15, seed, 0.17); },
    wash: function (g) {
      wash(g, stamm, ink.trunk, { seed: seed + 3, dx: -1, dy: 2 });
      wash(g, offsetShape(stamm, 7, 2, 0.66), ink.trunkShade, { seed: seed + 4, alpha: 0.8 });
      for (let i = 0; i < etagen.length; i++) {
        wash(g, etagen[i], ink.pine, { seed: seed + 12 + i, scale: 1.05 });
      }
      const dunkel = [];
      const hell = [];
      for (let i = 0; i < etagen.length; i++) {
        dunkel.push(offsetShape(etagen[i], -LIGHT.x * 18, -LIGHT.y * 14, 0.66));
        hell.push(offsetShape(etagen[i], LIGHT.x * 16, LIGHT.y * 11, 0.52));
      }
      washGroup(g, dunkel, ink.pineDark, { alpha: 0.66 });
      washGroup(g, hell, ink.pineLight, { alpha: 0.7 });
    },
    shape: function (g) {
      fill(g, stamm);
      for (let i = 0; i < etagen.length; i++) fill(g, etagen[i]);
      // Der Stern gehört zur Silhouette, sonst hinge er als loser Fleck
      // über dem Baum statt auf seiner Spitze.
      if (n > 0) fill(g, sternForm(sternY));
    },
    detail: function (g) {
      for (let i = 0; i < etagen.length; i++) {
        needleFringe(g, CX, ETAGEN[i][0] - 3, ETAGEN[i][1] * 0.86, seed + 200 + i * 13, ink.pineDark);
      }
    },
    ink: function (g) {
      for (let i = 0; i < etagen.length - 1; i++) {
        const y = ETAGEN[i][0] - 2;
        inkLine(g, CX - ETAGEN[i][1] * 0.55, y, CX + ETAGEN[i][1] * 0.55, y - 3,
          { width: 1.9, bend: 0.16, seed: seed + 80 + i, alpha: 0.55 });
      }
      inkLine(g, CX - 3, BASE_Y - 22, CX - 2, BASE_Y - 58,
        { width: 1.4, bend: 0.05, seed: seed + 90, alpha: 0.42 });

      // Schmuck und Lichter. In der Tintenschicht, damit sie auch auf der
      // unkolorierten Insel zu sehen sind – ein Adventskalender, den man
      // erst sieht, wenn die Farbe zurück ist, käme für viele zu spät.
      g.save();
      for (let i = 0; i < n; i++) {
        const p = PLATZ[i];
        if (p.kugel) {
          // Kugel: Farbfleck mit Kontur und einem Glanzpunkt oben links.
          g.globalAlpha = 1;
          g.fillStyle = KUGEL_FARBEN[p.ton];
          g.beginPath();
          g.arc(p.x, p.y, 4.6, 0, 6.2832);
          g.fill();
          g.lineWidth = 1.2;
          g.strokeStyle = ink.line;
          g.globalAlpha = 0.65;
          g.stroke();
          g.globalAlpha = 0.85;
          g.fillStyle = '#fffdf6';
          g.beginPath();
          g.arc(p.x - 1.6, p.y - 1.8, 1.3, 0, 6.2832);
          g.fill();
        } else {
          // Licht: warmer Kern in einem weichen Hof. Ohne den Hof ist es ein
          // gelber Punkt, mit ihm leuchtet es.
          const hof = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
          hof.addColorStop(0, 'rgba(255,214,130,0.85)');
          hof.addColorStop(0.45, 'rgba(255,196,104,0.38)');
          hof.addColorStop(1, 'rgba(255,186,104,0)');
          g.globalAlpha = 1;
          g.fillStyle = hof;
          g.beginPath();
          g.arc(p.x, p.y, 11, 0, 6.2832);
          g.fill();
          g.fillStyle = '#fff3c9';
          g.beginPath();
          g.arc(p.x, p.y, 2.6, 0, 6.2832);
          g.fill();
        }
      }
      if (n > 0) {
        g.globalAlpha = 1;
        g.fillStyle = '#e8bd62';
        fill(g, sternForm(sternY));
        g.globalAlpha = 0.7;
        g.strokeStyle = ink.line;
        g.lineWidth = 1.6;
        g.stroke();
      }
      g.restore();
    },
  });
  return made(res, W, H, CX, BASE_Y);
}

/** Ein fünfzackiger Stern für die Spitze. */
function sternForm(cy) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? 5.2 : 12.5;
    pts.push([CX + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
