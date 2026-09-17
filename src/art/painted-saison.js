/**
 * Die vier Jahresgaben – was nur in einer Jahreszeit am Boden liegt.
 *
 * Gebaut wie jedes andere Fundstück: fünf Durchgänge, wackelige Tuschelinie,
 * Farbfläche etwas daneben. Klein gehalten – sie liegen zu siebt in der
 * Landschaft, und was in siebenfacher Ausführung dasteht, darf nicht um
 * Aufmerksamkeit kämpfen.
 *
 * **Sie müssen sich auf einen Blick unterscheiden**, auch aus dem Laufen
 * heraus: Blütenblatt rosa und rund, Sonnenstein bernsteinfarben und kantig,
 * Ahornblatt rot mit Zacken, Eisblume weiß mit Strahlen. Zwei, die man
 * verwechselt, sind für den Spieler dasselbe Ding mit zwei Namen.
 */
import {
  offsetShape, inkStroke, inkLine, wash, paintObject, groundShadow, LIGHT,
  smoothClosed, blob,
} from './brush.js';
import { INK as ink, fill, made, poly, dot } from './painted.js';
import { makeRng } from '../core/rng.js';

/* ------------------------------------------------------- Blütenblatt -- */

/**
 * Drei Blütenblätter, wie vom Baum gefallen.
 *
 * Drei und nicht eines: Ein einzelnes Blatt auf dem Boden liest sich als
 * Fleck. Drei nebeneinander liest sich als „hier hat es geblüht".
 */
export function paintPetal(opts) {
  const o = opts || {};
  const w = 62;
  const h = 46;
  const seed = o.seed || 2601;
  const cx = w / 2;
  const baseY = h - 8;
  const rnd = makeRng(seed);

  const blaetter = [];
  const lagen = [[-13, -3, -0.4], [2, -7, 0.25], [12, 0, 0.9]];
  for (let i = 0; i < lagen.length; i++) {
    const [dx, dy, dreh] = lagen[i];
    const x = cx + dx;
    const y = baseY + dy;
    const rx = 9 + rnd() * 2;
    const ry = 5.5 + rnd() * 1.5;
    // Ein Blütenblatt ist ein Oval mit einer Spitze. Die Spitze macht den
    // Unterschied zu einem Kieselstein.
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + dreh;
      const spitz = k === 0 ? 1.5 : 1;
      pts.push([x + Math.cos(a) * rx * spitz, y + Math.sin(a) * ry * spitz]);
    }
    blaetter.push(smoothClosed(pts, 4));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.4,
    shadow: function (g) { groundShadow(g, cx, baseY, 20, 5, seed + 1, 0.1); },
    wash: function (g) {
      for (let i = 0; i < blaetter.length; i++) {
        wash(g, blaetter[i], '#f2c3d2', { seed: seed + 10 + i, scale: 1.05 });
        wash(g, offsetShape(blaetter[i], LIGHT.x * 4, LIGHT.y * 4, 0.5), '#fbe4ec',
          { seed: seed + 14 + i, alpha: 0.6 });
      }
    },
    shape: function (g) { for (let i = 0; i < blaetter.length; i++) fill(g, blaetter[i]); },
    ink: function (g) {
      for (let i = 0; i < blaetter.length; i++) {
        inkStroke(g, blaetter[i], { width: 1.2, vary: 0.3, seed: seed + 30 + i, alpha: 0.6 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/* -------------------------------------------------------- Sonnenstein -- */

/**
 * Ein warmer Kiesel, der das Licht hält.
 *
 * Kantig und einzeln – das Gegenteil der weichen Blütenblätter. So sind die
 * beiden hellen Gaben (Frühling und Sommer) schon an der FORM zu trennen und
 * nicht nur an der Farbe.
 */
export function paintSunstone(opts) {
  const o = opts || {};
  const w = 54;
  const h = 48;
  const seed = o.seed || 2621;
  const cx = w / 2;
  const baseY = h - 9;

  const stein = poly([
    [cx - 13, baseY - 1], [cx - 15, baseY - 11], [cx - 6, baseY - 19],
    [cx + 7, baseY - 18], [cx + 15, baseY - 9], [cx + 12, baseY - 1],
  ], 2);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.6,
    shadow: function (g) { groundShadow(g, cx, baseY, 17, 5, seed + 1, 0.14); },
    wash: function (g) {
      // Ein Schein darunter: Er leuchtet nicht, aber er sieht warm aus.
      g.save();
      g.globalAlpha = 0.3;
      g.fillStyle = '#f7d79a';
      fill(g, smoothClosed(blob(cx, baseY - 10, 22, 18, seed + 40, 0.12, 14), 6));
      g.restore();
      wash(g, stein, '#e0a049', { seed: seed + 10, scale: 1.04 });
      wash(g, offsetShape(stein, -LIGHT.x * 7, -LIGHT.y * 6, 0.5), '#b9772f',
        { seed: seed + 12, alpha: 0.6 });
      wash(g, offsetShape(stein, LIGHT.x * 6, LIGHT.y * 6, 0.35), '#f8dca2',
        { seed: seed + 14, alpha: 0.7 });
    },
    shape: function (g) { fill(g, stein); },
    ink: function (g) {
      inkStroke(g, stein, { width: 1.7, vary: 0.3, seed: seed + 30, alpha: 0.7 });
      // Zwei Schliffkanten. Drei wären ein Muster.
      inkLine(g, cx - 5, baseY - 18, cx - 2, baseY - 3,
        { width: 1.1, bend: 0.02, seed: seed + 40, color: ink.line, alpha: 0.4 });
      inkLine(g, cx + 6, baseY - 17, cx + 4, baseY - 3,
        { width: 1.0, bend: 0.02, seed: seed + 41, color: ink.line, alpha: 0.35 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/* --------------------------------------------------------- Ahornblatt -- */

/**
 * Ein Ahornblatt mit fünf Zacken.
 *
 * Die Zacken sind das ganze Kennzeichen – ohne sie wäre es ein roter Fleck
 * und damit ein Blütenblatt in einer anderen Farbe.
 */
export function paintMapleleaf(opts) {
  const o = opts || {};
  const w = 60;
  const h = 54;
  const seed = o.seed || 2641;
  const cx = w / 2;
  const baseY = h - 8;
  const my = baseY - 15;

  // Fünf Zacken auf einem Halbkreis, dazwischen Einbuchtungen.
  const pts = [];
  const zacken = 5;
  for (let i = 0; i < zacken; i++) {
    const a = Math.PI * (0.06 + (i / (zacken - 1)) * 0.88);
    pts.push([cx - Math.cos(a) * 17, my - Math.sin(a) * 15]);
    if (i < zacken - 1) {
      const b = Math.PI * (0.06 + ((i + 0.5) / (zacken - 1)) * 0.88);
      pts.push([cx - Math.cos(b) * 8.5, my - Math.sin(b) * 7]);
    }
  }
  pts.push([cx + 3, my + 8], [cx - 3, my + 8]);
  const blatt = smoothClosed(pts, 2);
  const stiel = [[cx, my + 6], [cx - 1, baseY - 1]];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.4,
    shadow: function (g) { groundShadow(g, cx, baseY, 18, 5, seed + 1, 0.11); },
    wash: function (g) {
      wash(g, blatt, '#c65a33', { seed: seed + 10, scale: 1.04 });
      wash(g, offsetShape(blatt, LIGHT.x * 5, LIGHT.y * 5, 0.45), '#e08a4a',
        { seed: seed + 12, alpha: 0.6 });
    },
    shape: function (g) { fill(g, blatt); },
    ink: function (g) {
      inkStroke(g, blatt, { width: 1.3, vary: 0.35, seed: seed + 30, alpha: 0.65 });
      inkLine(g, stiel[0][0], stiel[0][1], stiel[1][0], stiel[1][1],
        { width: 1.6, bend: 0.05, seed: seed + 40, color: '#8a5330', alpha: 0.85 });
      // Drei Adern – der Rest ist bei dieser Größe Rauschen.
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.22 + i * 0.28);
        inkLine(g, cx, my + 5, cx - Math.cos(a) * 12, my - Math.sin(a) * 10,
          { width: 0.9, bend: 0.03, seed: seed + 50 + i, color: '#8a5330', alpha: 0.4 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/* ------------------------------------------------------------ Eisblume -- */

/**
 * Ein Frostsstern am Boden.
 *
 * Sechs Strahlen – ausdrücklich NICHT der Nebelkristall: Der steht als Bündel
 * aufrechter Splitter, das hier liegt flach und strahlenförmig. Zwei Eisdinge
 * im selben Spiel müssen sich unterscheiden, sonst hat eines davon keinen
 * Grund.
 *
 * **Eisblau und nicht weiß**, obwohl weiß das Naheliegende wäre. Der erste
 * Entwurf malte weiße Strahlen auf einen blassen Schleier, und im
 * Übersichtsbild war davon ein Fleck übrig. Schlimmer im Spiel: Das hier ist
 * die WINTERgabe und liegt damit auf Schnee – weiß auf weiß ist dort nicht
 * blass, sondern unsichtbar. Jetzt trägt jeder Strahl eine dunklere Kante,
 * und das Weiß ist nur noch das Glanzlicht darauf.
 */
export function paintFrostflower(opts) {
  const o = opts || {};
  const w = 58;
  const h = 46;
  const seed = o.seed || 2661;
  const cx = w / 2;
  const baseY = h - 8;
  const my = baseY - 10;

  // Ein sechszackiger Stern als FLÄCHE, nicht als Strichbündel.
  //
  // Die ersten beiden Anläufe zeichneten nur Linien – erst weiße (im
  // Übersichtsbild ein Fleck), dann blaue mit weißem Glanz (ein Nebelfleck).
  // Beide hatten dasselbe Problem: Jedes andere Fundstück auf dieser Insel
  // hat eine Silhouette, die `paintObject` mit einer Tuschelinie umrandet,
  // und ohne die gehört ein Stück optisch nicht dazu. Also eine Fläche, und
  // die Verästelungen kommen als Striche obendrauf.
  const zacken = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    const lang = i % 2 === 0 ? 17 : 5.5;
    zacken.push([cx + Math.cos(a) * lang, my + Math.sin(a) * lang * 0.56]);
  }
  const stern = poly(zacken, 1);

  // Je Hauptzacke ein Ästchenpaar – das macht aus einem Stern eine Eisblume.
  const aeste = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const mx = cx + Math.cos(a) * 10;
    const myy = my + Math.sin(a) * 10 * 0.56;
    for (const dreh of [1.05, -1.05]) {
      aeste.push([[mx, myy],
        [mx + Math.cos(a + dreh) * 5.5, myy + Math.sin(a + dreh) * 3.2]]);
    }
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.0,
    outline: 1.5,
    outlineColor: '#5d87a3',
    shadow: function (g) { groundShadow(g, cx, baseY, 16, 4, seed + 1, 0.09); },
    wash: function (g) {
      wash(g, stern, '#cfe6f4', { seed: seed + 10, scale: 1.04 });
      wash(g, offsetShape(stern, LIGHT.x * 4, LIGHT.y * 4, 0.45), '#f2fbff',
        { seed: seed + 12, alpha: 0.7 });
    },
    shape: function (g) { fill(g, stern); },
    ink: function (g) {
      for (let i = 0; i < aeste.length; i++) {
        const a = aeste[i];
        inkLine(g, a[0][0], a[0][1], a[1][0], a[1][1],
          { width: 1.2, bend: 0.02, seed: seed + 50 + i, color: '#6f9fbd', alpha: 0.75 });
      }
      dot(g, null, cx, my, 2.4, '#ffffff', seed + 90);
    },
  });
  return made(res, w, h, cx, baseY);
}
