import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import {
  generateTiles, MAP_W, MAP_H, tileIndex, regionAt, REGION,
  CAMP_TILE, FORD_X0, FORD_X1, RIVER_Y0, RIVER_Y1,
  CHANNEL_X0, CHANNEL_X1, startPosition,
} from '../../src/world/worldgen.js';
import { T, isWalkable, isWater, TILE_SIZE } from '../../src/art/tiles.js';

const SEED = 12345;

function floodFrom(tiles, startTx, startTy) {
  const seen = new Uint8Array(MAP_W * MAP_H);
  const stack = [[startTx, startTy]];
  seen[tileIndex(startTx, startTy)] = 1;
  let count = 0;
  while (stack.length) {
    const [x, y] = stack.pop();
    count++;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const i = tileIndex(nx, ny);
      if (seen[i]) continue;
      if (!isWalkable(tiles[i])) continue;
      seen[i] = 1;
      stack.push([nx, ny]);
    }
  }
  return { seen, count };
}

test('Kachelkarte hat Land, Wasser und ist reproduzierbar', () => {
  const a = generateTiles(SEED);
  const b = generateTiles(SEED);
  assert.equal(a.length, MAP_W * MAP_H);
  assert.deepEqual(Array.from(a.slice(0, 500)), Array.from(b.slice(0, 500)));

  let land = 0;
  let water = 0;
  for (let i = 0; i < a.length; i++) {
    if (isWalkable(a[i])) land++;
    else if (isWater(a[i])) water++;
  }
  assert.ok(land > 1200, 'genug begehbare Fläche, war ' + land);
  assert.ok(water > 1500, 'genug Wasser, war ' + water);
});

test('Lager liegt auf begehbarem Boden', () => {
  const tiles = generateTiles(SEED);
  assert.ok(isWalkable(tiles[tileIndex(CAMP_TILE.x, CAMP_TILE.y)]));
  const start = startPosition(tiles);
  const tx = Math.floor(start.x / TILE_SIZE);
  const ty = Math.floor(start.y / TILE_SIZE);
  assert.ok(isWalkable(tiles[tileIndex(tx, ty)]), 'Startpunkt begehbar');
  assert.equal(regionAt(tx, ty), REGION.CAMP);
});

test('Fluss trennt Lager und Wald, die Furt verbindet sie', () => {
  const tiles = generateTiles(SEED);
  // Auf Höhe des Flusses ausserhalb der Furt ist Wasser
  let waterOutsideFord = 0;
  let checked = 0;
  for (let tx = 20; tx < 60; tx++) {
    if (tx >= FORD_X0 && tx <= FORD_X1) continue;
    const mid = Math.floor((RIVER_Y0 + RIVER_Y1) / 2);
    checked++;
    if (isWater(tiles[tileIndex(tx, mid)]) || !isWalkable(tiles[tileIndex(tx, mid)])) waterOutsideFord++;
  }
  assert.equal(waterOutsideFord, checked, 'Flussband ist durchgehend unpassierbar');

  // Die Furt selbst ist Land
  for (let tx = FORD_X0; tx <= FORD_X1; tx++) {
    for (let ty = RIVER_Y0; ty <= RIVER_Y1; ty++) {
      assert.ok(isWalkable(tiles[tileIndex(tx, ty)]), 'Furt bei ' + tx + '/' + ty);
    }
  }

  // Vom Lager aus ist der Wald erreichbar (über die Furt)
  const { seen } = floodFrom(tiles, CAMP_TILE.x, CAMP_TILE.y);
  let forestReached = 0;
  for (let ty = 5; ty < RIVER_Y0 - 2; ty++) {
    for (let tx = 25; tx < 55; tx++) {
      if (seen[tileIndex(tx, ty)]) forestReached++;
    }
  }
  assert.ok(forestReached > 150, 'Wald ist über die Furt erreichbar, Kacheln: ' + forestReached);
});

test('Klippen sind ohne Brücke nicht erreichbar, mit Brücke schon', () => {
  const world = new World(SEED);
  const { seen } = floodFrom(world.tiles, CAMP_TILE.x, CAMP_TILE.y);
  let cliffReached = 0;
  for (let ty = 30; ty < 70; ty++) {
    for (let tx = CHANNEL_X1 + 2; tx < MAP_W - 2; tx++) {
      if (seen[tileIndex(tx, ty)]) cliffReached++;
    }
  }
  assert.equal(cliffReached, 0, 'ohne Brücke keine Klippen');

  world.buildBridge();
  const after = floodFrom(world.tiles, CAMP_TILE.x, CAMP_TILE.y);
  let cliffAfter = 0;
  for (let ty = 30; ty < 70; ty++) {
    for (let tx = CHANNEL_X1 + 2; tx < MAP_W - 2; tx++) {
      if (after.seen[tileIndex(tx, ty)]) cliffAfter++;
    }
  }
  assert.ok(cliffAfter > 100, 'mit Brücke erreichbar, Kacheln: ' + cliffAfter);
  assert.ok(world.isUnlocked(REGION.CLIFFS));
});

test('Insel wird bevölkert: Bäume, Geister, Lager', () => {
  const world = new World(SEED).populate();
  const kinds = Object.create(null);
  for (const e of world.entities) kinds[e.kind] = (kinds[e.kind] || 0) + 1;

  assert.ok(world.entities.length > 300, 'genug Objekte, waren ' + world.entities.length);
  assert.ok((kinds.tree_oak || 0) + (kinds.tree_pine || 0) + (kinds.tree_birch || 0) > 80, 'Bäume');
  assert.equal(kinds.spirit, 6, 'sechs Geister');
  assert.equal(kinds.campfire, 1);
  assert.equal(kinds.tent, 1);
  assert.equal(kinds.stall, 1);
  assert.equal(kinds.workbench, 1);
  assert.equal(kinds.log_barrier, 1);

  for (const id of ['flamey', 'mira', 'kiesel', 'bruno', 'tobi', 'nelly']) {
    assert.ok(world.spiritEntity(id), 'Geist ' + id + ' vorhanden');
  }
});

test('Objekte stehen nur auf begehbarem Boden', () => {
  const world = new World(SEED).populate();
  let bad = 0;
  for (const e of world.entities) {
    if (e.kind === 'bridge_spot') continue;
    if (!isWalkable(world.tileAt(e.x, e.y))) bad++;
  }
  assert.equal(bad, 0, bad + ' Objekte stehen im Wasser');
});

test('Kollision: Wasser blockiert, freie Wiese nicht', () => {
  const world = new World(SEED).populate();
  const start = startPosition(world.tiles);
  assert.ok(world.canStand(start.x, start.y));
  // Weit draußen im Meer
  assert.equal(world.canStand(20, 20), false);
});

test('Tageswechsel bringt Grabstellen zurück', () => {
  const world = new World(SEED).populate();
  world.newDay(1);
  const digs = world.entities.filter((e) => e.kind === 'digspot').length;
  assert.ok(digs >= 5, 'Grabstellen am Tag 1: ' + digs);

  // Grabstellen entfernen und nächsten Tag prüfen
  for (const e of world.entities.filter((e2) => e2.kind === 'digspot')) world.remove(e);
  assert.equal(world.entities.filter((e) => e.kind === 'digspot').length, 0);
  world.newDay(2);
  assert.ok(world.entities.filter((e) => e.kind === 'digspot').length >= 5);
});

test('Abgebaute Bäume kehren nach der Wartezeit zurück', () => {
  const world = new World(SEED).populate();
  const tree = world.entities.find((e) => e.kind === 'tree_oak');
  tree.origin = 'tree_oak';
  tree.kind = 'tree_stump';
  tree.sprite = 'tree_stump';
  tree.respawnDay = 4;

  world.newDay(3);
  assert.equal(tree.kind, 'tree_stump', 'noch Stumpf');
  world.newDay(4);
  assert.equal(tree.kind, 'tree_oak', 'wieder Baum');
  assert.equal(tree.origin, null);
});

test('Regionszuordnung passt zur Karte', () => {
  assert.equal(regionAt(CAMP_TILE.x, CAMP_TILE.y), REGION.CAMP);
  assert.equal(regionAt(40, 10), REGION.FOREST);
  assert.equal(regionAt(CHANNEL_X1 + 5, 50), REGION.CLIFFS);
});

test('Wasserart: Fluss ist Süßwasser, offenes Meer nicht', () => {
  const world = new World(SEED);
  const riverY = ((RIVER_Y0 + RIVER_Y1) / 2 + 0.5) * TILE_SIZE;
  assert.equal(world.waterKind(20 * TILE_SIZE, riverY), 'fresh');
  assert.equal(world.waterKind(30 * TILE_SIZE, 88 * TILE_SIZE), 'sea');
});

test('Kacheltypen sind vollständig definiert', () => {
  for (const key of Object.keys(T)) {
    const v = T[key];
    assert.ok(typeof v === 'number');
  }
});
