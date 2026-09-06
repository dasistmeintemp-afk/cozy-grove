/** Gegenstandsdatenbank. */

export const CAT = {
  MATERIAL: 'material',
  FORAGE: 'forage',
  FISH: 'fish',
  RELIC: 'relic',
  MEMORY: 'memory',
  DECOR: 'decor',
};

export const CAT_NAMES = {
  material: 'Material',
  forage: 'Gesammelt',
  fish: 'Fische',
  relic: 'Fundstuecke',
  memory: 'Erinnerungen',
  decor: 'Deko',
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
  it('fiber', 'Pflanzenfaser', CAT.MATERIAL, 2, 1),
  it('resin', 'Harz', CAT.MATERIAL, 7, 2),
  it('clay', 'Ton', CAT.MATERIAL, 4, 0),
  it('shell', 'Muschel', CAT.MATERIAL, 5, 1),
  it('feather', 'Feder', CAT.MATERIAL, 4, 1),
  it('driftwood', 'Treibholz', CAT.MATERIAL, 4, 2),

  // Sammelgut
  it('berry', 'Waldbeeren', CAT.FORAGE, 6, 2),
  it('mushroom', 'Pilz', CAT.FORAGE, 7, 2),
  it('herb', 'Kraut', CAT.FORAGE, 5, 2),
  it('flower_pink', 'Rosenblume', CAT.FORAGE, 7, 2),
  it('flower_yellow', 'Sonnenblume', CAT.FORAGE, 7, 2),
  it('flower_violet', 'Glockenblume', CAT.FORAGE, 8, 2),
  it('flower_white', 'Sternblume', CAT.FORAGE, 9, 3),

  // Fundstuecke
  it('bone', 'Alter Knochen', CAT.RELIC, 12, 4),
  it('shard', 'Tonscherbe', CAT.RELIC, 14, 4),
  it('bottle', 'Flaschenpost', CAT.RELIC, 10, 3),
  it('gem', 'Meerkristall', CAT.RELIC, 45, 10),
  it('coin_pouch', 'Muenzbeutel', CAT.RELIC, 0, 0, { opens: [40, 90] }),

  // Fische
  it('fish_sardine', 'Sardine', CAT.FISH, 9, 3, { water: 'sea', rarity: 1 }),
  it('fish_mackerel', 'Makrele', CAT.FISH, 16, 3, { water: 'sea', rarity: 2 }),
  it('fish_cod', 'Dorsch', CAT.FISH, 26, 4, { water: 'sea', rarity: 3 }),
  it('fish_moonfish', 'Mondfisch', CAT.FISH, 64, 8, { water: 'sea', rarity: 5, night: true }),
  it('fish_roach', 'Rotfeder', CAT.FISH, 8, 3, { water: 'fresh', rarity: 1 }),
  it('fish_trout', 'Bachforelle', CAT.FISH, 18, 3, { water: 'fresh', rarity: 2 }),
  it('fish_catfish', 'Wels', CAT.FISH, 30, 4, { water: 'fresh', rarity: 3, night: true }),
  it('fish_goldcarp', 'Goldkarpfen', CAT.FISH, 70, 8, { water: 'fresh', rarity: 5 }),

  // Erinnerungsstuecke – nur fuer Aufgaben, nicht verkaeuflich
  it('memory_locket', 'Medaillon', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_compass', 'Kompass', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_music', 'Spieldose', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_photo', 'Altes Foto', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_ribbon', 'Haarband', CAT.MEMORY, 0, 0, { quest: true }),
  it('memory_teacup', 'Teetasse', CAT.MEMORY, 0, 0, { quest: true }),

  // Deko (aufstellbar)
  it('lantern', 'Laterne', CAT.DECOR, 40, 0, { prop: 'lantern', light: 62, charm: 4 }),
  it('bench', 'Holzbank', CAT.DECOR, 46, 0, { prop: 'bench', charm: 4 }),
  it('fence', 'Zaunstueck', CAT.DECOR, 14, 0, { prop: 'fence', charm: 1 }),
  it('flowerbed', 'Blumenbeet', CAT.DECOR, 38, 0, { prop: 'flowerbed', charm: 5 }),
  it('birdhouse', 'Vogelhaus', CAT.DECOR, 52, 0, { prop: 'birdhouse', charm: 5 }),
  it('windchime', 'Windspiel', CAT.DECOR, 58, 0, { prop: 'windchime', charm: 6 }),
  it('rug', 'Flickenteppich', CAT.DECOR, 44, 0, { prop: 'rug', charm: 4, flat: true }),
  it('path_tile', 'Steinweg', CAT.DECOR, 8, 0, { prop: 'path_tile', charm: 1, tile: true }),
  it('signpost', 'Wegweiser', CAT.DECOR, 30, 0, { prop: 'signpost', charm: 2 }),
  it('bridge_kit', 'Brueckenbausatz', CAT.DECOR, 0, 0, { special: 'bridge' }),

  // Andenken – das Geschenk am Ende einer Erinnerungskette. Nicht kaeuflich,
  // nicht herstellbar, nicht verbrennbar: der einzige Weg dahin ist die
  // Geschichte des jeweiligen Geistes.
  it('keepsake_locket', 'Flaemmchens Medaillon', CAT.DECOR, 0, 0,
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

export function fishesOf(water, night) {
  const out = [];
  for (let i = 0; i < LIST.length; i++) {
    const f = LIST[i];
    if (f.cat !== CAT.FISH) continue;
    if (f.water !== water) continue;
    if (f.night && !night) continue;
    out.push(f);
  }
  return out;
}

export const MEMORY_IDS = LIST
  .filter(function (i) { return i.cat === CAT.MEMORY; })
  .map(function (i) { return i.id; });
