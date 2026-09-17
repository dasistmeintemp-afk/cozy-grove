/** Gegenstandsdatenbank. */
import { inSeason } from './seasons.js';

export const CAT = {
  MATERIAL: 'material',
  FORAGE: 'forage',
  FISH: 'fish',
  BUG: 'bug',
  RELIC: 'relic',
  MEMORY: 'memory',
  DECOR: 'decor',
  SEED: 'seed',
  DISH: 'dish',
};

export const CAT_NAMES = {
  material: 'Material',
  forage: 'Gesammelt',
  fish: 'Fische',
  bug: 'Falter',
  relic: 'Fundstücke',
  memory: 'Erinnerungen',
  decor: 'Deko',
  seed: 'Saat',
  dish: 'Küche',
};

function it(id, name, cat, value, burn, extra) {
  const o = {
    id: id,
    name: name,
    cat: cat,
    value: value,
    burn: burn,
    icon: 'icon_' + id,
    stack: 99,
  };
  if (extra) for (const k in extra) o[k] = extra[k];
  return o;
}

const LIST = [
  // Materialien
  it('wood', 'Holz', CAT.MATERIAL, 3, 1),
  it('hardwood', 'Hartholz', CAT.MATERIAL, 9, 3),
  it('stone', 'Stein', CAT.MATERIAL, 3, 0),
  it('copper_ore', 'Kupfererz', CAT.MATERIAL, 11, 0),
  // Aus dem Hochland der Stillen Insel. Ein neuer Bereich braucht etwas, das
  // es nur dort gibt – sonst ist er eine größere Fläche mit demselben Kram.
  it('granite', 'Granit', CAT.MATERIAL, 19, 0),
  it('fiber', 'Pflanzenfaser', CAT.MATERIAL, 2, 1),
  it('resin', 'Harz', CAT.MATERIAL, 7, 2),
  it('clay', 'Ton', CAT.MATERIAL, 4, 0),
  it('shell', 'Muschel', CAT.MATERIAL, 5, 1),
  it('feather', 'Feder', CAT.MATERIAL, 4, 1),
  it('driftwood', 'Treibholz', CAT.MATERIAL, 4, 2),
  // Liegt am Morgen nach einer Sternennacht am Spülsaum. Wertvoll, weil das
  // Ereignis selten ist – nicht, weil er schwer zu finden wäre.
  it('stardust', 'Sternenstaub', CAT.MATERIAL, 38, 6),

  // Sammelgut
  it('berry', 'Waldbeeren', CAT.FORAGE, 6, 2),
  it('mushroom', 'Pilz', CAT.FORAGE, 7, 2),
  it('herb', 'Kraut', CAT.FORAGE, 5, 2),
  it('flower_pink', 'Rosenblume', CAT.FORAGE, 7, 2),
  it('flower_yellow', 'Sonnenblume', CAT.FORAGE, 7, 2),
  it('flower_violet', 'Glockenblume', CAT.FORAGE, 8, 2),
  it('flower_white', 'Sternblume', CAT.FORAGE, 9, 3),

  // Fundstücke
  it('bone', 'Alter Knochen', CAT.RELIC, 12, 4),
  it('shard', 'Tonscherbe', CAT.RELIC, 14, 4),
  it('bottle', 'Flaschenpost', CAT.RELIC, 10, 3),
  it('gem', 'Meerkristall', CAT.RELIC, 45, 10),
  it('amber', 'Bernstein', CAT.RELIC, 70, 14),
  it('coin_pouch', 'Münzbeutel', CAT.RELIC, 0, 0, { opens: [40, 90] }),

  // Fische
  it('fish_sardine', 'Sardine', CAT.FISH, 9, 3, { water: 'sea', rarity: 1 }),
  it('fish_mackerel', 'Makrele', CAT.FISH, 16, 3, { water: 'sea', rarity: 2 }),
  it('fish_cod', 'Dorsch', CAT.FISH, 26, 4, { water: 'sea', rarity: 3 }),
  it('fish_moonfish', 'Mondfisch', CAT.FISH, 64, 8, { water: 'sea', rarity: 5, night: true }),
  it('fish_roach', 'Rotfeder', CAT.FISH, 8, 3, { water: 'fresh', rarity: 1 }),
  it('fish_trout', 'Bachforelle', CAT.FISH, 18, 3, { water: 'fresh', rarity: 2 }),
  it('fish_catfish', 'Wels', CAT.FISH, 30, 4, { water: 'fresh', rarity: 3, night: true }),
  it('fish_goldcarp', 'Goldkarpfen', CAT.FISH, 70, 8, { water: 'fresh', rarity: 5 }),

  // Falter – mit dem Kescher zu fangen. `flight` steuert, wie schnell sie
  // ausweichen, `night` und `weight` die Verteilung am Himmel.
  it('bug_lemon', 'Zitronenfalter', CAT.BUG, 12, 3,
    { wing: '#f2d45a', flight: 1, weight: 5 }),
  it('bug_blue', 'Bläuling', CAT.BUG, 18, 3,
    { wing: '#8fb8e8', flight: 1.15, weight: 4 }),
  it('bug_admiral', 'Admiral', CAT.BUG, 30, 5,
    { wing: '#d9663f', flight: 1.4, weight: 2 }),
  it('bug_moth', 'Abendfalter', CAT.BUG, 16, 3,
    { wing: '#cfc2a6', flight: 1.1, weight: 5, night: true }),
  it('bug_luna', 'Mondfalter', CAT.BUG, 52, 8,
    { wing: '#bfe4c4', flight: 1.5, weight: 1, night: true }),

  // Erinnerungsstücke – nur für Aufgaben, nicht verkäuflich
  it('memory_locket', 'Medaillon', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_compass', 'Kompass', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_music', 'Spieldose', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_photo', 'Altes Foto', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_ribbon', 'Haarband', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_teacup', 'Teetasse', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_shellchain', 'Muschelkette', CAT.MEMORY, 0, 0, { quest: true }),

  // Nur unter bestimmten Bedingungen zu finden – das ist der Grund, an einem
  // anderen Tag oder zu anderer Stunde wiederzukommen.
  // Wächst nirgends wild. Sie kommt nur dort, wo Blumenbeete beieinander
  // stehen – siehe `kreuzChance` in crops.js. Das einzige Stück im Spiel, das
  // man nicht findet, sondern zieht.
  it('flower_dusk', 'Dämmerblume', CAT.FORAGE, 26, 6),
  it('moonflower', 'Mondblume', CAT.FORAGE, 34, 6, { onlyAt: 'night', spawn: 7 }),
  it('rainmushroom', 'Regenpilz', CAT.FORAGE, 30, 6, { onlyAt: 'rain', spawn: 8 }),
  it('fogcrystal', 'Nebelkristall', CAT.RELIC, 48, 9, { onlyAt: 'fog', spawn: 5 }),

  /**
   * Die vier Jahresgaben.
   *
   * Dieselbe Bauart wie Mondblume, Regenpilz und Nebelkristall darüber:
   * `onlyAt` sagt, wann es sie gibt, und `syncConditional` legt sie aus und
   * räumt sie wieder weg. Der Unterschied ist nur, dass die Bedingung
   * diesmal drei Monate hält statt einer Nacht.
   *
   * Sie sind der Grund, überhaupt im Januar hinauszugehen. Bis hierher war
   * die Jahreszeit eine Farbe, ein Wettermix und vier Tierarten – man konnte
   * ein ganzes Jahr spielen, ohne je etwas in der Hand zu halten, das es nur
   * in dieser Jahreszeit gibt.
   */
  it('petal', 'Blütenblatt', CAT.FORAGE, 26, 4, { onlyAt: 'spring', spawn: 7 }),
  it('sunstone', 'Sonnenstein', CAT.RELIC, 44, 8, { onlyAt: 'summer', spawn: 6 }),
  it('mapleleaf', 'Ahornblatt', CAT.FORAGE, 26, 5, { onlyAt: 'autumn', spawn: 7 }),
  it('frostflower', 'Eisblume', CAT.FORAGE, 34, 6, { onlyAt: 'winter', spawn: 6 }),

  // An die Wand – nur im Zimmer. `wand` sagt: Das hängt, es steht nicht.
  // Draußen gibt es dafür keinen Platz, und das Spiel sagt es auch.
  it('picture', 'Bild', CAT.DECOR, 64, 0, { prop: 'picture', wand: true, charm: 5 }),
  // Die Skizzen. Kein Katalogstueck und kein Rezept: Sie entstehen beim
  // Sitzen (siehe `bild.js`) und haengen sich aus dem Zettel an die Wand.
  // Der Wert ist null - verkaufen laesst sich eine Erinnerung nicht.
  it('islandpic', 'Skizze', CAT.DECOR, 0, 0, { prop: 'picture', wand: true, charm: 6 }),
  it('shelf', 'Wandbrett', CAT.DECOR, 58, 0, { prop: 'shelf', wand: true, charm: 4 }),
  it('wreath', 'Kranz', CAT.DECOR, 96, 0, { prop: 'wreath', wand: true, charm: 6 }),

  /**
   * Vier Jahreskraenze – je einer aus der Gabe seiner Jahreszeit.
   *
   * Das ist der Grund, warum die Jahresgaben ueberhaupt etwas wert sind.
   * Ein Fundstueck, das man nur verkaufen kann, ist Geld mit einem Namen;
   * eines, aus dem etwas wird, das an der Wand haengen bleibt, macht aus
   * drei Monaten eine Erinnerung. Wer im Januar anfaengt, hat nach einem
   * Jahr vier Kraenze und weiss, welcher woher kam.
   *
   * Etwas mehr Charme als der gewoehnliche Kranz: Man kann sie nicht
   * jederzeit bauen.
   */
  it('wreath_spring', 'Blütenkranz', CAT.DECOR, 130, 0, { prop: 'wreath_spring', wand: true, charm: 8 }),
  it('wreath_summer', 'Sonnenkranz', CAT.DECOR, 130, 0, { prop: 'wreath_summer', wand: true, charm: 8 }),
  it('wreath_autumn', 'Laubkranz', CAT.DECOR, 130, 0, { prop: 'wreath_autumn', wand: true, charm: 8 }),
  it('wreath_winter', 'Eiskranz', CAT.DECOR, 130, 0, { prop: 'wreath_winter', wand: true, charm: 8 }),
  it('hangplant', 'Hängepflanze', CAT.DECOR, 130, 0, { prop: 'hangplant', wand: true, charm: 7 }),

  // Deko (aufstellbar)
  // Die Reiselaterne kommt aus keiner Werkbank und aus keinem Katalog – sie
  // ist das einzige Stück im Spiel, das man nur geschenkt bekommen kann,
  // und zwar vom Wanderer beim zweiten Tausch. Ein Besucher, der nur
  // Vorhandenes weiterreicht, wäre ein Händler mit Hut.
  it('travellamp', 'Reiselaterne', CAT.DECOR, 210, 0,
    { prop: 'travellamp', light: 146, charm: 11 }),
  // Zwei Stücke, die ZEIGEN, was man gefangen hat – siehe `schaukasten.js`.
  // Bis hierher landeten Fische und Falter im Fundbuch und damit nirgends,
  // wo man sie ansieht.
  it('aquarium', 'Becken', CAT.DECOR, 230, 0, { prop: 'aquarium', charm: 10 }),
  it('buttercase', 'Falterkasten', CAT.DECOR, 150, 0, { prop: 'buttercase', charm: 7 }),
  it('lantern', 'Laterne', CAT.DECOR, 40, 0, { prop: 'lantern', light: 62, charm: 4 }),
  it('moonlamp', 'Mondlaterne', CAT.DECOR, 120, 0, { prop: 'lantern', light: 128, charm: 9 }),
  it('bench', 'Holzbank', CAT.DECOR, 46, 0, { prop: 'bench', charm: 4 }),
  it('fence', 'Zaunstück', CAT.DECOR, 14, 0, { prop: 'fence', charm: 1 }),
  it('flowerbed', 'Blumenbeet', CAT.DECOR, 38, 0, { prop: 'flowerbed', charm: 5 }),
  it('birdhouse', 'Vogelhaus', CAT.DECOR, 52, 0, { prop: 'birdhouse', charm: 5 }),
  it('windchime', 'Windspiel', CAT.DECOR, 58, 0, { prop: 'windchime', charm: 6 }),
  it('rug', 'Flickenteppich', CAT.DECOR, 44, 0, { prop: 'rug', charm: 4, flat: true }),
  it('path_tile', 'Steinweg', CAT.DECOR, 8, 0, { prop: 'path_tile', charm: 1, tile: true }),
  it('signpost', 'Wegweiser', CAT.DECOR, 30, 0, { prop: 'signpost', charm: 2 }),
  it('bridge_kit', 'Brückenbausatz', CAT.DECOR, 0, 0, { special: 'bridge' }),

  // Zum Einrichten. Zehn Stücke waren zu wenig, um sich ein Zuhause
  // zurechtzulegen – erst mit Sitzgruppe, Licht, Garten und etwas, das flach
  // am Boden liegt, wird aus Hinstellen ein Einrichten.
  it('table', 'Gartentisch', CAT.DECOR, 64, 0, { prop: 'table', charm: 5 }),
  it('chair', 'Gartenstuhl', CAT.DECOR, 42, 0, { prop: 'chair', charm: 3 }),
  it('hammock', 'Hängematte', CAT.DECOR, 150, 0, { prop: 'hammock', charm: 9 }),
  it('swing', 'Schaukel', CAT.DECOR, 175, 0, { prop: 'swing', charm: 10 }),
  it('firebowl', 'Feuerschale', CAT.DECOR, 130, 0, { prop: 'firebowl', light: 96, charm: 8 }),
  it('stringlights', 'Lichterkette', CAT.DECOR, 165, 0,
    { prop: 'stringlights', light: 138, charm: 10 }),
  it('paperlamp', 'Papierlampion', CAT.DECOR, 88, 0, { prop: 'paperlamp', light: 74, charm: 6 }),
  it('planter', 'Pflanzkübel', CAT.DECOR, 56, 0, { prop: 'planter', charm: 5 }),
  it('trellis', 'Rankgitter', CAT.DECOR, 96, 0, { prop: 'trellis', charm: 7 }),
  it('birdbath', 'Vogeltränke', CAT.DECOR, 110, 0, { prop: 'birdbath', charm: 7 }),
  it('beehive', 'Bienenkorb', CAT.DECOR, 145, 0, { prop: 'beehive', charm: 8 }),
  it('scarecrow', 'Vogelscheuche', CAT.DECOR, 78, 0, { prop: 'scarecrow', charm: 5 }),
  it('weathervane', 'Wetterhahn', CAT.DECOR, 190, 0, { prop: 'weathervane', charm: 11 }),
  it('bowl', 'Futternapf', CAT.DECOR, 120, 0, { prop: 'bowl', charm: 3 }),
  it('mat', 'Bastmatte', CAT.DECOR, 36, 0, { prop: 'mat', charm: 3, flat: true }),
  it('pond', 'Zierteich', CAT.DECOR, 210, 0, { prop: 'pond', charm: 12, flat: true }),

  // Nachschub für die Wünsche: zwei Stücke je Sorte. Der Grund steht in
  // `painted-decor.js` – eine Sorte mit vier Möglichkeiten ist nach dreißig
  // Wünschen keine Entscheidung mehr.
  it('stump', 'Baumstumpfhocker', CAT.DECOR, 34, 0, { prop: 'stump', charm: 3 }),
  it('stonebench', 'Steinbank', CAT.DECOR, 125, 0, { prop: 'stonebench', charm: 8 }),
  it('stonelamp', 'Steinlaterne', CAT.DECOR, 158, 0,
    { prop: 'stonelamp', light: 104, charm: 9 }),
  it('torch', 'Fackel', CAT.DECOR, 52, 0, { prop: 'torch', light: 88, charm: 4 }),
  it('flowerbox', 'Blumenkasten', CAT.DECOR, 72, 0, { prop: 'flowerbox', charm: 6 }),
  it('bonsai', 'Bonsai', CAT.DECOR, 168, 0, { prop: 'bonsai', charm: 10 }),
  it('hedgehogbox', 'Igelhaus', CAT.DECOR, 86, 0, { prop: 'hedgehogbox', charm: 6 }),
  it('feeder', 'Futterhäuschen', CAT.DECOR, 104, 0, { prop: 'feeder', charm: 7 }),
  it('steppingstones', 'Trittsteine', CAT.DECOR, 28, 0,
    { prop: 'steppingstones', charm: 2, flat: true }),
  it('arch', 'Torbogen', CAT.DECOR, 196, 0, { prop: 'arch', charm: 11 }),
  it('clothesline', 'Wäscheleine', CAT.DECOR, 68, 0, { prop: 'clothesline', charm: 6 }),
  it('bookstack', 'Bücherkiste', CAT.DECOR, 92, 0, { prop: 'bookstack', charm: 7 }),

  // Gerichte aus der Küche. Der Wert liegt bei rund dem Doppelten der
  // Zutaten – das ist der wirtschaftliche Sinn der Sache, siehe
  // `kitchen.js`. Verbrennbar sind sie NICHT: Etwas Gekochtes ins Feuer zu
  // werfen wäre die zweite Handlung nach der Saat, die hier wirklich schade
  // wäre.
  it('dish_berrymash', 'Beerenmus', CAT.DISH, 34, 0),
  it('dish_flowersalad', 'Blütensalat', CAT.DISH, 40, 0),
  it('dish_herbtea', 'Kräutertee', CAT.DISH, 38, 0),
  it('dish_mushroompan', 'Pilzpfanne', CAT.DISH, 52, 0),
  it('dish_violetsyrup', 'Glockensirup', CAT.DISH, 50, 0),
  it('dish_forestsoup', 'Waldsuppe', CAT.DISH, 62, 0),
  it('dish_berrycake', 'Beerenkuchen', CAT.DISH, 58, 0),
  it('dish_rainstew', 'Regenpilz-Eintopf', CAT.DISH, 140, 0),
  it('dish_mooncake', 'Mondblütenkuchen', CAT.DISH, 168, 0),

  // Saat. `plant` sagt dem Aufstellen, dass hier ein Beet entsteht und keine
  // Deko; `prop` ist die reife Pflanze – so sieht man beim Setzen schon, was
  // daraus wird. Nicht verbrennbar: Saat ins Feuer zu werfen wäre die eine
  // Handlung, die in diesem Spiel wirklich schade wäre.
  it('seed_berry', 'Beerensaat', CAT.SEED, 9, 0, { plant: 'berry', prop: 'crop_berry_2' }),
  it('seed_herb', 'Krautsaat', CAT.SEED, 8, 0, { plant: 'herb', prop: 'crop_herb_2' }),
  it('seed_flower', 'Blumensaat', CAT.SEED, 12, 0, { plant: 'flower', prop: 'crop_flower_2' }),
  it('seed_moon', 'Mondsaat', CAT.SEED, 40, 0, { plant: 'moon', prop: 'crop_moon_2' }),

  /**
   * Vier Setzlinge.
   *
   * `pflanzt` statt `plant`: Die Saat legt ein BEET an, das man erntet und
   * das danach weg ist. Ein Setzling wird ein Baum und bleibt stehen. Zwei
   * verschiedene Dinge, und sie an einem Merkmal aufzuhaengen hiesse, dass
   * die Erntelogik lernen muesste, dass manche Beete keine sind.
   *
   * Sie kommen aus gefaellten Baeumen (siehe `AUS_BAUM`) und aus dem
   * Katalog. Der Wert ist niedrig: Ein Setzling ist kein Schatz, er ist eine
   * Moeglichkeit.
   */
  it('sapling_oak', 'Eichensetzling', CAT.SEED, 14, 0, { pflanzt: 'sapling_oak', prop: 'sapling_oak_1' }),
  it('sapling_birch', 'Birkensetzling', CAT.SEED, 14, 0, { pflanzt: 'sapling_birch', prop: 'sapling_birch_1' }),
  it('sapling_maple', 'Ahornsetzling', CAT.SEED, 16, 0, { pflanzt: 'sapling_maple', prop: 'sapling_maple_1' }),
  it('sapling_pine', 'Kiefernsetzling', CAT.SEED, 18, 0, { pflanzt: 'sapling_pine', prop: 'sapling_pine_1' }),

  // Andenken – das Geschenk am Ende einer Erinnerungskette. Nicht käuflich,
  // nicht herstellbar, nicht verbrennbar: der einzige Weg dahin ist die
  // Geschichte des jeweiligen Geistes.
  it('keepsake_locket', 'Flämmchens Medaillon', CAT.DECOR, 0, 0,
    { prop: 'memory_locket', charm: 10, keepsake: true }),
  it('keepsake_ribbon', 'Miras Haarband', CAT.DECOR, 0, 0,
    { prop: 'memory_ribbon', charm: 10, keepsake: true }),
  it('keepsake_compass', 'Kiesels Kompass', CAT.DECOR, 0, 0,
    { prop: 'memory_compass', charm: 10, keepsake: true }),
  it('keepsake_photo', 'Brunos altes Foto', CAT.DECOR, 0, 0,
    { prop: 'memory_photo', charm: 10, keepsake: true }),
  it('keepsake_music', 'Tobis Spieldose', CAT.DECOR, 0, 0,
    { prop: 'memory_music', charm: 10, keepsake: true }),
  it('keepsake_teacup', 'Nellys Teetasse', CAT.DECOR, 0, 0,
    { prop: 'memory_teacup', charm: 10, keepsake: true }),
  it('keepsake_shellchain', 'Wandas Muschelkette', CAT.DECOR, 0, 0,
    { prop: 'memory_shellchain', charm: 10, keepsake: true }),
];

const BY_ID = Object.create(null);
for (let i = 0; i < LIST.length; i++) BY_ID[LIST[i].id] = LIST[i];

export const ITEMS = BY_ID;
export const ITEM_LIST = LIST;

export function getItem(id) {
  return BY_ID[id] || null;
}

export function itemName(id) {
  const it2 = BY_ID[id];
  return it2 ? it2.name : id;
}

export function itemIcon(id) {
  const it2 = BY_ID[id];
  return it2 ? it2.icon : 'icon_star';
}

export function sellValue(id) {
  const it2 = BY_ID[id];
  return it2 ? it2.value : 0;
}

export function burnValue(id) {
  const it2 = BY_ID[id];
  return it2 ? it2.burn : 0;
}

export function isPlaceable(id) {
  const it2 = BY_ID[id];
  return !!(it2 && it2.cat === CAT.DECOR && it2.prop);
}

/**
 * Was hier gerade beißt.
 *
 * `season` darf fehlen – dann zählt der ganze Kalender. Diese Nachsicht ist
 * Absicht: Wer die Liste nur ansehen will (Fundbuch, Tests, Preisrechnung),
 * soll keine Jahreszeit erfinden müssen. Nur wer wirklich auswirft, gibt
 * eine an, und erst dann wird gefiltert.
 */
export function fishesOf(water, night, season) {
  const out = [];
  for (let i = 0; i < LIST.length; i++) {
    const f = LIST[i];
    if (f.cat !== CAT.FISH) continue;
    if (f.water !== water) continue;
    if (f.night && !night) continue;
    if (!inSeason(f.id, season)) continue;
    out.push(f);
  }
  return out;
}

/**
 * Gegenstände, die nur unter einer Bedingung wachsen.
 *
 * Bedingung und Anzahl stehen am Gegenstand, nicht im Spielkern: vorher
 * standen sie doppelt da, und ein vierter Gegenstand hätte stillschweigend
 * nie ausgesät.
 */
/**
 * Was `onlyAt` bedeuten darf – und zu welcher Sorte es gehört.
 *
 * Drei Sorten, und der Unterschied ist keine Spitzfindigkeit:
 *
 *   zeit        kommt in jeder Jahreszeit, jeden Tag
 *   wetter      kommt vielleicht nicht jeden Tag – muss aber in JEDER
 *               Jahreszeit oft genug vorkommen, sonst ist es dort gesperrt
 *   jahreszeit  kommt drei Monate lang gar nicht, und das ist der Sinn
 *
 * Die Unterscheidung steht hier und nicht in den Prüfungen, weil sie eine
 * Aussage über das SPIEL ist: „Keine Jahreszeit sperrt etwas aus" gilt fürs
 * Wetter und darf für eine Jahresgabe gerade nicht gelten. Zwei Listen an
 * zwei Orten wären beim fünften Eintrag auseinandergelaufen.
 */
export const BEDINGUNGEN = {
  night: 'zeit',
  rain: 'wetter',
  fog: 'wetter',
  spring: 'jahreszeit',
  summer: 'jahreszeit',
  autumn: 'jahreszeit',
  winter: 'jahreszeit',
};

export const CONDITIONAL = LIST.filter(function (i) { return !!i.onlyAt; });

/** Die bedingten Gegenstände einer Sorte – z. B. alle vier Jahresgaben. */
export function bedingteVon(sorte) {
  return CONDITIONAL.filter(function (i) { return BEDINGUNGEN[i.onlyAt] === sorte; });
}

/** Alle Falter. */
export const BUGS = LIST.filter(function (i) { return i.cat === CAT.BUG; });

/** Falter, die zu dieser Tageszeit fliegen – und zu dieser Jahreszeit. */
export function bugsOf(night, season) {
  return BUGS.filter(function (b) {
    return !!b.night === !!night && inSeason(b.id, season);
  });
}

export const MEMORY_IDS = LIST
  .filter(function (i) { return i.cat === CAT.MEMORY; })
  .map(function (i) { return i.id; });

/**
 * Die Kurznamen der Erinnerungsstücke – die Grafik legt sie unter diesen
 * Namen ab.
 *
 * Abgeleitet aus der Gegenstandsliste statt daneben gepflegt: Beim siebten
 * Stück stand dieselbe Aufzählung in `sprites.js` und noch einmal im Test,
 * und beide gingen leer aus.
 */
export const MEMORY_KINDS = MEMORY_IDS.map(function (id) { return id.slice('memory_'.length); });
