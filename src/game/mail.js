/**
 * Die Post – ein Grund, morgens zuerst zum Briefkasten zu gehen.
 *
 * Das Spiel hat bewusst fast keine Dialoge: Was ein Geist will, sagt eine
 * Karte aus Symbolen. Ein Brief ist die eine Ausnahme, die dazu passt, weil
 * man ihn SELBST aufmacht – niemand hält einen auf dem Weg an. Und er bringt
 * etwas mit: Ohne Beilage wäre der Briefkasten eine Textanzeige, und die
 * öffnet man dreimal.
 *
 * Alle Briefe entstehen aus dem Tag und dem Spielstand, nicht aus dem Zufall
 * des Augenblicks: Wer denselben Tag zweimal beginnt, findet dieselbe Post.
 */
import { dailyRng, randInt, randPick } from '../core/rng.js';
import { SPIRITS, SPIRIT_IDS } from './spirits.js';

/** Wie viele Briefe aufgehoben werden, bevor die ältesten weichen. */
export const MAILBOX_MAX = 24;

/**
 * Dankesbriefe: kommen von einem Geist, dem man gestern geholfen hat.
 *
 * Je zwei Zeilen und ein kleines Mitbringsel. Der Ton ist derselbe wie in
 * den Sprechblasen – Flämmchen knistert, Bruno brummt.
 */
const THANKS = {
  flamey: [
    'Das Holz von gestern brennt gut. Ich habe die halbe Nacht geknistert.',
    'Es war warm. Länger als sonst. Danke dir.',
  ],
  mira: [
    'Auf der Wiese steht heute etwas, das gestern noch nicht da war.',
    'Ich habe an dich gedacht, als es aufging. Nimm das hier.',
  ],
  kiesel: [
    'Ruhige See heute. Gutes Wetter, um nichts zu tun.',
    'Lag am Strand, gehört jetzt dir. Ich brauche es nicht mehr.',
  ],
  bruno: [
    'Hmpf. War brauchbar, gestern.',
    'Im Wald liegt was für dich. Nicht verraten, wo ich es her habe.',
  ],
  tobi: [
    'Ich habe nachgerechnet: Es passt. Beim dritten Versuch.',
    'Der Rest vom Material ist übrig. Kannst du haben.',
  ],
  nelly: [
    'Von hier oben sieht man, wo du überall warst.',
    'Ich habe etwas eingepackt. Klein, aber gut gemacht.',
  ],
  wanda: [
    'Das Wasser war still gestern. Ich habe dein Boot kommen hören.',
    'Angeschwemmt. Für dich aufgehoben.',
  ],
};

/**
 * Was ein Geist einem Brief beilegt.
 *
 * Anfangs war das immer ein bis drei Stück von dem, was er selbst mag – also
 * dreimal Holz, und beim vierten Brief macht man ihn nicht mehr auf. Jetzt
 * hängt die Beilage an der Freundschaft: Wer einen Geist kaum kennt, bekommt
 * eine Handvoll von seinem Kram; wer ihn lange kennt, auch mal Saat, einen
 * Edelstein oder etwas für die Wohnung. Der kleine Kram bleibt die Regel,
 * sonst wäre das Seltene nichts Besonderes.
 */
const SELTEN = [
  { id: 'gem', n: 1 },
  { id: 'seed_moon', n: 1 },
  { id: 'seed_flower', n: 2 },
  { id: 'lantern', n: 1 },
  { id: 'mat', n: 1 },
  { id: 'planter', n: 1 },
];

function beilage(spiritId, rng, stufe) {
  const s = SPIRITS[spiritId];
  const likes = (s && s.likes) || ['wood'];
  // Ab der zweiten Freundschaftsstufe wird es hin und wieder etwas Besseres.
  const chance = Math.min(0.42, Math.max(0, ((stufe || 0) - 1)) * 0.14);
  if (chance > 0 && rng() < chance) {
    const gut = SELTEN[randInt(rng, 0, SELTEN.length - 1)];
    return { id: gut.id, n: gut.n };
  }
  return { id: randPick(rng, likes), n: randInt(rng, 1, 2 + Math.min(3, stufe || 0)) };
}

/**
 * Die Zeile auf dem Paketaufkleber.
 *
 * Der Inhalt steht dahinter, damit man ihn schon vor dem Auspacken liest –
 * ein Paket ohne Absender und ohne Inhaltsangabe wäre ein grauer Kasten.
 */
const PAKET = [
  'Mit dem Boot gekommen, ein wenig feucht an der Ecke.',
  'Gut verpackt, viel Stroh, keine Delle.',
  'Lag seit heute früh im Kasten. Die Schnur ist schon ab.',
  'Der Zettel obendrauf sagt nur: bestellt ist bestellt.',
];

const HAENDLER = [
  'Morgen bringe ich etwas mit, das sich lohnt. Schau vorbei.',
  'Die Preise stehen gut. Wer heute verkauft, verkauft klug.',
  'Ich habe Saat dabei. Frisch, ehrlich, teuer.',
];

const JAHRESZEIT = {
  fruehling: 'Es riecht nach nassem Holz. Alles fängt wieder an.',
  sommer: 'Lange Tage. Die See ist warm bis zum Abend.',
  herbst: 'Die Bäume geben Farbe ab, als wäre sie ihnen zu schwer.',
  winter: 'Still. Das Feuer ist die wärmste Stelle der Insel.',
};

let mailSeq = 1;

/**
 * Die Post eines Morgens.
 *
 * @param {number} day       Inseltag
 * @param {object} welt      { seed }
 * @param {object} lage      { geholfen: [spiritId], jahreszeit, ereignis, tagNeu,
 *                             stufeVon: (id) => number, pakete: [{id, name}] }
 * @returns {Array} neue Briefe, ungelesen
 */
export function mailFor(day, welt, lage) {
  const rng = dailyRng(welt.seed, day, 'mail');
  const raus = [];
  const l = lage || {};

  // Pakete zuerst: Wer etwas bestellt hat, soll es oben im Kasten finden.
  const pakete = l.pakete || [];
  for (let i = 0; i < pakete.length; i++) {
    const p = pakete[i];
    raus.push({
      id: 'm' + (mailSeq++) + '_' + day,
      day: day,
      from: 'katalog',
      kind: 'parcel',
      subject: 'Ein Paket',
      text: randPick(rng, PAKET) + ' Inhalt: ' + p.name + '.',
      gift: { id: p.id, n: 1 },
      read: false,
    });
  }

  // Dank kommt nur, wenn man wirklich geholfen hat. Ein Dankesbrief für
  // nichts wäre eine Höflichkeitsfloskel, und die merkt man.
  const geholfen = (l.geholfen || []).filter(function (id) { return !!THANKS[id]; });
  if (geholfen.length) {
    const wer = randPick(rng, geholfen);
    const zeilen = THANKS[wer];
    const stufe = l.stufeVon ? l.stufeVon(wer) : 0;
    raus.push({
      id: 'm' + (mailSeq++) + '_' + day,
      day: day,
      from: wer,
      kind: 'thanks',
      subject: SPIRITS[wer] ? SPIRITS[wer].name : 'Ein Geist',
      text: zeilen[0] + ' ' + zeilen[1],
      gift: beilage(wer, rng, stufe),
      read: false,
    });
  }

  // Der Händler meldet sich hin und wieder – ohne Beilage, er ist Kaufmann.
  if (rng() < 0.28) {
    raus.push({
      id: 'm' + (mailSeq++) + '_' + day,
      day: day,
      from: 'fox',
      kind: 'shop',
      subject: 'Der Händler',
      text: randPick(rng, HAENDLER),
      gift: null,
      read: false,
    });
  }

  // Zum Wechsel der Jahreszeit ein Wort von der Insel selbst.
  if (l.tagNeu && l.jahreszeit && JAHRESZEIT[l.jahreszeit.id]) {
    raus.push({
      id: 'm' + (mailSeq++) + '_' + day,
      day: day,
      from: 'insel',
      kind: 'season',
      subject: l.jahreszeit.name,
      text: JAHRESZEIT[l.jahreszeit.id],
      gift: null,
      read: false,
    });
  }

  return raus;
}

/** Wie viele ungelesene Briefe im Kasten liegen. */
export function unreadCount(mail) {
  if (!mail) return 0;
  let n = 0;
  for (let i = 0; i < mail.length; i++) if (!mail[i].read) n++;
  return n;
}

/** Neue Briefe einsortieren; die ältesten fallen hinten heraus. */
export function fileMail(mail, neue) {
  const liste = (mail || []).concat(neue || []);
  return liste.slice(Math.max(0, liste.length - MAILBOX_MAX));
}

export { SPIRIT_IDS };
