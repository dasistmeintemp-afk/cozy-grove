/**
 * Jule – die Erste, die bleibt.
 *
 * Das Kapitel „Der Zuzug" (Tag 55) stand seit einer Weile als leere Hülle in
 * `kapitel.js` und kündigte etwas an, das es nicht gab. Das hier ist seine
 * Einlösung, und sie beantwortet zwei Fragen auf einmal.
 *
 * **Die erste: Warum überhaupt jemand einziehen soll.** Animal Crossings
 * stärkster Dauermotor ist nicht sein Inhalt, sondern dass die Besetzung nie
 * endgültig ist. Diese Insel hat sieben Geister, und die sind von Anfang an
 * alle da – eine Welt, die niemals jemanden dazubekommt, ist nach einem
 * halben Jahr vollständig besichtigt. Jule ist der Beweis, dass sich das
 * ändern kann.
 *
 * **Die zweite: Warum ausgerechnet jemand, der schreibt.** Das Spiel hat seit
 * dieser Reihe drei Sammlungen, die der Spieler ganz für sich anlegt – 36
 * benannte Momente, sieben Sternbilder, acht selbst benannte Orte. Alle drei
 * sind stumm: Man bemerkt etwas, es steht danach in einer Liste, und das
 * war's. Einer Sammlung fehlt aber genau eine Sache, damit sie sich lohnt –
 * **jemand, dem man davon erzählt.**
 *
 * Jule fragt danach. Sie schreibt es auf. Damit wird aus einer privaten
 * Liste ein Gespräch, und das ganze übrige Spiel wird dabei mehr wert, ohne
 * dass ein einziger neuer Inhalt dazukommt. Das ist der billigste
 * Vervielfacher, den dieses Spiel noch hat.
 *
 * **Vier Regeln, die sie von den Geistern unterscheiden.**
 *
 * 1. **Sie lebt.** Sie hat keinen Farbkreis, keine Freundschaftsstufe und
 *    keine Erinnerungskette. Die sieben gehören zur Insel; sie hat sich
 *    hierher entschieden.
 * 2. **Sie stellt keine Aufgabe.** Nichts von ihr landet im Aufgabenbuch,
 *    nichts läuft ab, und wer ihr nie etwas erzählt, verpasst nichts.
 *    Erzählen ist ein Angebot, keine Bitte.
 * 3. **Sie will nichts, was man bringen muss.** Die Geister fragen nach
 *    Holz und Harz, der Wanderer tauscht. Sie fragt nach etwas, das man
 *    ohnehin schon hat – dem, was man gesehen hat. Ein achter Sammelauftrag
 *    wäre genau das Falsche.
 * 4. **Einmal am Tag.** Wer ihr dreißig Momente am Stück erzählt, hat ihr
 *    nichts erzählt, sondern eine Liste vorgelesen.
 */
import { MOMENTE } from './momente.js';
import { STERNBILDER } from './sternbilder.js';

/** Wie sie heißt. Absichtlich schlicht. */
export const NAME = 'Jule';

/**
 * Ihr Name ist der einzige im Spiel, der nicht beschreibt, was jemand ist.
 *
 * Die sieben heißen Flämmchen, Mira Moos, Käpt'n Kiesel – Namen wie aus
 * einem Bilderbuch, und das sollen sie auch sein. Eine lebende Nachbarin mit
 * einem solchen Namen wäre eine achte Figur derselben Sorte. „Jule" ist
 * dagegen einfach ein Name, und genau daran merkt man, dass sie von woanders
 * herkommt.
 */
export const WOHER = 'vom Festland';

/**
 * Die drei Sorten, von denen man ihr erzählen kann.
 *
 * Alles, was der Spieler selbst gefunden oder benannt hat – und nichts, was
 * das Spiel ihm gegeben hat. Fische und Fundstücke stehen bewusst nicht
 * dabei: Die hat er eingesammelt, nicht bemerkt, und dafür gibt es das
 * Fundbuch.
 */
export const SORTEN = ['moment', 'stern', 'ort'];

/** Was sie für eine Geschichte gibt. Klein – sie ist keine Händlerin. */
export const LOHN = 14;

/**
 * Ihre Stationen, nach der Zahl der Geschichten.
 *
 * Nicht nach Tagen: Wer ihr viel erzählt, kommt schneller voran, und das ist
 * richtig so – die Stationen gehören dem Gespräch und nicht dem Kalender.
 *
 * Die letzte gibt ihr Buch heraus. Es ist ein Möbelstück und keine Urkunde:
 * Man kann es hinstellen, und dann steht in der eigenen Stube ein Buch, in
 * dem die eigene Insel steht.
 */
export const STUFEN = [
  {
    ab: 1,
    satz: 'Du hast also recht gehabt. Hier ist mehr los, als es aussieht.',
  },
  {
    ab: 5,
    satz: 'Ich schreibe das auf, weißt du. Deshalb bin ich hier. ' +
      'Auf dem Festland war mir zu viel los zum Zuhören.',
  },
  {
    ab: 12,
    satz: 'Ich habe das Boot zurückgeschickt. Nur damit du es weißt.',
    gibt: { coins: 150 },
  },
  {
    ab: 25,
    satz: 'Es ist fertig. Und es handelt von hier – also gehört es hierher.',
    gibt: { items: [{ id: 'bookstack', n: 1 }] },
  },
];

/**
 * Was sie sagt.
 *
 * Trocken, freundlich, nie schwärmerisch. Die Geister reden wehmütig, weil
 * sie zurücksehen; sie sieht nach vorn, und das muss man hören.
 */
export const SAETZE = {
  ankunft: [
    'Ich bin Jule. Ich bleibe. Frag nicht warum, das weiß ich selbst noch nicht.',
  ],
  fragt: [
    'Du läufst hier mehr herum als ich. Was hast du gesehen?',
    'Erzähl mir was. Ich schreibe mit.',
    'Gibt es Neues? Ich meine das ernst, nicht höflich.',
  ],
  dank: [
    'Das schreibe ich auf.',
    'Gut. Das wusste ich noch nicht.',
    'Hm. Das gefällt mir.',
  ],
  // Wenn es nichts Neues gibt. Kein Vorwurf, keine Aufforderung – sonst wäre
  // aus dem Angebot eine Bitte geworden, und das ist Regel 2.
  nichts: [
    'Heute nichts Neues? Auch gut. Setz dich ruhig.',
    'Dann sitzen wir eben da.',
    'Ich habe genug zu tun mit dem, was du mir schon erzählt hast.',
  ],
  // Wenn sie heute schon etwas aufgeschrieben hat.
  satt: [
    'Für heute reicht es. Mir raucht der Kopf.',
    'Morgen wieder. Ich will es ordentlich aufschreiben.',
  ],
};

/** Leerer Stand – wie `emptyWanderer`. */
export function emptyNachbar() {
  return { da: 0, erzaehlt: Object.create(null), zahl: 0, zuletzt: 0, stufe: 0 };
}

/** Ist sie schon eingezogen? */
export function istDa(stand) {
  return !!(stand && stand.da);
}

/** Der Schlüssel, unter dem eine Geschichte vermerkt wird. */
export function schluessel(art, id) {
  return art + ':' + id;
}

/** Hat sie das schon aufgeschrieben? */
export function schonErzaehlt(stand, art, id) {
  return !!(stand && stand.erzaehlt && stand.erzaehlt[schluessel(art, id)]);
}

/** Hat sie heute schon etwas aufgeschrieben? */
export function heuteSchon(stand, tag) {
  return !!(stand && stand.zuletzt === tag);
}

/**
 * Was es ihr noch zu erzählen gibt.
 *
 * Die Reihenfolge ist die des Findens, nicht die der Listen: Sie fragt nach
 * dem, was am längsten zurückliegt. Das klingt nach einem Detail, ist aber
 * der Unterschied zwischen „erzähl mir irgendwas" und einem Gespräch, das
 * dort anfängt, wo man selbst angefangen hat.
 *
 * @param {object} stand    ihr Stand
 * @param {object} momente  Stand aus `momente.js`
 * @param {object} sterne   Stand aus `sternbilder.js`
 * @param {Array}  orte     die benannten Orte
 * @returns {Array} [{art, id, titel, tag}]
 */
export function offeneGeschichten(stand, momente, sterne, orte) {
  const raus = [];

  const mg = (momente && momente.gefunden) || {};
  for (let i = 0; i < MOMENTE.length; i++) {
    const m = MOMENTE[i];
    if (!mg[m.id] || schonErzaehlt(stand, 'moment', m.id)) continue;
    raus.push({ art: 'moment', id: m.id, titel: m.name, tag: mg[m.id] });
  }

  const sg = (sterne && sterne.gefunden) || {};
  for (let i = 0; i < STERNBILDER.length; i++) {
    const s = STERNBILDER[i];
    if (!sg[s.id] || schonErzaehlt(stand, 'stern', s.id)) continue;
    raus.push({ art: 'stern', id: s.id, titel: s.name, tag: sg[s.id] });
  }

  const liste = Array.isArray(orte) ? orte : [];
  for (let i = 0; i < liste.length; i++) {
    const o = liste[i];
    if (!o || !o.name) continue;
    if (schonErzaehlt(stand, 'ort', o.name)) continue;
    // Ein Ort hat keinen Fundtag – er zählt als „gerade eben", damit das
    // Benennen einer Ecke nicht hinter zwanzig alten Momenten einsortiert
    // wird und man vier Wochen wartet, bis sie danach fragt.
    raus.push({ art: 'ort', id: o.name, titel: o.name, tag: Infinity });
  }

  raus.sort(function (a, b) { return a.tag - b.tag; });
  return raus;
}

/** Wonach sie als Nächstes fragt – oder `null`. */
export function naechsteGeschichte(stand, momente, sterne, orte, tag) {
  if (heuteSchon(stand, tag)) return null;
  const offen = offeneGeschichten(stand, momente, sterne, orte);
  return offen.length ? offen[0] : null;
}

/** Eine Geschichte eintragen. Gibt den neuen Stand heraus. */
export function merke(stand, art, id, tag) {
  const s = stand && stand.erzaehlt ? stand : emptyNachbar();
  if (!s.erzaehlt[schluessel(art, id)]) {
    s.erzaehlt[schluessel(art, id)] = tag;
    s.zahl = (s.zahl || 0) + 1;
  }
  s.zuletzt = tag;
  return s;
}

/**
 * Welche Station mit dieser Geschichte erreicht wird – oder `null`.
 *
 * Verändert den Stand nicht; der Aufrufer trägt sie ein, nachdem er sie
 * gezeigt hat. Derselbe Schnitt wie bei `dueAt` und `neueKapitel`.
 */
export function neueStufe(stand) {
  const zahl = (stand && stand.zahl) || 0;
  const hatte = (stand && stand.stufe) || 0;
  for (let i = STUFEN.length - 1; i >= 0; i--) {
    if (zahl >= STUFEN[i].ab && i + 1 > hatte) return { nummer: i + 1, stufe: STUFEN[i] };
  }
  return null;
}

/** Wie viele Geschichten sie kennt und wie viele es gäbe. */
export function nachbarStand(stand, momente, sterne, orte) {
  return {
    erzaehlt: (stand && stand.zahl) || 0,
    offen: offeneGeschichten(stand, momente, sterne, orte).length,
    stufe: (stand && stand.stufe) || 0,
    stufen: STUFEN.length,
  };
}
