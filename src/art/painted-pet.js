/**
 * Das Haustier – Katze und Hund, von der Seite.
 *
 * Bewusst NICHT wie der Fuchs gebaut: Der steht aufrecht und trägt eine
 * Weste, weil er der Händler ist. Ein Haustier läuft auf vier Beinen, sonst
 * liest es sich als zweite Figur statt als Tier.
 *
 * Drei Bilder je Art: zwei zum Laufen und eines zum Sitzen. Das Sitzbild ist
 * kein Sparposten – das Tier verbringt die meiste Zeit damit, auf deinen
 * Möbeln zu liegen, und ein stehendes Tier auf einer Bank sähe aus, als
 * warte es darauf, dass endlich etwas passiert.
 */
import {
  blob, smoothClosed, offsetShape, clipTo, inkStroke, inkLine, wash,
  paintObject, groundShadow,
} from './brush.js';
import { INK as ink, fill, made, dot, poly } from './painted.js';

/** Fell, Zeichnung und Bau je Art. */
const ARTEN = {
  cat: {
    fell: '#8d8c96', fellDunkel: '#6d6c78', hell: '#e6e3dc',
    koerperRX: 38, koerperRY: 22,
    kopfR: 21, ohrHoch: 30, ohrBreit: 15, schlappohr: false,
    beinDick: 9, schwanzLang: 62, schwanzDick: 8,
  },
  dog: {
    fell: '#c99a5e', fellDunkel: '#a2763f', hell: '#f0e4cd',
    koerperRX: 42, koerperRY: 26,
    kopfR: 24, ohrHoch: 22, ohrBreit: 19, schlappohr: true,
    beinDick: 12, schwanzLang: 42, schwanzDick: 10,
  },
};

export const PET_KINDS = Object.keys(ARTEN);

/**
 * @param {string} kind  'cat' oder 'dog'
 * @param {string} pose  '0' / '1' zum Laufen, 'sit' zum Sitzen
 */
export function paintPet(kind, pose, opts) {
  const o = opts || {};
  const A = ARTEN[kind] || ARTEN.cat;
  const w = 180;
  const h = 148;
  const seed = (o.seed || 1401) + (pose === 'sit' ? 40 : Number(pose) * 11);
  const cx = w / 2;
  const baseY = h - 12;
  const sitzt = pose === 'sit';
  const schritt = pose === '1' ? 1 : 0;
  // Beim Sitzen sinkt der Rumpf nach hinten ab und der Kopf kommt höher.
  const bob = sitzt ? 0 : (schritt ? -3 : 0);

  const rumpfY = sitzt ? baseY - 34 : baseY - 40 + bob;
  // Sitzend sitzt der Kopf ÜBER der Brust, nicht neben dem Rumpf.
  const kopfX = sitzt ? cx + A.koerperRX - 16 : cx + A.koerperRX - 4;
  const kopfY = sitzt ? baseY - 74 : baseY - 62 + bob;

  const koerper = sitzt
    // Sitzend: hinten eine tiefe, runde Keule, vorn eine ansteigende Brust,
    // auf der der Kopf sitzt. Ein erster Entwurf ließ den Rumpf nach vorn
    // ABfallen – dann schwebte der Kopf daneben und das Tier sah aus, als
    // wäre es umgekippt.
    ? smoothClosed([
      [cx - A.koerperRX, baseY - 6],
      [cx - A.koerperRX - 2, baseY - 32],
      [cx - 18, baseY - 50],
      [cx + 10, baseY - 56],
      [cx + A.koerperRX - 14, baseY - 50],
      [cx + A.koerperRX - 8, baseY - 22],
      [cx + A.koerperRX - 14, baseY - 4],
      [cx - 12, baseY - 2],
    ], 5)
    : smoothClosed(blob(cx, rumpfY, A.koerperRX, A.koerperRY, seed + 1, 0.07, 16), 5);
  const kopf = smoothClosed(blob(kopfX, kopfY, A.kopfR, A.kopfR * 0.92, seed + 2, 0.06, 16), 6);
  const schnauze = smoothClosed(
    blob(kopfX + A.kopfR * 0.72, kopfY + 7, A.kopfR * 0.5, A.kopfR * 0.36, seed + 3, 0.08, 12), 5);

  const ohrL = A.schlappohr
    // Schlappohr: hängt an der Seite herunter statt zu stehen
    ? smoothClosed([
      [kopfX - 6, kopfY - A.kopfR + 4], [kopfX - A.ohrBreit - 4, kopfY - A.kopfR + 8],
      [kopfX - A.ohrBreit - 6, kopfY + A.ohrHoch - 12], [kopfX - 4, kopfY + 4],
    ], 5)
    : poly([
      [kopfX - 14, kopfY - A.kopfR + 6], [kopfX - 8, kopfY - A.kopfR - A.ohrHoch + 8],
      [kopfX + 2, kopfY - A.kopfR + 2],
    ], 3);
  const ohrR = A.schlappohr
    ? smoothClosed([
      [kopfX + 6, kopfY - A.kopfR + 2], [kopfX + A.ohrBreit, kopfY - A.kopfR + 6],
      [kopfX + A.ohrBreit + 2, kopfY + A.ohrHoch - 16], [kopfX + 6, kopfY],
    ], 5)
    : poly([
      [kopfX + 2, kopfY - A.kopfR + 2], [kopfX + 10, kopfY - A.kopfR - A.ohrHoch + 10],
      [kopfX + 18, kopfY - A.kopfR + 8],
    ], 3);

  // Beine: hinten zwei, vorn zwei. Beim Laufen versetzt, beim Sitzen stehen
  // nur die vorderen, die hinteren stecken unter der Keule.
  const beine = [];
  function bein(bx, laenge, versatz) {
    const oben = baseY - laenge;
    beine.push(smoothClosed([
      [bx - A.beinDick / 2, oben], [bx + A.beinDick / 2 + versatz, oben],
      [bx + A.beinDick / 2 + versatz, baseY - 3], [bx - A.beinDick / 2, baseY - 3],
    ], 3));
  }
  if (sitzt) {
    // Nur die Vorderläufe stehen; die hinteren stecken unter der Keule.
    bein(cx + A.koerperRX - 24, 30, 0);
    bein(cx + A.koerperRX - 12, 28, 0);
  } else {
    const v = schritt ? 5 : -5;
    bein(cx - A.koerperRX + 8, 34, v);
    bein(cx - A.koerperRX + 22, 32, -v);
    bein(cx + A.koerperRX - 22, 34, -v);
    bein(cx + A.koerperRX - 8, 32, v);
  }

  // Der Schweif: eine Sichel nach hinten oben. Beim Sitzen legt er sich um
  // die Pfoten, sonst steht er.
  const sx0 = cx - A.koerperRX + 4;
  const schwanz = sitzt
    ? smoothClosed([
      [sx0, baseY - 26], [sx0 - 16, baseY - 14], [sx0 - 6, baseY - 4],
      [cx + 6, baseY - 2], [cx + 6, baseY - 10], [sx0 - 2, baseY - 12],
    ], 6)
    : smoothClosed([
      [sx0, rumpfY - 4], [sx0 - 14, rumpfY - A.schwanzLang * 0.45],
      [sx0 - 12, rumpfY - A.schwanzLang * 0.85],
      [sx0 - 2, rumpfY - A.schwanzLang],
      [sx0 + A.schwanzDick, rumpfY - A.schwanzLang * 0.82],
      [sx0 + 4, rumpfY - A.schwanzLang * 0.4], [sx0 + A.schwanzDick + 2, rumpfY + 6],
    ], 6);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.4,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 2, A.koerperRX + 4, 10, seed + 5, 0.16); },
    wash: function (g) {
      wash(g, schwanz, A.fellDunkel, { seed: seed + 10, scale: 1.03 });
      for (let i = 0; i < beine.length; i++) {
        wash(g, beine[i], A.fellDunkel, { seed: seed + 12 + i });
      }
      wash(g, koerper, A.fell, { seed: seed + 18, scale: 1.04 });
      // Heller Bauch – ohne ihn ist das Tier ein einfarbiger Fleck
      clipTo(g, [koerper]);
      wash(g, offsetShape(koerper, 0, 16, 0.78), A.hell, { seed: seed + 19, alpha: 0.75 });
      g.restore();
      wash(g, ohrL, A.fellDunkel, { seed: seed + 20 });
      wash(g, ohrR, A.fellDunkel, { seed: seed + 21 });
      wash(g, kopf, A.fell, { seed: seed + 22, scale: 1.04 });
      wash(g, schnauze, A.hell, { seed: seed + 23, scale: 1.03 });
    },
    shape: function (g) {
      fill(g, schwanz);
      for (let i = 0; i < beine.length; i++) fill(g, beine[i]);
      fill(g, koerper);
      fill(g, ohrL);
      fill(g, ohrR);
      fill(g, kopf);
    },
    ink: function (g) {
      inkStroke(g, kopf, { width: 1.6, vary: 0.3, seed: seed + 30, color: ink.line, alpha: 0.45 });
      inkStroke(g, schnauze, { width: 1.5, vary: 0.3, seed: seed + 31, color: ink.line, alpha: 0.6 });
      // Auge und Nase – die zwei Punkte, an denen ein Tier lebendig wird
      dot(null, g, kopfX + 4, kopfY - 4, 3.4, ink.line, seed + 32);
      dot(null, g, kopfX + A.kopfR * 1.1, kopfY + 5, 3.0, ink.line, seed + 33);
      // Maul
      inkLine(g, kopfX + A.kopfR * 0.7, kopfY + 12, kopfX + A.kopfR * 1.05, kopfY + 11,
        { width: 1.4, bend: 0.4, seed: seed + 34, alpha: 0.7 });
      // Fellstriche am Rumpf
      for (let i = 0; i < 3; i++) {
        const x = cx - 14 + i * 15;
        inkLine(g, x, rumpfY - 14, x + 4, rumpfY - 2,
          { width: 1.3, bend: 0.1, seed: seed + 40 + i, color: ink.lineSoft, alpha: 0.4 });
      }
      inkStroke(g, schwanz, { width: 1.5, vary: 0.3, seed: seed + 50, color: ink.line, alpha: 0.5 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Der Futternapf – das Stück, mit dem alles anfängt.
 *
 * Steht als Deko herum, bis ein Streuner es findet. Ein Napf, den man
 * aufstellt, ist ein Versprechen; ein Menüpunkt „Haustier kaufen" wäre eine
 * Kasse.
 */
export function paintBowl(opts) {
  const o = opts || {};
  const w = 132;
  const h = 96;
  const seed = o.seed || 1451;
  const cx = w / 2;
  const baseY = h - 12;

  const napf = smoothClosed([
    [cx - 40, baseY - 34], [cx + 40, baseY - 34],
    [cx + 30, baseY - 8], [cx, baseY - 3], [cx - 30, baseY - 8],
  ], 5);
  const rand = smoothClosed(blob(cx, baseY - 34, 42, 10, seed + 1, 0.07, 16), 5);
  const futter = smoothClosed(blob(cx, baseY - 33, 28, 7, seed + 2, 0.16, 14), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.4,
    outline: 1.7,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 40, 9, seed, 0.15); },
    wash: function (g) {
      wash(g, napf, '#b5654a', { seed: seed + 10, scale: 1.03 });
      wash(g, offsetShape(napf, 20, 6, 0.6), '#8d4a35', { seed: seed + 11, alpha: 0.6 });
      wash(g, rand, '#c9765a', { seed: seed + 12 });
      wash(g, futter, '#8a6a44', { seed: seed + 13, scale: 1.04 });
    },
    shape: function (g) { fill(g, napf); fill(g, rand); },
    ink: function (g) {
      inkStroke(g, rand, { width: 1.8, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.7 });
      inkStroke(g, futter, { width: 1.4, vary: 0.35, seed: seed + 21, color: ink.line, alpha: 0.55 });
      // Ein paar Körner, sonst ist der Inhalt ein brauner Fleck
      for (let i = 0; i < 5; i++) {
        dot(null, g, cx - 18 + i * 9, baseY - 35 + (i % 2) * 4, 3.0, ink.line, seed + 30 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}
