/**
 * Inhaltliche Konsistenz ohne Browser.
 *
 * Ob eine Grafik wirklich gemalt wurde, prüft der Browsertest – hier geht es
 * um die Verweise: Jeder Gegenstand, jedes Rezept und jede Objektdefinition
 * muss auf einen Namen zeigen, den das Register auch anlegt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { BUGS, CONDITIONAL, ITEM_LIST, getItem, CAT, MEMORY_IDS, MEMORY_KINDS, fishesOf, bugsOf } from '../../src/game/items.js';
import { TOOLS, TOOL_ART } from '../../src/game/player.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { RECIPES, campfireLevelFor, nextCampfireLevel, missingFor, CAMPFIRE_LEVELS } from '../../src/game/recipes.js';
import { SPIRITS, SPIRIT_IDS, friendshipLevel } from '../../src/game/spirits.js';
import { STORIES, STAGES, storyLine, storyClose, storyIntro } from '../../src/game/stories.js';
import { Inventory } from '../../src/game/inventory.js';
import { TILE_SIZE, TILE_DEF, T, isWalkable } from '../../src/art/tiles.js';
import { REGION_NAMES } from '../../src/world/worldgen.js';
import { HOUSE_STAGES } from '../../src/game/house.js';
import { INK } from '../../src/art/painted.js';

/** Namen, die initArt() anlegt – als Spiegel der Registerliste. */
const SPRITE_NAMES = (function () {
  const names = [
    'tree_stump', 'log_barrier',
    'rock_big', 'rock_small', 'rock_ore', 'rockslide',
    'rock_granite', 'rock_geode',
    'bush_berry', 'bush_plain', 'grass_tuft', 'reeds', 'mushroom', 'herb',
    'shell', 'driftwood', 'digspot',
    'moonflower', 'rainmushroom', 'fogcrystal',
    'flower_pink', 'flower_yellow', 'flower_violet', 'flower_white',
    'campfire', 'tent', 'stall', 'workbench', 'boat', 'mailbox', 'chest',
    'lantern', 'bench', 'fence', 'flowerbed', 'birdhouse', 'windchime',
    'rug', 'signpost', 'crate', 'chest', 'path_tile', 'bridge', 'moonlamp',
    // Deko zum Einrichten
    'table', 'chair', 'hammock', 'swing', 'firebowl', 'stringlights',
    'paperlamp', 'planter', 'trellis', 'birdbath', 'beehive', 'scarecrow',
    'weathervane', 'mat', 'pond',
    // Die Ausbaustufen des Zuhauses. Stufe 1 ist das Zelt und steht oben;
    // die drei Häuser standen bisher in keiner Prüfung, ein Tippfehler im
    // Namen wäre also erst im Spiel aufgefallen.
    'house_2', 'house_3', 'house_4',
  ];
  // Bäume liegen in drei Fassungen vor; die Objektdefinition nennt nur den
  // Rumpf, makeEntity hängt die Nummer an.
  const trees = ['tree_oak', 'tree_birch', 'tree_maple', 'tree_pine'];
  for (let i = 0; i < trees.length; i++) {
    for (let v = 0; v < 3; v++) names.push(trees[i] + '_' + v);
  }
  for (let f = 0; f < 4; f++) names.push('flame_' + f);
  for (let i = 0; i < MEMORY_KINDS.length; i++) {
    names.push('memory_' + MEMORY_KINDS[i]);
    names.push('icon_memory_' + MEMORY_KINDS[i]);
  }
  for (let i = 0; i < TOOL_ART.length; i++) {
    names.push('tool_' + TOOL_ART[i]);
    names.push('icon_' + TOOL_ART[i]);
  }
  for (let f = 0; f < 2; f++) {
    names.push('butterfly_' + f);
    names.push('bird_' + f);
  }
  for (const bug of BUGS) {
    for (let f = 0; f < 2; f++) names.push(bug.id + '_' + f);
    names.push('icon_' + bug.id);
  }
  const dirs = ['down', 'up', 'side'];
  for (let d = 0; d < dirs.length; d++) {
    for (let f = 0; f < 3; f++) names.push('player_' + dirs[d] + '_' + f);
  }
  for (let i = 0; i < SPIRIT_IDS.length; i++) {
    for (let f = 0; f < 2; f++) names.push('spirit_' + SPIRIT_IDS[i] + '_' + f);
  }
  names.push('fox_0', 'fox_1');
  // Symbole für alle Gegenstände
  for (let i = 0; i < ITEM_LIST.length; i++) names.push(ITEM_LIST[i].icon);
  // Symbole der Oberfläche
  const ui = ['ember', 'coin', 'heart', 'color', 'sparkle', 'star', 'check', 'lock',
    'ghost', 'arrow', 'day', 'clock', 'quest', 'bag', 'craft', 'map', 'gear', 'campfire',
    'boat', 'mailbox'];
  for (let i = 0; i < ui.length; i++) names.push('icon_' + ui[i]);
  const set = Object.create(null);
  for (let i = 0; i < names.length; i++) set[names[i]] = true;
  return set;
}());

test('jeder Gegenstand verweist auf ein angelegtes Symbol', () => {
  const missing = [];
  for (const item of ITEM_LIST) {
    if (!SPRITE_NAMES[item.icon]) missing.push(item.id + ' -> ' + item.icon);
  }
  assert.deepEqual(missing, []);
});

test('jede Deko verweist auf eine angelegte Weltgrafik', () => {
  const missing = [];
  for (const item of ITEM_LIST) {
    if (item.cat !== CAT.DECOR || !item.prop) continue;
    if (!SPRITE_NAMES[item.prop]) missing.push(item.id + ' -> ' + item.prop);
  }
  assert.deepEqual(missing, []);
});

test('jede Objektdefinition verweist auf eine angelegte Grafik', () => {
  const missing = [];
  for (const kind of Object.keys(ENTITY_DEFS)) {
    const def = ENTITY_DEFS[kind];
    if (!def.sprite) continue;
    // Wie spr(): ein Name ohne Fassungsnummer trifft die erste Fassung
    if (!SPRITE_NAMES[def.sprite] && !SPRITE_NAMES[def.sprite + '_0']) {
      missing.push(kind + ' -> ' + def.sprite);
    }
  }
  assert.deepEqual(missing, []);
});

test('jede Wohnstufe verweist auf eine angelegte Grafik', () => {
  // Der Sprite-Name des Zuhauses steht nicht in den Objektdefinitionen –
  // `syncHouse` setzt ihn zur Laufzeit. Ohne diese Prüfung fiele ein
  // Tippfehler erst auf, wenn jemand sein Haus fertig gebaut hat.
  for (const st of HOUSE_STAGES) {
    assert.ok(SPRITE_NAMES[st.sprite], st.name + ' -> ' + st.sprite);
  }
});

test('Erinnerungsstücke haben Welt- und Symbolgrafik', () => {
  for (const id of MEMORY_IDS) {
    const short = id.replace('memory_', '');
    assert.ok(SPRITE_NAMES['memory_' + short], 'Weltgrafik memory_' + short);
    assert.ok(SPRITE_NAMES['icon_' + id], 'Symbol icon_' + id);
  }
});

test('jeder Geist hat sinnvolle Werte und bleibt wortkarg', () => {
  for (const id of SPIRIT_IDS) {
    const s = SPIRITS[id];
    assert.ok(s.name && s.name.length > 0);
    assert.ok(s.region >= 0 && s.region < REGION_NAMES.length, id + ': Bereich ' + s.region);
    assert.ok(s.questTypes.length > 0);
    assert.ok(SPRITE_NAMES['spirit_' + id + '_0'], 'Grafik für ' + id);
    assert.ok(s.colorStart > TILE_SIZE, 'Farbradius passt zur Kachelgröße');
    for (const key of Object.keys(s.lines)) {
      for (const line of s.lines[key]) {
        assert.ok(line.length <= 40, id + '/' + key + ' zu lang: ' + line);
      }
    }
  }
});

test('Rezepte verweisen nur auf echte Gegenstände', () => {
  for (const rec of RECIPES) {
    for (const c of rec.cost) {
      assert.ok(getItem(c.id), rec.id + ' braucht unbekanntes ' + c.id);
      assert.ok(c.n > 0);
    }
    if (rec.out) assert.ok(getItem(rec.out.id), rec.id + ' liefert unbekanntes ' + rec.out.id);
    if (rec.kind === 'tool') {
      // Aus TOOLS abgeleitet statt abgeschrieben: eine zweite Liste veraltet.
      const bekannt = TOOLS.map(function (x) { return x.id; });
      assert.ok(bekannt.indexOf(rec.tool) >= 0, rec.id + ': unbekanntes Werkzeug ' + rec.tool);
      assert.ok(rec.tool !== 'hand', 'die Hand lässt sich nicht bauen');
      // Ein Bauplan muss weiterbringen: Werkzeuge, die man von Anfang an hat,
      // erst ab Stufe 2 – ein erst zu bauendes ab Stufe 1.
      const werkzeug = TOOLS.filter(function (x) { return x.id === rec.tool; })[0];
      const mindestens = werkzeug && werkzeug.optional ? 1 : 2;
      assert.ok(rec.level >= mindestens,
        rec.id + ': Stufe ' + rec.level + ' bringt nichts Neues');
    }
  }
});

test('Lagerfeuerstufen steigen monoton und passen zur Kachelgröße', () => {
  for (let i = 1; i < CAMPFIRE_LEVELS.length; i++) {
    assert.ok(CAMPFIRE_LEVELS[i].fuel > CAMPFIRE_LEVELS[i - 1].fuel);
    assert.ok(CAMPFIRE_LEVELS[i].radius > CAMPFIRE_LEVELS[i - 1].radius);
  }
  assert.ok(CAMPFIRE_LEVELS[0].radius > TILE_SIZE * 3, 'Startkreis deckt das Lager ab');
  assert.equal(campfireLevelFor(0).level, 1);
  assert.equal(campfireLevelFor(14).level, 2);
  assert.equal(campfireLevelFor(1000).level, 5);
  assert.equal(nextCampfireLevel(1000), null);
  assert.equal(nextCampfireLevel(0).level, 2);
});

test('fehlende Zutaten werden korrekt gemeldet', () => {
  const inv = new Inventory(30);
  const rec = RECIPES.find((r) => r.id === 'fence');
  let miss = missingFor(rec, inv, 0);
  assert.equal(miss.length, 2);

  inv.add('wood', 3);
  inv.add('fiber', 1);
  assert.equal(missingFor(rec, inv, 0).length, 0);

  const lantern = RECIPES.find((r) => r.id === 'lantern');
  inv.add('wood', 10);
  inv.add('stone', 10);
  inv.add('copper_ore', 10);
  assert.equal(missingFor(lantern, inv, 0).length, 1, 'Glut fehlt');
  assert.equal(missingFor(lantern, inv, 99).length, 0);
});

test('Fischtabellen: Nachtfische nur nachts', () => {
  const daySea = fishesOf('sea', false).map((f) => f.id);
  const nightSea = fishesOf('sea', true).map((f) => f.id);
  assert.ok(daySea.length > 0);
  assert.ok(nightSea.length > daySea.length);
  assert.ok(daySea.indexOf('fish_moonfish') < 0);
  assert.ok(nightSea.indexOf('fish_moonfish') >= 0);
  assert.ok(fishesOf('fresh', false).every((f) => f.water === 'fresh'));
});

test('Freundschaftsstufe wächst alle drei Aufgaben', () => {
  assert.equal(friendshipLevel(0), 0);
  assert.equal(friendshipLevel(2), 0);
  assert.equal(friendshipLevel(3), 1);
  assert.equal(friendshipLevel(9), 3);
  assert.equal(friendshipLevel(999), 10);
});

test('Kacheln: Farben aus der Malpalette, Ebenen aufsteigend', () => {
  const seen = Object.create(null);
  for (const key of Object.keys(T)) {
    const t = T[key];
    const def = TILE_DEF[t];
    assert.ok(def, 'Definition für ' + key);
    assert.ok(/^#[0-9a-f]{6}$/i.test(def.base), key + ' hat eine Farbe');
    seen[def.layer] = true;
  }
  assert.equal(isWalkable(T.WATER), false);
  assert.equal(isWalkable(T.GRASS), true);
  assert.ok(TILE_DEF[T.GRASS].layer > TILE_DEF[T.SAND].layer, 'Wiese liegt über Sand');
  assert.ok(TILE_DEF[T.SAND].layer > TILE_DEF[T.WATER].layer, 'Sand liegt über Wasser');
});

test('Malpalette ist vollständig', () => {
  const needed = ['line', 'paper', 'leaf', 'grass', 'sand', 'water', 'rock', 'trunk', 'wood', 'fur', 'skin'];
  for (const key of needed) {
    assert.ok(/^#[0-9a-f]{6}$/i.test(INK[key]), 'Farbe ' + key);
  }
});


test('Bedingte Gegenstände: Bedingung und Aussaat stehen am Gegenstand', () => {
  // Vorher standen Bedingung und Anzahl doppelt da – einmal am Gegenstand,
  // einmal im Spielkern. Ein vierter hätte stillschweigend nie ausgesät.
  assert.ok(CONDITIONAL.length >= 3, 'es gibt bedingte Gegenstände');
  const erlaubt = ['night', 'rain', 'fog'];
  for (const item of CONDITIONAL) {
    assert.ok(erlaubt.indexOf(item.onlyAt) >= 0,
      item.id + ': unbekannte Bedingung „' + item.onlyAt + '"');
    assert.ok(item.spawn > 0, item.id + ' braucht eine Aussaatzahl');
  }
  for (const item of ITEM_LIST) {
    if (item.onlyAt) {
      assert.ok(CONDITIONAL.indexOf(item) >= 0, item.id + ' fehlt in CONDITIONAL');
    }
  }
});


test('Falter: jede Art hat Flügelfarbe, Gewicht und eine Tageszeit', () => {
  assert.ok(BUGS.length >= 4, 'genug Arten, damit Fangen sich lohnt');
  for (const bug of BUGS) {
    assert.match(bug.wing, /^#[0-9a-f]{6}$/i, bug.id + ' braucht eine Flügelfarbe');
    assert.ok(bug.weight > 0, bug.id + ' braucht ein Gewicht');
    assert.ok(bug.flight > 0, bug.id + ' braucht eine Fluggeschwindigkeit');
    assert.ok(bug.value > 0, bug.id + ' muss verkäuflich sein');
  }
  assert.ok(bugsOf(false).length >= 2, 'am Tag fliegt mehr als eine Art');
  assert.ok(bugsOf(true).length >= 2, 'nachts fliegt mehr als eine Art');
  // Tag und Nacht überschneiden sich nicht – sonst wäre die Nacht kein Grund
  for (const bug of bugsOf(true)) {
    assert.ok(bugsOf(false).indexOf(bug) < 0, bug.id + ' darf nicht in beiden Listen stehen');
  }
});

test('Seltene Falter sind auch die wertvollen', () => {
  const sortiert = BUGS.slice().sort(function (a, b) { return a.weight - b.weight; });
  assert.ok(sortiert[0].value > sortiert[sortiert.length - 1].value,
    'der seltenste Falter muss mehr wert sein als der häufigste');
});

test('Jedes Werkzeug hat Name, Symbol, Grafik und Taste', () => {
  const tasten = {};
  for (const tool of TOOLS) {
    assert.ok(tool.name && tool.name.length, tool.id + ' braucht einen Namen');
    assert.ok(SPRITE_NAMES[tool.icon], tool.id + ': Symbol ' + tool.icon + ' fehlt');
    assert.ok(SPRITE_NAMES[tool.sprite], tool.id + ': Grafik ' + tool.sprite + ' fehlt');
    assert.ok(!tasten[tool.key], 'Taste ' + tool.key + ' doppelt vergeben');
    tasten[tool.key] = true;
  }
});


test('Jeder Geist hat eine Geschichte: Vorstellung, vier Sätze, Abschluss', () => {
  for (const id of Object.keys(STORIES)) {
    assert.ok(storyIntro(id), id + ' braucht eine Vorstellung');
    assert.ok(storyClose(id), id + ' braucht einen Abschluss');
    for (let stufe = 0; stufe < STAGES; stufe++) {
      const zeile = storyLine(id, stufe);
      assert.ok(zeile, id + ' Stufe ' + stufe + ' braucht einen Satz');
      // Kurz halten war die ganze Idee des Spiels. Eine Sprechblase, die
      // länger ist als das hier, liest niemand mehr im Vorbeigehen.
      assert.ok(zeile.length <= 90, id + ' Stufe ' + stufe + ': zu lang (' + zeile.length + ')');
    }
    assert.equal(storyLine(id, STAGES), null, id + ': keine Stufe über das Ende hinaus');
    assert.equal(storyLine(id, -1), null, id + ': keine negative Stufe');
  }
  assert.equal(storyIntro('gibtesnicht'), null);
  assert.equal(storyLine('gibtesnicht', 0), null);
});

test('Die Sätze sind alle verschieden', () => {
  const alle = [];
  for (const id of Object.keys(STORIES)) {
    alle.push(storyIntro(id), storyClose(id));
    for (let s = 0; s < STAGES; s++) alle.push(storyLine(id, s));
  }
  assert.equal(new Set(alle).size, alle.length, 'kein Satz darf doppelt vorkommen');
});
