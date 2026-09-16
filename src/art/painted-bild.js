/**
 * Die Skizzen – ein Platz auf der Insel, gemalt statt abgelichtet.
 *
 * Gebaut auf dem gerahmten Bild aus `painted-interior.js`: dieselbe Größe,
 * derselbe Rahmen, derselbe Nagel. Nur was DARIN steht, hängt an der Skizze –
 * an Ort, Jahreszeit, Tageszeit und Wetter (siehe `game/bild.js`).
 *
 * **Drei Streifen und ein paar Umrisse, mehr nicht.** Das Bild ist im Zimmer
 * 84 Punkte breit und hängt an einer Wand, an der man vorbeigeht. Ein
 * ausgearbeiteter Waldrand darin wäre Arbeit, die niemand sieht; was man
 * sieht, ist der FARBKLANG – ein Winterabend an den Klippen ist blau und
 * kantig, ein Sommermorgen am Wasser hell und flach. Daran erkennt man den
 * Platz wieder, nicht an den Blättern.
 *
 * Deshalb steht hier auch kein Weltausschnitt. Der Renderer malt auf seine
 * eigene Leinwand und mit seiner eigenen Kamera; ihn für ein Daumennagelbild
 * umzubiegen hieße, den Bodenspeicher und das Farbfeld für eine Miniatur
 * durcheinanderzubringen – und heraus käme ein Foto in einem Aquarell.
 */
import { offsetShape, inkStroke, inkLine, wash, paintObject } from './brush.js';
import { INK as ink, fill, made, poly, dot } from './painted.js';
import { makeRng } from '../core/rng.js';

const RAHMEN = { holz: '#b08556', holzTief: '#8a6640', leinen: '#f4ecda' };

/**
 * Himmel und Boden je Tageszeit.
 *
 * Die Nacht ist nicht einfach dunkler, sondern blauer: Ein abgedunkeltes
 * Tagesbild sieht aus wie ein Tagesbild bei schlechtem Licht.
 */
export const ZEIT_FARBEN = {
  morgen: { himmel: '#f2dcc4', fern: '#d8c6ba', licht: '#f7ead0' },
  tag: { himmel: '#cfe2ea', fern: '#b6c8cf', licht: '#f4efe2' },
  abend: { himmel: '#e8b894', fern: '#bd9a92', licht: '#f6d9b4' },
  nacht: { himmel: '#3f4f70', fern: '#33405c', licht: '#c9d4e8' },
};

/**
 * Der Boden je Jahreszeit.
 *
 * Nicht dieselben Werte wie `SEASON_TINT`: Das dort ist ein Schleier ÜBER
 * der Welt, hier ist es die Farbe selbst. Ein Schleier von sieben Prozent
 * auf eine Fläche von zwanzig Punkten wäre unsichtbar.
 */
export const JAHRES_FARBEN = {
  spring: { boden: '#9dbb7c', laub: '#7fa860', fern: '#b6cf9a' },
  summer: { boden: '#8fae66', laub: '#6d9450', fern: '#a8c489' },
  autumn: { boden: '#c09455', laub: '#b06c38', fern: '#cdae7e' },
  winter: { boden: '#e2e6e8', laub: '#9fb0b8', fern: '#eef1f2' },
};

/** Das Wasser – ebenfalls je Jahreszeit, sonst friert die See im Sommer. */
export const WASSER_FARBEN = {
  spring: '#8fb2c4', summer: '#7db0c8', autumn: '#7e9fb0', winter: '#a8bcc6',
};

/**
 * Was an welchem Ort im Bild steht.
 *
 *   horizont  wie hoch der Boden ansetzt (0 = oben, 1 = unten im Blatt)
 *   wasser    wie viel des Bodens Wasser ist (0 = keines)
 *   form      wie der Boden geschnitten ist
 *   baeume    wie viele Umrisse dahinterstehen
 *
 * Die Zahlen sind das ganze Bild. Zwei Orte mit denselben unterschieden sich
 * nur in Nuancen – die Prüfung wacht darüber, dass keine zwei gleich sind.
 */
export const ORT_FORM = {
  wasser: { horizont: 0.44, wasser: 0.72, form: 'flach', baeume: 0 },
  wald: { horizont: 0.34, wasser: 0, form: 'huegel', baeume: 5 },
  klippen: { horizont: 0.52, wasser: 0.3, form: 'kante', baeume: 1 },
  insel: { horizont: 0.4, wasser: 0.55, form: 'insel', baeume: 2 },
  lager: { horizont: 0.46, wasser: 0, form: 'senke', baeume: 2, feuer: true },
  zuhause: { horizont: 0.44, wasser: 0, form: 'huegel', baeume: 1, haus: true },
  abseits: { horizont: 0.3, wasser: 0, form: 'weit', baeume: 0 },
};

/** Die Linie, an der Boden und Himmel sich treffen. */
function bodenKante(form, l, r, y, rnd) {
  switch (form) {
    // Ein Strand ist eine gerade Linie mit einer Delle.
    case 'flach':
      return [[l, y], [l + (r - l) * 0.4, y + 2], [r, y - 1]];
    // Der Wald wölbt sich.
    case 'huegel':
      return [[l, y + 2], [l + (r - l) * 0.3, y - 8], [l + (r - l) * 0.62, y - 3], [r, y - 7]];
    // Die Klippe ist ein Absatz – das ist ihr ganzes Kennzeichen.
    //
    // Vier Punkte dicht beieinander, wo die Stufe sitzt. Mit nur zweien
    // machte das Glätten aus dem Absatz eine DIAGONALE, und im Bild lag
    // dann ein Drachen quer über der Insel statt einer Kante. Im
    // Übersichtsbild gefunden – gerechnet hatte es gestimmt.
    case 'kante': {
      const k = l + (r - l) * 0.44;
      return [[l, y - 13], [k - 6, y - 13], [k - 1, y - 12],
        [k, y - 4], [k + 1, y + 4], [k + 6, y + 5], [r, y + 5]];
    }
    // Die Stille Insel liegt als Buckel im Wasser, mit Luft links und rechts.
    case 'insel':
      return [[l, y + 9], [l + (r - l) * 0.24, y + 8], [l + (r - l) * 0.42, y - 7],
        [l + (r - l) * 0.66, y - 6], [l + (r - l) * 0.84, y + 8], [r, y + 9]];
    // Die Lagermulde: in der Mitte tiefer.
    case 'senke':
      return [[l, y - 6], [l + (r - l) * 0.35, y + 3], [l + (r - l) * 0.62, y + 3], [r, y - 5]];
    // Weit weg von allem: hoher Himmel, eine ferne Linie.
    default:
      return [[l, y + 1], [l + (r - l) * 0.5, y - 2 + rnd() * 2], [r, y]];
  }
}

/**
 * Ein offener Pfad, dichter abgetastet.
 *
 * `poly` taugt dafür nicht: Es läuft vom letzten Punkt zurück zum ersten und
 * glättet als RING. Auf eine Bodenlinie angewandt heißt das ein Rückweg quer
 * durchs Bild – bei der Klippe lag damit eine Diagonale von der Kante bis zum
 * rechten Rand über der Landschaft. Für die gefüllte Fläche ist `poly`
 * richtig (sie IST ein Ring), für den Strich darüber nicht.
 */
function offenerPfad(ecken) {
  const pts = [];
  for (let i = 0; i < ecken.length - 1; i++) {
    const a = ecken[i];
    const b = ecken[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  pts.push(ecken[ecken.length - 1]);
  return pts;
}

/**
 * Ein Baumumriss – kein Baum, nur seine Silhouette.
 *
 * Der erste Entwurf war so breit wie hoch und rundum geglättet; im
 * Übersichtsbild standen damit fünf TORBÖGEN am Waldrand. Schmal und
 * spitz zulaufend liest es sich als Baum, auch bei zwölf Punkten Höhe.
 * Im Winter läuft er spitzer zu: Was dann noch steht, ist Nadelholz.
 */
function baumUmriss(cx, y, h, breit, spitz) {
  const kopf = spitz ? 0.06 : 0.22;
  return poly([
    [cx - breit, y], [cx - breit * 0.72, y - h * 0.45],
    [cx - breit * kopf, y - h], [cx + breit * kopf, y - h],
    [cx + breit * 0.72, y - h * 0.45], [cx + breit, y],
  ], 3);
}

/**
 * Eine Skizze.
 *
 * @param {object} skizze {ort, jahreszeit, zeit, wetter} aus `game/bild.js`
 */
export function paintInselbild(skizze, opts) {
  const o = opts || {};
  const w = 84;
  const h = 68;
  const s = skizze || {};
  const form = ORT_FORM[s.ort] || ORT_FORM.abseits;
  const zeit = ZEIT_FARBEN[s.zeit] || ZEIT_FARBEN.tag;
  const jahr = JAHRES_FARBEN[s.jahreszeit] || JAHRES_FARBEN.spring;
  const wasserFarbe = WASSER_FARBEN[s.jahreszeit] || WASSER_FARBEN.spring;

  // Derselbe Same für dieselbe Skizze: Das Bild an der Wand soll nach dem
  // Neuladen dasselbe sein. Ein Bild, das sich beim Betreten des Zimmers
  // ändert, ist keine Erinnerung.
  const seed = (o.seed || 2400) +
    (s.ort || '').length * 37 + (s.jahreszeit || '').length * 13 +
    (s.zeit || '').length * 7 + ((s.ort || '').charCodeAt(0) | 0);
  const rnd = makeRng(seed);

  const cx = w / 2;
  const cy = h / 2;
  const l = cx - 30;
  const r = cx + 30;
  const oben = cy - 20;
  const unten = cy + 20;
  const kante = oben + (unten - oben) * form.horizont;

  const rahmen = poly([
    [cx - 38, cy - 28], [cx + 38, cy - 28], [cx + 38, cy + 28], [cx - 38, cy + 28],
  ], 3);
  const blatt = poly([[l, oben], [r, oben], [r, unten], [l, unten]], 3);
  const himmel = poly([[l, oben], [r, oben], [r, kante + 1], [l, kante + 1]], 2);

  const linie = bodenKante(form.form, l, r, kante, rnd);
  const boden = poly(linie.concat([[r, unten], [l, unten]]), 2);

  // Das Wasser liegt als Band unten im Blatt – nicht als Fläche hinter dem
  // Boden. Andersherum verschwände es bei jedem Ort, dessen Bodenlinie tief
  // genug liegt, und der Strand hätte kein Meer.
  const wasserOben = unten - (unten - kante) * (form.wasser || 0);
  const wasserFlaeche = form.wasser
    ? poly([[l, wasserOben], [r, wasserOben], [r, unten], [l, unten]], 2)
    : null;

  // Die Bäume stehen auf der Bodenlinie, gleichmäßig verteilt und
  // verschieden hoch. Gleich hoch sähe aus wie ein Zaun.
  // Das Dach zu Hause. Als Form hier oben, weil der Strich sie unten
  // noch einmal braucht: Ohne Umriss war es im Übersichtsbild ein roter
  // Fleck neben dem Hügel, kein Dach.
  const dach = form.haus
    ? poly([[cx + 5, kante + 1], [cx + 9, kante - 10], [cx + 21, kante - 10],
      [cx + 25, kante + 1]], 1)
    : null;

  const baeume = [];
  for (let i = 0; i < (form.baeume || 0); i++) {
    const t = (i + 0.5) / form.baeume;
    const bx = l + (r - l) * t;
    const by = kante - 2 + (rnd() - 0.5) * 3;
    baeume.push(baumUmriss(bx, by, 11 + rnd() * 8, 2.8 + rnd() * 1.6,
      s.jahreszeit === 'winter'));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.3,
    outline: 1.6,
    shadow: null,
    wash: function (g) {
      wash(g, rahmen, RAHMEN.holz, { seed: seed + 1, scale: 1.02 });
      wash(g, blatt, RAHMEN.leinen, { seed: seed + 2, scale: 1.02 });
      wash(g, himmel, zeit.himmel, { seed: seed + 3, alpha: 0.92 });
      wash(g, boden, jahr.boden, { seed: seed + 4, alpha: 0.92 });
      if (wasserFlaeche) wash(g, wasserFlaeche, wasserFarbe, { seed: seed + 5, alpha: 0.82 });
      for (let i = 0; i < baeume.length; i++) {
        wash(g, baeume[i], jahr.laub, { seed: seed + 20 + i, alpha: 0.9 });
      }
      // Am Lagerfeuer ein warmer Fleck, zu Hause ein Dach. Zwei Punkte, an
      // denen man den Ort auch ohne Titel erkennt.
      if (form.feuer) {
        dot(g, null, cx, kante + 4, 4.5, '#e8934a', seed + 40);
      }
      if (form.haus) wash(g, dach, '#c2724f', { seed: seed + 41, alpha: 0.92 });
    },
    shape: function (g) { fill(g, rahmen); },
    ink: function (g) {
      inkStroke(g, rahmen, { width: 1.9, seed: seed + 10 });
      inkStroke(g, blatt, { width: 1.2, seed: seed + 11 });
      // Die Bodenlinie ist der Strich, der den Ort ausmacht.
      inkStroke(g, offenerPfad(linie), { width: 1.2, seed: seed + 12, closed: false });
      for (let i = 0; i < baeume.length; i++) {
        inkStroke(g, baeume[i], { width: 0.85, seed: seed + 30 + i, alpha: 0.6 });
      }
      if (dach) inkStroke(g, dach, { width: 1.1, seed: seed + 42, alpha: 0.8 });
      if (wasserFlaeche) {
        // Zwei Wellenstriche. Drei wären ein Muster.
        for (let i = 0; i < 2; i++) {
          const wy = wasserOben + 5 + i * 6;
          if (wy > unten - 2) break;
          inkLine(g, l + 5 + i * 7, wy, r - 6 - i * 4, wy,
            { width: 0.9, bend: 0.06, seed: seed + 50 + i, color: ink.line, alpha: 0.35 });
        }
      }
      // Mond oder Sonne. Nachts steht er höher – tagsüber sieht man ihn
      // ohnehin kaum, und tief am Horizont sähe er aus wie eine Insel.
      const hy = s.zeit === 'nacht' ? oben + 5 : oben + 7;
      if (s.zeit === 'nacht' || s.zeit === 'abend' || s.zeit === 'morgen') {
        dot(g, g, r - 10, hy, s.zeit === 'nacht' ? 3 : 3.6, zeit.licht, seed + 60);
      }
      // Wetter. Regen als Striche, Schnee als Punkte, Nebel als ein Band –
      // dieselben drei Zeichen wie draußen auf der Insel.
      if (s.wetter === 'regen') {
        for (let i = 0; i < 7; i++) {
          const x = l + 4 + i * 8;
          inkLine(g, x, oben + 4 + (i % 3) * 3, x - 2, oben + 12 + (i % 3) * 3,
            { width: 0.8, bend: 0, seed: seed + 70 + i, color: '#5d7382', alpha: 0.5 });
        }
      } else if (s.wetter === 'schnee') {
        for (let i = 0; i < 9; i++) {
          dot(g, null, l + 4 + (i * 7) % 56, oben + 4 + ((i * 11) % 24), 1.3, '#ffffff', seed + 80 + i);
        }
      } else if (s.wetter === 'nebel') {
        for (let i = 0; i < 2; i++) {
          inkLine(g, l + 3, kante - 6 + i * 5, r - 3, kante - 7 + i * 5,
            { width: 3.2, bend: 0.05, seed: seed + 90 + i, color: '#e4e8ea', alpha: 0.55 });
        }
      }
      // Der Nagel, an dem es hängt.
      inkLine(g, cx, cy - 30, cx, cy - 27,
        { width: 2.0, bend: 0, seed: seed + 13, color: ink.line, alpha: 0.8 });
    },
  });
  return made(res, w, h, cx, cy);
}
