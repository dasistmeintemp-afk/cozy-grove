/**
 * Sternbilder – gemalt, nicht gerastert.
 *
 * Die Lagen der Sterne stehen in `sternbilder.js` als Anteile von 0 bis 1.
 * Hier werden sie auf die Bildgröße gerechnet. Das ist der Grund, warum dort
 * keine Bildpunktzahl steht: Wer das Bild später größer haben will, ändert
 * eine Zahl hier und keine siebzig dort.
 *
 * **Warum kein `shape`.** Jeder andere Maler im Spiel gibt eine Silhouette an
 * und bekommt dafür eine Kontur. Ein Sternbild hat keine Silhouette – es ist
 * eine Handvoll Punkte und dünne Linien dazwischen. Ein Umriss darum herum
 * wäre ein Kasten, und in einem Kasten ist es kein Himmel mehr.
 *
 * **Warum es eine Sternkarte ist und kein Nachthimmel.**
 *
 * Der erste Anlauf malte weiße Sterne mit heller Aura – also das, was man
 * nachts sieht. Im Bild sah man dann Kiesel: Das Spiel zeigt diese Bilder in
 * der Chronik, und die liegt auf Papier. Weiß auf Creme mit dunkler Kontur
 * liest sich als Loch, nicht als Stern, und die blassen Linien dazwischen
 * verschwanden in der Weichzeichnung.
 *
 * Also andersherum: eine gezeichnete Sternkarte. Dunkle Tintenpunkte auf
 * Papier, dünne Linien dazwischen, ein kühler Hauch darunter. Das passt zum
 * Rest des Spiels – alles hier ist Tinte und Aquarell – und es ist auf einer
 * hellen Fläche überhaupt lesbar. Gefunden nicht beim Schreiben, sondern
 * beim Ansehen des gerenderten Bildes.
 */
import {
  inkStroke, inkLine, paintObject, smoothClosed, blob,
} from './brush.js';
import { INK as ink, fill, made } from './painted.js';

/** Die Bildgröße eines Sternbildes. */
export const BREITE = 96;
export const HOEHE = 80;

/** Radius eines Sterns nach Helligkeit 1…3. */
// Die hellsten waren zuerst 4,4 Punkte breit und sahen damit aus wie
// Tintenkleckse statt wie Sterne. Der Abstand zwischen den Stufen muss
// erkennbar bleiben, die Spanne insgesamt aber eng.
const RADIUS = { 1: 1.8, 2: 2.6, 3: 3.5 };

/**
 * Ein Sternbild malen.
 *
 * @param {object} sb   Eintrag aus `STERNBILDER`
 * @param {object} opts {seed}
 */
export function paintSternbild(sb, opts) {
  const o = opts || {};
  const w = BREITE;
  const h = HOEHE;
  const seed = o.seed || 7701;
  const sterne = (sb && sb.sterne) || [];
  const linien = (sb && sb.linien) || [];

  // Anteile zu Bildpunkten. Ein Rand von 8 Punkten, damit der äußerste
  // Stern nicht an der Kante klebt.
  const rand = 8;
  const px = function (p) {
    return [rand + p[0] * (w - rand * 2), rand + p[1] * (h - rand * 2)];
  };
  const pts = sterne.map(px);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 0.8,
    outline: 0,
    // Kein `shape`: siehe oben. `shape: null` überspringt die Silhouette.
    shape: null,
    wash: function (g) {
      // Ein kühler Hauch unter den helleren Sternen – sehr zurückhaltend.
      // Er soll die Karte kalt wirken lassen, nicht leuchten.
      for (let i = 0; i < pts.length; i++) {
        const hell = sterne[i][2] || 1;
        if (hell < 2) continue;
        g.save();
        g.globalAlpha = hell === 3 ? 0.2 : 0.12;
        g.fillStyle = '#9dc0da';
        fill(g, smoothClosed(blob(pts[i][0], pts[i][1], hell * 2.4, hell * 2.3,
          seed + 200 + i, 0.14, 12), 6));
        g.restore();
      }
    },
    ink: function (g) {
      // Erst die Deutungslinien, UNTER den Punkten und in Tinte statt im
      // Wash: Im Wash lagen sie hinter dem Weichzeichner und waren nur
      // noch ein blauer Schleier.
      for (let i = 0; i < linien.length; i++) {
        const a = pts[linien[i][0]];
        const b = pts[linien[i][1]];
        if (!a || !b) continue;
        inkLine(g, a[0], a[1], b[0], b[1], {
          width: 0.9, bend: 0.012, seed: seed + 100 + i,
          color: ink.line, alpha: 0.33,
        });
      }

      // Dann die Sterne als dunkle Punkte. Hell heißt hier GRÖSSER, nicht
      // weißer – auf Papier ist Größe das einzige Maß, das trägt.
      for (let i = 0; i < pts.length; i++) {
        const hell = sterne[i][2] || 1;
        const r = RADIUS[hell] || RADIUS[1];
        const ring = smoothClosed(blob(pts[i][0], pts[i][1], r, r,
          seed + 300 + i, 0.12, 9), 5);
        g.save();
        g.fillStyle = ink.line;
        g.globalAlpha = hell === 1 ? 0.62 : 0.85;
        fill(g, ring);
        g.restore();
        inkStroke(g, ring, {
          width: hell === 1 ? 0.9 : 1.2, vary: 0.25,
          seed: seed + 400 + i, color: ink.line, alpha: hell === 1 ? 0.5 : 0.8,
        });
      }
    },
  });

  // Der Ankerpunkt sitzt in der Mitte und nicht am Fuß: Ein Sternbild steht
  // nicht auf dem Boden, es hängt.
  return made(res, w, h, w / 2, h / 2);
}
