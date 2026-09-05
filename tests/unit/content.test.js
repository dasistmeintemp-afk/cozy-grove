/**
 * Inhaltliche Konsistenz: jedes Symbol, jede Grafik und jedes Rezept
 * muss auf etwas verweisen, das es wirklich gibt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { ITEM_LIST, getItem, CAT, MEMORY_IDS, fishesOf } from '../../src/game/items.js';
import { ICONS } from '../../src/art/icons.js';
import { PROPS } from '../../src/art/props.js';
import { SPIRIT_LOOKS } from '../../src/art/critters.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { RECIPES, campfireLevelFor, nextCampfireLevel, missingFor, CAMPFIRE_LEVELS } from '../../src/game/recipes.js';
import { SPIRITS, SPIRIT_IDS, friendshipLevel } from '../../src/game/spirits.js';
import { Inventory } from '../../src/game/inventory.js';

test('jeder Gegenstand hat ein vorhandenes Symbol', () => {
  const missing = [];
  for (const item of ITEM_LIST) {
    const key = item.icon.replace(/^icon_/, '');
    if (!ICONS[key]) missing.push(item.id);
  }
  assert.deepEqual(missing, [], 'fehlende Symbole: ' + missing.join(', '));
});

test('jede Deko verweist auf eine vorhandene Weltgrafik', () => {
  const missing = [];
  for (const item of ITEM_LIST) {
    if (item.cat !== CAT.DECOR || !item.prop) continue;
    if (!PROPS[item.prop]) missing.push(item.id + ' -> ' + item.prop);
  }
  assert.deepEqual(missing, []);
});

test('jede Objektdefinition verweist auf eine vorhandene Grafik', () => {
  const missing = [];
  for (const kind of Object.keys(ENTITY_DEFS)) {
    const def = ENTITY_DEFS[kind];
    if (!def.sprite) continue;
    if (def.sprite.indexOf('fox_') === 0) continue; // wird in critters gebaut
    if (!PROPS[def.sprite]) missing.push(kind + ' -> ' + def.sprite);
  }
  assert.deepEqual(missing, []);
});

test('Erinnerungsstuecke haben Welt- und Symbolgrafik', () => {
  for (const id of MEMORY_IDS) {
    const short = id.replace('memory_', '');
    assert.ok(PROPS['memory_' + short], 'Weltgrafik memory_' + short);
    assert.ok(ICONS[id], 'Symbol ' + id);
  }
});

test('jeder Geist hat ein Aussehen und sinnvolle Werte', () => {
  for (const id of SPIRIT_IDS) {
    const s = SPIRITS[id];
    assert.ok(s.name && s.name.length > 0);
    assert.ok(s.region >= 0 && s.region <= 2);
    assert.ok(s.questTypes.length > 0);
    if (id !== 'flamey') assert.ok(SPIRIT_LOOKS[id], 'Aussehen fuer ' + id);
    // Wortkarg: keine Zeile laenger als 40 Zeichen
    for (const key of Object.keys(s.lines)) {
      for (const line of s.lines[key]) {
        assert.ok(line.length <= 40, id + '/' + key + ' zu lang: ' + line);
      }
    }
  }
});

test('Rezepte verweisen nur auf echte Gegenstaende', () => {
  for (const rec of RECIPES) {
    for (const c of rec.cost) {
      assert.ok(getItem(c.id), rec.id + ' braucht unbekanntes ' + c.id);
      assert.ok(c.n > 0);
    }
    if (rec.out) assert.ok(getItem(rec.out.id), rec.id + ' liefert unbekanntes ' + rec.out.id);
    if (rec.kind === 'tool') {
      assert.ok(['axe', 'pickaxe', 'shovel', 'rod'].indexOf(rec.tool) >= 0);
      assert.ok(rec.level >= 2);
    }
  }
});

test('Lagerfeuerstufen steigen monoton', () => {
  for (let i = 1; i < CAMPFIRE_LEVELS.length; i++) {
    assert.ok(CAMPFIRE_LEVELS[i].fuel > CAMPFIRE_LEVELS[i - 1].fuel);
    assert.ok(CAMPFIRE_LEVELS[i].radius > CAMPFIRE_LEVELS[i - 1].radius);
  }
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
  miss = missingFor(rec, inv, 0);
  assert.equal(miss.length, 0);

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

test('Freundschaftsstufe waechst alle drei Aufgaben', () => {
  assert.equal(friendshipLevel(0), 0);
  assert.equal(friendshipLevel(2), 0);
  assert.equal(friendshipLevel(3), 1);
  assert.equal(friendshipLevel(9), 3);
  assert.equal(friendshipLevel(999), 10);
});
