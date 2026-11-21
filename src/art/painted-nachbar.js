/**
 * Jule – die Nachbarin, sitzend und schreibend.
 *
 * **Warum sie sitzt.** Die sieben Geister schweben, der Wanderer steht mit
 * dem Stab am Strand, Seli läuft. Eine achte Figur in derselben Haltung wäre
 * eine weitere Silhouette unter vielen. Jule sitzt – das ist aus zwanzig
 * Metern Entfernung sofort etwas anderes, und es sagt in einem Bild, was
 * über sie zu wissen ist: Sie geht nicht wieder weg.
 *
 * **Warum sie keinen Hut trägt.** Seli hat einen, der Wanderer hat einen.
 * Bei einer dritten Kopfbedeckung fängt man an, Figuren an Hüten zu
 * unterscheiden. Jules Kennzeichen ist der Knoten im dunklen Haar – der
 * Gegenentwurf zu Selis offenem Blond.
 *
 * Zwei Bilder, wie bei allen anderen: Im zweiten senkt sich der Kopf ein
 * Stück und die Schreibhand rückt vor. Mehr braucht es nicht, damit jemand
 * aussieht, als schriebe er wirklich.
 */
import {
  offsetShape, inkStroke, inkLine, wash, paintObject, groundShadow, LIGHT,
  smoothClosed, blob,
} from './brush.js';
import { INK as ink, fill, made, poly, dot } from './painted.js';

/**
 * @param {number} frame 0 oder 1
 * @param {object} opts  {seed}
 */
export function paintNachbar(frame, opts) {
  const o = opts || {};
  const w = 126;
  const h = 150;
  const seed = (o.seed || 4401) + frame * 9;
  const cx = w / 2;
  const baseY = h - 10;
  // Im zweiten Bild sackt der Kopf einen Hauch ab: Wer schreibt, sieht nach
  // unten und wieder hoch.
  const bob = frame === 1 ? 2 : 0;
  /**
   * Kopfhöhe und Kopfgröße sind nachgerechnet, nicht geschätzt.
   *
   * Im zweiten Anlauf saß der Kopf auf 54 mit einem Radius von 21, der
   * Oberkörper begann bei `baseY - 76`, also 64. Das Kinn lag damit elf
   * Punkte TIEF im Pullover – im Bild sah man einen Kopf ohne Hals, und der
   * Kopfumriss lief quer über die Brust wie ein Brillengestell.
   *
   * Jetzt: Kopfunterkante bei 40 + 18 = 58, Oberkörper ab `baseY - 74` =
   * 66. Dazwischen acht Punkte Hals.
   */
  const headY = 40 + bob;

  const pulli = '#b1664a';
  const pulliSchatten = '#8a4a34';
  const pulliLicht = '#cf8564';
  const haar = '#4a3a30';
  const haarLicht = '#6b5446';
  const rock = '#55606b';
  const rockSchatten = '#3e4852';
  const haut = '#f0cdab';
  const seite = '#f6efdd';

  // Der sitzende Unterbau: ein breiter, flacher Haufen Stoff. Zwei
  // übereinanderliegende Formen statt einer – eine einzelne Blase sah aus
  // wie ein Sack, zwei lesen sich als untergeschlagene Beine.
  const schoss = smoothClosed([
    [cx - 32, baseY - 2], [cx - 36, baseY - 20], [cx - 20, baseY - 32],
    [cx + 22, baseY - 32], [cx + 36, baseY - 19], [cx + 31, baseY - 2],
  ], 6);
  const knie = smoothClosed(blob(cx + 16, baseY - 24, 15, 11, seed + 2, 0.08, 14), 5);

  // Oberkörper: oben schmal, unten breit, damit er auf dem Schoß aufsitzt.
  const koerper = smoothClosed([
    [cx - 15, baseY - 74 + bob], [cx + 15, baseY - 74 + bob],
    [cx + 25, baseY - 40], [cx + 20, baseY - 28],
    [cx - 20, baseY - 28], [cx - 25, baseY - 40],
  ], 6);

  // Linker Arm hält das Buch, rechter schreibt. Im zweiten Bild rückt die
  // Schreibhand nach rechts – das ist die ganze Bewegung.
  const schreibX = cx + 14 + (frame === 1 ? 5 : 0);
  const armL = smoothClosed(blob(cx - 20, baseY - 50 + bob, 8, 14, seed + 3, 0.08, 12), 5);
  const armR = smoothClosed(blob(cx + 19, baseY - 50 + bob, 8, 13, seed + 4, 0.08, 12), 5);
  const handL = smoothClosed(blob(cx - 14, baseY - 38, 5, 5, seed + 5, 0.1, 10), 4);
  const handR = smoothClosed(blob(schreibX, baseY - 38, 5, 5, seed + 6, 0.1, 10), 4);

  // Das Buch auf dem Schoß: leicht gekippt, damit man die Seite sieht.
  const buch = smoothClosed([
    [cx - 17, baseY - 40], [cx + 15, baseY - 44],
    [cx + 19, baseY - 33], [cx - 13, baseY - 29],
  ], 3);

  const kopf = smoothClosed(blob(cx, headY, 19, 18, seed + 7, 0.05, 18), 6);
  // Der Knoten sitzt hinten oben und ragt über den Kopf hinaus – von vorn
  // sieht man ihn als Buckel, sonst wäre es eine Kappe.
  const knoten = smoothClosed(blob(cx - 2, headY - 19, 11, 9, seed + 8, 0.07, 14), 5);
  /**
   * Das Haar liegt HINTER dem Kopf, nicht darauf.
   *
   * Im ersten Anlauf war es eine Blase von 23 x 18 Punkten auf Kopfhöhe,
   * gemalt NACH dem Gesicht – im gerenderten Bild hatte sie damit kein
   * Gesicht, nur Haar mit einem Kinn darunter, und die Augen steckten
   * unsichtbar darunter. Jetzt ist es ein Kranz, der oben und an den Seiten
   * übersteht und unten schmaler ist als der Kopf, und er wird vor dem
   * Gesicht gemalt statt danach.
   */
  const haarForm = smoothClosed(blob(cx, headY - 6, 21, 15, seed + 9, 0.06, 18), 6);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.3,
    outline: 1.7,
    shadow: function (g) { groundShadow(g, cx, baseY, 34, 8, seed + 1, 0.16); },
    wash: function (g) {
      wash(g, schoss, rock, { seed: seed + 10, scale: 1.03 });
      wash(g, offsetShape(schoss, -LIGHT.x * 8, -LIGHT.y * 7, 0.5), rockSchatten,
        { seed: seed + 11, alpha: 0.55 });
      wash(g, knie, rock, { seed: seed + 12, scale: 1.04 });

      wash(g, koerper, pulli, { seed: seed + 13, scale: 1.03 });
      wash(g, offsetShape(koerper, -LIGHT.x * 9, -LIGHT.y * 8, 0.45), pulliSchatten,
        { seed: seed + 14, alpha: 0.6 });
      wash(g, offsetShape(koerper, LIGHT.x * 7, LIGHT.y * 7, 0.3), pulliLicht,
        { seed: seed + 15, alpha: 0.5 });

      wash(g, armL, pulli, { seed: seed + 16 });
      wash(g, armR, pulli, { seed: seed + 17 });
      wash(g, handL, haut, { seed: seed + 18 });
      wash(g, handR, haut, { seed: seed + 19 });

      wash(g, buch, seite, { seed: seed + 20, scale: 1.02 });

      // Erst das Haar, dann das Gesicht darüber: So bleibt vom Kranz nur
      // der Rand sichtbar, und die Stirn ist frei.
      wash(g, haarForm, haar, { seed: seed + 22, scale: 1.02 });
      wash(g, offsetShape(haarForm, LIGHT.x * 6, LIGHT.y * 6, 0.3), haarLicht,
        { seed: seed + 23, alpha: 0.45 });
      wash(g, knoten, haar, { seed: seed + 24, scale: 1.03 });
      wash(g, kopf, haut, { seed: seed + 21, scale: 1.0 });
    },
    // Die Silhouette: alles, was die Figur ausmacht, in einer Fläche. Ohne
    // sie bekäme jedes Teilstück einen eigenen Umriss, und aus der Figur
    // würde eine Ansammlung von Formen.
    shape: function (g) {
      fill(g, schoss);
      fill(g, knie);
      fill(g, koerper);
      fill(g, armL);
      fill(g, armR);
      fill(g, kopf);
      fill(g, haarForm);
      fill(g, knoten);
    },
    ink: function (g) {
      inkStroke(g, schoss, { width: 1.7, vary: 0.3, seed: seed + 30, alpha: 0.75 });
      // Kein Ring um das Knie: Es liegt mitten im Rock, hat dieselbe Farbe,
      // und sein Umriss las sich im Bild als freie Schlaufe quer über den
      // Stoff. Was es sichtbar macht, ist der Schatten im Wash.

      inkStroke(g, koerper, { width: 1.7, vary: 0.3, seed: seed + 32, alpha: 0.8 });
      // Die Arme bekommen KEINEN eigenen Umriss. Sie sind aus demselben
      // Stoff wie der Pullover und liegen innerhalb der Silhouette; ihre
      // Ringe lasen sich im Bild als zwei freie Schlaufen quer über den
      // Körper. Was sie sichtbar macht, sind die Hände am Buch.
      inkStroke(g, buch, { width: 1.5, vary: 0.25, seed: seed + 35, alpha: 0.8 });
      // Auch der Haarkranz bekommt keinen eigenen Ring. Seine Unterkante
      // liegt auf Augenhöhe, und der Strich lief im Bild quer durchs
      // Gesicht wie ein Brillenbügel. Den äußeren Rand zeichnet ohnehin die
      // Silhouette; innen soll Haar in Farbe übergehen, nicht an einer
      // Kante aufhören.

      inkStroke(g, knoten, { width: 1.5, vary: 0.3, seed: seed + 38, alpha: 0.8 });
      inkStroke(g, kopf, { width: 1.6, vary: 0.3, seed: seed + 36, alpha: 0.8 });

      // Zwei Zeilen im Buch. Nicht mehr: Drei sähen aus wie ein Muster, und
      // aus zwei Metern ist ohnehin nur zu erkennen, DASS dort etwas steht.
      inkLine(g, cx - 12, baseY - 38, cx + 10, baseY - 41,
        { width: 0.9, bend: 0.01, seed: seed + 40, color: ink.line, alpha: 0.35 });
      inkLine(g, cx - 11, baseY - 34, cx + 6, baseY - 37,
        { width: 0.9, bend: 0.01, seed: seed + 41, color: ink.line, alpha: 0.3 });

      // Die Hände zuletzt, damit sie vor dem Buch liegen.
      inkStroke(g, handL, { width: 1.2, vary: 0.3, seed: seed + 42, alpha: 0.6 });
      inkStroke(g, handR, { width: 1.2, vary: 0.3, seed: seed + 43, alpha: 0.6 });
      // Der Stift in der Schreibhand: ein kurzer Strich, mehr ist er nicht.
      inkLine(g, schreibX + 2, baseY - 42, schreibX - 2, baseY - 34,
        { width: 1.4, bend: 0.01, seed: seed + 44, color: ink.line, alpha: 0.75 });

      // Augen. Sie sitzen TIEF im Gesicht, weil sie ins Buch sieht – und
      // sie sind Punkte wie bei allen anderen Figuren hier. Als zwei kurze
      // Striche waren sie im ersten Anlauf gar nicht zu finden.
      dot(null, g, cx - 6, headY + 4, 2.3, ink.line, seed + 45);
      dot(null, g, cx + 6, headY + 4, 2.3, ink.line, seed + 46);

      // Eine Strähne, die sich aus dem Knoten gelöst hat. Sie macht aus der
      // Frisur einen Menschen.
      inkLine(g, cx + 15, headY - 7, cx + 19, headY + 6,
        { width: 1.2, bend: 0.08, seed: seed + 47, color: ink.line, alpha: 0.55 });
    },
  });

  return made(res, w, h, cx, baseY);
}
