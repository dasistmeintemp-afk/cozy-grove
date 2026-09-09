/**
 * Das Fundbuch – Sammeln mit Folgen.
 *
 * Bis hierher war das Fundbuch eine Liste: Es zeigte, was man schon hatte,
 * und tat sonst nichts. Damit ist es eine Statistik und kein Ziel. Zwei
 * Dinge fehlten, und beide stehen hier:
 *
 * 1. **Ein Hinweis, wo das Fehlende steckt.** Ein leeres Feld mit „???"
 *    sagt nur, dass etwas fehlt – nicht, wie man es bekommt. Der Reiz einer
 *    Sammlung kommt daher, dass man weiß, wohin man laufen muss.
 * 2. **Eine Belohnung für die volle Reihe.** Ohne sie ist das letzte Stück
 *    einer Reihe genauso viel wert wie das erste, und keiner sucht danach.
 *
 * Die Reihen sind die Kategorien, die es ohnehin gibt – keine zweite
 * Einteilung daneben, die veralten könnte.
 */
import { CAT, CAT_NAMES, ITEM_LIST, getItem } from './items.js';

/**
 * Was eine vollständige Reihe einbringt.
 *
 * Die Beträge steigen mit dem Aufwand, nicht mit der Zahl der Stücke: Fünf
 * Falter zu fangen – zwei davon nur nachts – ist mehr Arbeit als zehn
 * Materialien einzusammeln, die einem ohnehin über den Weg laufen.
 */
export const SETS = [
  {
    id: CAT.MATERIAL, name: CAT_NAMES[CAT.MATERIAL],
    note: 'Alles, was die Insel hergibt.',
    reward: { coins: 200, ember: 15 },
  },
  {
    id: CAT.FORAGE, name: CAT_NAMES[CAT.FORAGE],
    note: 'Auch das, was nur bei bestimmtem Wetter wächst.',
    reward: { coins: 250, ember: 15, items: [{ id: 'seed_moon', n: 2 }] },
  },
  {
    id: CAT.SEED, name: CAT_NAMES[CAT.SEED],
    note: 'Vier Saaten – die Mondsaat führt der Laden nur manchmal.',
    reward: { coins: 150, ember: 10 },
  },
  {
    id: CAT.FISH, name: CAT_NAMES[CAT.FISH],
    note: 'Süß- und Salzwasser, Tag und Nacht.',
    reward: { coins: 450, ember: 30, items: [{ id: 'gem', n: 2 }] },
  },
  {
    id: CAT.BUG, name: CAT_NAMES[CAT.BUG],
    note: 'Zwei davon fliegen nur nachts.',
    reward: { coins: 400, ember: 25, items: [{ id: 'gem', n: 1 }] },
  },
  {
    id: CAT.RELIC, name: CAT_NAMES[CAT.RELIC],
    note: 'Aus Grabstellen – und aus dem Nebel.',
    reward: { coins: 500, ember: 35, items: [{ id: 'gem', n: 2 }] },
  },
  {
    id: CAT.MEMORY, name: CAT_NAMES[CAT.MEMORY],
    note: 'Je eine Erinnerung von jedem Geist.',
    reward: { coins: 600, ember: 50 },
  },
  {
    id: CAT.DECOR, name: CAT_NAMES[CAT.DECOR],
    note: 'Gebautes, Gekauftes und jedes Andenken.',
    reward: { coins: 800, ember: 60, items: [{ id: 'gem', n: 3 }] },
  },
];

export const SET_IDS = SETS.map(function (s) { return s.id; });

/**
 * Wo das Fehlende steckt.
 *
 * Von Hand geschrieben, weil die Antwort nirgends im Code steht: Dass die
 * Mondblume nur nachts blüht, ergibt sich aus `CONDITIONAL`, dass Harz von
 * Ahorn und Kiefer kommt, steckt in einer Zufallsfunktion. Ein Test wacht
 * darüber, dass jeder Gegenstand hier einen Satz hat und keiner zu viel.
 *
 * Kurz halten: Das ist ein Fingerzeig, keine Anleitung.
 */
export const HINTS = {
  // Material
  wood: 'Von jedem Baum.',
  hardwood: 'Aus Eichen und Kiefern, ab Axt Stufe 2.',
  stone: 'Aus Findlingen und kleinen Steinen.',
  copper_ore: 'Aus Erzbrocken – Spitzhacke Stufe 2.',
  fiber: 'Aus Gräsern, Schilf und Birken.',
  resin: 'Von Ahorn und Kiefer.',
  clay: 'Beim Zerschlagen großer Findlinge.',
  shell: 'Am Strand, im Sand.',
  feather: 'Im Gras unter Bäumen und am Strand – und unter deinem Vogelhaus.',
  driftwood: 'Am Spülsaum, nach jedem Tag neu.',

  // Sammelgut
  berry: 'An Beerensträuchern – oder aus dem Beet.',
  mushroom: 'Im Wald, im Schatten.',
  herb: 'Auf Wiesen und Lichtungen.',
  flower_pink: 'Auf der Wiese beim Lager.',
  flower_yellow: 'Auf der Wiese beim Lager.',
  flower_violet: 'Im Wald und oben an den Klippen.',
  flower_white: 'Überall dort, wo Gras wächst.',
  moonflower: 'Blüht nur nachts.',
  rainmushroom: 'Kommt nur, wenn es regnet.',

  // Saat
  seed_berry: 'Beim Händler, jeden Tag.',
  seed_herb: 'Beim Händler, jeden Tag.',
  seed_flower: 'Beim Händler, jeden Tag.',
  seed_moon: 'Beim Händler, aber nicht jeden Tag.',

  // Fische
  fish_sardine: 'Im Meer, bei Tag und Nacht.',
  fish_mackerel: 'Im Meer, häufig genug.',
  fish_cod: 'Im Meer, etwas seltener.',
  fish_moonfish: 'Im Meer – und nur nachts.',
  fish_roach: 'Im Fluss, überall.',
  fish_trout: 'Im Fluss, mit etwas Geduld.',
  fish_catfish: 'Im Fluss, nur nachts.',
  fish_goldcarp: 'Im Fluss, sehr selten. Der Schwarmtag hilft.',

  // Falter
  bug_lemon: 'Tagsüber über der Wiese.',
  bug_blue: 'Tagsüber, gern bei Blumen.',
  bug_admiral: 'Tagsüber, seltener als die anderen.',
  bug_moth: 'Nachts, am Licht.',
  bug_luna: 'Nachts, sehr selten. Laternen helfen.',

  // Fundstücke
  bone: 'Aus Grabstellen.',
  shard: 'Aus Grabstellen.',
  bottle: 'Aus Grabstellen am Strand.',
  gem: 'Aus Erzbrocken, mit Glück.',
  coin_pouch: 'Aus Grabstellen – öffnet sich von selbst.',
  fogcrystal: 'Erscheint nur bei Nebel.',

  // Erinnerungen
  memory_locket: 'Flämmchens Kette – von ihm selbst.',
  memory_compass: 'Käpt\'n Kiesels Kette.',
  memory_music: 'Tobi Tüftlers Kette.',
  memory_photo: 'Bruno Borkes Kette.',
  memory_ribbon: 'Mira Moos\' Kette.',
  memory_teacup: 'Nelly Nadels Kette.',
  memory_shellchain: 'Wanda Watts Kette, draußen auf der Insel.',

  // Deko
  lantern: 'Werkbank – oder beim Händler.',
  moonlamp: 'Werkbank, braucht ein großes Feuer.',
  bench: 'Werkbank.',
  fence: 'Werkbank.',
  flowerbed: 'Werkbank.',
  birdhouse: 'Werkbank.',
  windchime: 'Werkbank.',
  rug: 'Werkbank.',
  path_tile: 'Werkbank – der Weg unter den Füßen.',
  signpost: 'Werkbank.',
  bridge_kit: 'Werkbank. Öffnet die Klippen.',
  granite: 'Im Hochland der Stillen Insel, ab Spitzhacke Stufe 3.',
  amber: 'Aus Geoden im Hochland, ab Spitzhacke Stufe 4.',
  table: 'Aus dem Katalog – kommt am nächsten Morgen mit der Post.',
  chair: 'Aus dem Katalog.',
  hammock: 'Aus dem Katalog, wenn die Insel Farbe hat.',
  swing: 'Aus dem Katalog, wenn die Insel Farbe hat.',
  firebowl: 'Aus dem Katalog.',
  stringlights: 'Aus dem Katalog, wenn die Insel Farbe hat.',
  paperlamp: 'Aus dem Katalog.',
  planter: 'Aus dem Katalog.',
  trellis: 'Aus dem Katalog.',
  birdbath: 'Aus dem Katalog.',
  beehive: 'Aus dem Katalog, wenn die Insel Farbe hat.',
  scarecrow: 'Aus dem Katalog.',
  weathervane: 'Aus dem Katalog, ganz hinten.',
  bowl: 'Aus dem Katalog. Stell ihn hin und warte, wer kommt.',
  mat: 'Aus dem Katalog.',
  pond: 'Aus dem Katalog, ganz hinten.',
  keepsake_locket: 'Flämmchens Andenken, wenn seine Kette voll ist.',
  keepsake_ribbon: 'Miras Andenken, wenn ihre Kette voll ist.',
  keepsake_compass: 'Kiesels Andenken, wenn seine Kette voll ist.',
  keepsake_photo: 'Brunos Andenken, wenn seine Kette voll ist.',
  keepsake_music: 'Tobis Andenken, wenn seine Kette voll ist.',
  keepsake_teacup: 'Nellys Andenken, wenn ihre Kette voll ist.',
  keepsake_shellchain: 'Wandas Andenken, wenn ihre Kette voll ist.',
};

/** Der Fingerzeig zu einem Gegenstand – nie leer. */
export function hintFor(id) {
  return HINTS[id] || 'Irgendwo auf der Insel.';
}

/** Alle Gegenstände einer Reihe. */
export function itemsOf(setId) {
  return ITEM_LIST.filter(function (i) { return i.cat === setId; });
}

export function setById(id) {
  for (let i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i];
  return null;
}

/** Wie weit eine Reihe ist: { have, total, done }. */
export function progressOf(setId, inventory) {
  const list = itemsOf(setId);
  let have = 0;
  for (let i = 0; i < list.length; i++) {
    if (inventory.everFound(list[i].id)) have++;
  }
  return { have: have, total: list.length, done: list.length > 0 && have >= list.length };
}

/**
 * Welche Reihen jetzt fällig sind, aber noch nicht ausgezahlt.
 *
 * Wie bei den Meilensteinen eine Liste: Wer mit einem alten Spielstand
 * ankommt, hat vielleicht schon zwei Reihen voll und bekommt beides.
 */
export function dueSets(inventory, bezahlt) {
  const out = [];
  for (let i = 0; i < SETS.length; i++) {
    const s = SETS[i];
    if (bezahlt && bezahlt[s.id]) continue;
    if (progressOf(s.id, inventory).done) out.push(s);
  }
  return out;
}

/** Was insgesamt gefunden ist – für die Zeile unter dem Fundbuch. */
export function totalProgress(inventory) {
  let have = 0;
  for (let i = 0; i < ITEM_LIST.length; i++) {
    if (inventory.everFound(ITEM_LIST[i].id)) have++;
  }
  return { have: have, total: ITEM_LIST.length };
}

export { getItem };
