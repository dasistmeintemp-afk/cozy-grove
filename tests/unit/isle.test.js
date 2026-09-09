/**
 * Die Stille Insel.
 *
 * Der Kern ist eine einzige Zusicherung: Die Insel ist eine INSEL. Sie darf
 * bei keinem Seed zu Fuß erreichbar sein, sonst ist der Meilenstein, der sie
 * öffnet, eine Zierde. Bei einem der ersten acht Seeds wuchs genau so eine
 * Landbrücke – gemessen 309 zu Fuß erreichbare Inselkacheln.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateTiles, MAP_W, MAP_H, tileIndex, regionAt, REGION, REGION_NAMES,
  ALL_REGIONS, CAMP_TILE, SOUND_X0, SOUND_X1, ISLE_X1, HIGHLAND_Y,
} from '../../src/world/worldgen.js';
import { isWalkable, T } from '../../src/art/tiles.js';
import { World } from '../../src/world/world.js';
import { ColorField } from '../../src/world/colorfield.js';
import { SPIRITS, SPIRIT_IDS, spiritsOfRegion } from '../../src/game/spirits.js';
import { STORIES, keepsakeOf, storyArt } from '../../src/game/stories.js';
import { getItem } from '../../src/game/items.js';
import { Player } from '../../src/game/player.js';
import { makeEntity, defOf, ENTITY_DEFS } from '../../src/world/entities.js';
import { makeRng } from '../../src/core/rng.js';
import { MILESTONES, milestoneForRegion } from '../../src/game/milestones.js';

/** Eine Handvoll Seeds für die teuren Prüfungen. */
const SEEDS = [4711, 20250907, 1, 999999, 424242, 7, 31337, 555, 12345, 8675309];

/**
 * Zweihundert Seeds für die eine Prüfung, an der alles hängt.
 *
 * Mit zehn Seeds war der Test zahnlos: Nimmt man den ausgehobenen Sund
 * wieder heraus, bleibt er grün, weil zehn Inseln zufällig frei liegen. Über
 * zweihundert Seeds gemessen wächst bei einem eine Landbrücke – und genau
 * den fängt diese Zahl. Kostet 0,7 Sekunden.
 */
const VIELE = 200;
function seedNr(k) {
  return (k * 2654435761) >>> 0;
}

/** Alles, was vom Lager aus zu Fuß erreichbar ist. */
function erreichbarVomLager(tiles) {
  const gesehen = new Uint8Array(MAP_W * MAP_H);
  const stapel = [[CAMP_TILE.x, CAMP_TILE.y]];
  gesehen[tileIndex(CAMP_TILE.x, CAMP_TILE.y)] = 1;
  while (stapel.length) {
    const p = stapel.pop();
    const nb = [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]];
    for (let i = 0; i < nb.length; i++) {
      const nx = nb[i][0];
      const ny = nb[i][1];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const idx = tileIndex(nx, ny);
      if (gesehen[idx] || !isWalkable(tiles[idx])) continue;
      gesehen[idx] = 1;
      stapel.push([nx, ny]);
    }
  }
  return gesehen;
}

test('Die Stille Insel ist bei keinem Seed zu Fuß erreichbar', () => {
  for (let k = 0; k < VIELE; k++) {
    const seed = seedNr(k);
    const tiles = generateTiles(seed);
    const erreichbar = erreichbarVomLager(tiles);
    let drueben = 0;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (regionAt(tx, ty) === REGION.ISLE && erreichbar[tileIndex(tx, ty)]) drueben++;
      }
    }
    assert.equal(drueben, 0, 'Seed ' + seed + ': ' + drueben + ' Inselkacheln zu Fuß erreichbar');
  }
});

test('Die Insel ist groß genug, dass sich die Fahrt lohnt', () => {
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    let n = 0;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (regionAt(tx, ty) === REGION.ISLE && isWalkable(tiles[tileIndex(tx, ty)])) n++;
      }
    }
    // Mit einem einzigen Kern hatte die Insel gemessen 182 bis 213 Kacheln –
    // gegen 1227 im Lager und 526 auf den Klippen. Man stand nach zwei
    // Minuten wieder am Boot. Mit drei Kernen sind es rund 900: mehr als die
    // Klippen, weniger als das Lager. Die Untergrenze ist der eigentliche
    // Punkt, die Obergrenze hält sie davon ab, die Karte zu schlucken.
    assert.ok(n > 600, 'Seed ' + seed + ': nur ' + n + ' Inselkacheln');
    assert.ok(n < 1200, 'Seed ' + seed + ': ' + n + ' Kacheln, das ist die halbe Karte');
  }
});

test('Die Insel ist lang, nicht rund', () => {
  // Nach Osten kann sie nicht wachsen – dort liegt der Sund. Der Reiz ist
  // die Strecke von Norden nach Süden; eine breitere Scheibe wäre nur mehr
  // vom Gleichen an einer Stelle.
  for (const seed of SEEDS.slice(0, 8)) {
    const tiles = generateTiles(seed);
    let y0 = 1e9;
    let y1 = -1;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (regionAt(tx, ty) !== REGION.ISLE) continue;
        if (!isWalkable(tiles[tileIndex(tx, ty)])) continue;
        if (ty < y0) y0 = ty;
        if (ty > y1) y1 = ty;
      }
    }
    assert.ok(y1 - y0 > 50, 'Seed ' + seed + ': nur ' + (y1 - y0 + 1) + ' Zeilen hoch');
  }
});

test('Im Hochland steht, was es nur dort gibt – und zwar hinter Stufe 3', () => {
  const w = new World(31337).populate();
  let granitHoch = 0;
  let granitSonst = 0;
  let geoden = 0;
  for (const e of w.entities) {
    if (e.kind !== 'rock_granite' && e.kind !== 'rock_geode') continue;
    const ty = Math.floor(e.y / 64);
    const hoch = regionAt(Math.floor(e.x / 64), ty) === REGION.ISLE && ty < HIGHLAND_Y;
    if (e.kind === 'rock_geode') geoden++;
    if (e.kind === 'rock_granite') {
      if (hoch) granitHoch++;
      else granitSonst++;
    }
  }
  assert.ok(granitHoch > 8, 'nur ' + granitHoch + ' Granitblöcke im Hochland');
  assert.equal(granitSonst, 0, 'Granit steht auch außerhalb des Hochlands');
  assert.ok(geoden > 0, 'keine einzige Geode');

  // Die Werkzeugstufe ist die Eintrittskarte. Ohne sie wäre das Hochland nur
  // eine größere Fläche mit demselben Kram.
  assert.equal(defOf('rock_granite').minLevel, 3);
  assert.equal(defOf('rock_geode').minLevel, 4);

  // Und was dort fällt, muss es sonst nirgends geben, sonst ist die Fahrt
  // ins Hochland eine Abkürzung statt eines eigenen Ortes.
  for (const id of ['granite', 'amber']) {
    assert.ok(getItem(id), id + ' gibt es nicht');
    let woanders = 0;
    for (const kind of Object.keys(ENTITY_DEFS)) {
      const def = ENTITY_DEFS[kind];
      if (kind === 'rock_granite' || kind === 'rock_geode' || !def.yield) continue;
      // Ausbeuten sind Funktionen; über viele Würfe sehen wir, was fallen kann
      for (let i = 0; i < 200; i++) {
        const rng = makeRng(1000 + i);
        const out = def.yield(4, rng) || [];
        for (const d of out) if (d.id === id) woanders++;
      }
    }
    assert.equal(woanders, 0, id + ' fällt auch anderswo');
  }
});

test('Im Norden liegt ein Hochland aus Fels', () => {
  // Ein Bereich, der aussieht wie jeder andere, ist kein neuer Bereich.
  for (const seed of SEEDS.slice(0, 8)) {
    const tiles = generateTiles(seed);
    let felsNord = 0;
    let landNord = 0;
    let felsSued = 0;
    let landSued = 0;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (regionAt(tx, ty) !== REGION.ISLE) continue;
        const t = tiles[tileIndex(tx, ty)];
        if (!isWalkable(t)) continue;
        if (ty < HIGHLAND_Y) {
          landNord++;
          if (t === T.ROCKFLOOR) felsNord++;
        } else {
          landSued++;
          if (t === T.ROCKFLOOR) felsSued++;
        }
      }
    }
    assert.ok(landNord > 150, 'Seed ' + seed + ': das Hochland ist nur ' + landNord + ' Kacheln');
    const anteil = felsNord / Math.max(1, landNord);
    assert.ok(anteil > 0.25,
      'Seed ' + seed + ': nur ' + Math.round(anteil * 100) + '% Fels im Hochland');
    // Und südlich davon eben NICHT – sonst wäre die ganze Insel ein Steinbruch
    assert.ok(felsSued / Math.max(1, landSued) < 0.08,
      'Seed ' + seed + ': auch im Süden liegt Fels');
  }
});

test('Der Sund ist überall Wasser, und die Grenze liegt darin', () => {
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    for (let ty = 0; ty < MAP_H; ty++) {
      // In der Mitte des Sunds, wo die Bereichsgrenze liegt, darf nie Land sein
      for (let tx = SOUND_X0 + 2; tx <= SOUND_X1 - 1; tx++) {
        assert.ok(!isWalkable(tiles[tileIndex(tx, ty)]),
          'Seed ' + seed + ': Land im Sund bei ' + tx + '/' + ty);
      }
    }
    assert.ok(ISLE_X1 > SOUND_X0 && ISLE_X1 < SOUND_X1 + 1,
      'die Grenze muss im Sund liegen, nicht am Ufer');
  }
});

test('Kein Festlandufer bekommt die Kennung der Insel – und umgekehrt', () => {
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const erreichbar = erreichbarVomLager(tiles);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const i = tileIndex(tx, ty);
        if (!isWalkable(tiles[i])) continue;
        // Was vom Lager aus erreichbar ist, ist Festland und darf nicht als
        // Insel gelten. Sonst zählte die Deckung Ufer mit, die man längst hat.
        if (erreichbar[i]) {
          assert.notEqual(regionAt(tx, ty), REGION.ISLE,
            'Seed ' + seed + ': Festland bei ' + tx + '/' + ty + ' gilt als Insel');
        }
      }
    }
  }
});

test('Die Welt setzt zwei Boote und einen Geist auf die Insel', () => {
  const world = new World(4711).populate();
  const boote = world.entities.filter(function (e) { return e.kind === 'boat'; });
  assert.equal(boote.length, 2);
  assert.ok(world.dock && world.isleDock, 'beide Anleger benannt');
  assert.equal(world.dock.toRegion, REGION.ISLE);
  assert.equal(world.isleDock.toRegion, REGION.CAMP);
  // Und sie liegen wirklich an verschiedenen Ufern
  assert.equal(regionAt(Math.floor(world.dock.x / 64), Math.floor(world.dock.y / 64)), REGION.CAMP);
  assert.equal(regionAt(Math.floor(world.isleDock.x / 64), Math.floor(world.isleDock.y / 64)), REGION.ISLE);

  const wanda = world.spiritEntity('wanda');
  assert.ok(wanda, 'Wanda steht auf der Insel');
  assert.equal(regionAt(Math.floor(wanda.x / 64), Math.floor(wanda.y / 64)), REGION.ISLE);

  // Auf der Insel steht auch etwas zu holen
  let objekte = 0;
  for (const e of world.entities) {
    if (regionAt(Math.floor(e.x / 64), Math.floor(e.y / 64)) === REGION.ISLE) objekte++;
  }
  assert.ok(objekte > 40, 'nur ' + objekte + ' Objekte auf der Insel');
});

test('Die Überfahrt landet drüben, nicht im Wasser', () => {
  const world = new World(4711).populate();
  for (const boot of [world.dock, world.isleDock]) {
    const ziel = world.boatTarget(boot);
    assert.ok(ziel, 'jedes Boot hat ein Ziel');
    const tx = Math.floor(ziel.x / 64);
    const ty = Math.floor(ziel.y / 64);
    assert.ok(isWalkable(world.tileAtTile(tx, ty)), 'Landeplatz muss begehbar sein');
    // Und zwar auf der ANDEREN Seite
    assert.notEqual(regionAt(tx, ty),
      regionAt(Math.floor(boot.x / 64), Math.floor(boot.y / 64)));
  }
});

test('Die Deckung zählt nur, was offen ist', () => {
  const world = new World(4711).populate();
  const feld = new ColorField();
  // Eine riesige Quelle über allem: Wäre die Insel mitgezählt, käme man mit
  // gesperrter Insel nie auf hundert Prozent.
  feld.sources.push({ x: 48 * 64, y: 48 * 64, r: 9000, target: 9000, key: 'test' });
  feld.markDirty();
  world.unlocked = [true, true, true, false];
  assert.ok(feld.coverage(world) > 0.99, 'ohne Insel ist alles Offene voll');

  // Insel auf – jetzt fehlt sie, und die Anzeige sagt das
  world.unlockRegion(REGION.ISLE);
  feld.markDirty();
  assert.ok(feld.coverage(world) > 0.99, 'die Riesenquelle deckt auch die Insel');

  // Umgekehrt: eine Quelle nur über dem Festland lässt die Insel grau
  const klein = new ColorField();
  klein.sources.push({ x: 48 * 64, y: 60 * 64, r: 1400, target: 1400, key: 'test' });
  klein.markDirty();
  world.unlocked = [true, true, true, false];
  const ohne = klein.coverage(world);
  world.unlockRegion(REGION.ISLE);
  klein.markDirty();
  const mit = klein.coverage(world);
  assert.ok(mit < ohne, 'die offene Insel senkt die Anzeige: ' + ohne + ' -> ' + mit);
});

test('Ein Meilenstein schließt die Insel auf', () => {
  const m = milestoneForRegion(REGION.ISLE);
  assert.ok(m, 'es gibt einen Meilenstein für die Insel');
  assert.equal(m.id, 'insel');
  assert.ok(m.at > 0.2 && m.at < 0.8, 'nicht am Anfang und nicht am Ende');
  // Und kein zweiter Meilenstein schließt denselben Bereich auf
  const alle = MILESTONES.filter(function (x) { return x.unlocksRegion === REGION.ISLE; });
  assert.equal(alle.length, 1);
});

test('Wanda ist ein vollwertiger Geist, kein Anhängsel', () => {
  const w = SPIRITS.wanda;
  assert.ok(w, 'Wanda gibt es');
  assert.equal(w.region, REGION.ISLE);
  assert.deepEqual(spiritsOfRegion(REGION.ISLE), ['wanda']);
  assert.ok(w.questTypes.length >= 5, 'sie stellt eigene Bitten');
  assert.ok(w.likes.length > 0);

  // Eigene Geschichte mit eigenem Andenken
  const s = STORIES.wanda;
  assert.ok(s, 'sie hat eine Kette');
  assert.equal(s.lines.length, 4);
  assert.ok(s.intro && s.close);
  const andenken = keepsakeOf('wanda');
  assert.ok(getItem(andenken), 'ihr Andenken ist ein echter Gegenstand: ' + andenken);
  // Und keiner teilt sich ein Andenken mit ihr
  for (const id of SPIRIT_IDS) {
    if (id === 'wanda') continue;
    assert.notEqual(keepsakeOf(id), andenken, id + ' hat dasselbe Andenken');
  }
  assert.ok(getItem(storyArt('wanda').replace('memory_', 'memory_')),
    'ihr Fundstück ist ein echter Gegenstand');
});

test('Jeder Bereich hat einen Namen, und ALL_REGIONS zählt alle', () => {
  assert.equal(REGION_NAMES.length, ALL_REGIONS.length);
  for (const r of ALL_REGIONS) {
    assert.ok(REGION_NAMES[r] && REGION_NAMES[r].length > 0, 'Name für Bereich ' + r);
  }
});

test('Am Anleger gewinnt das Boot, nicht das Gras unter den Füßen', () => {
  const world = new World(4711).populate();
  const boot = world.dock;
  const p = new Player(boot.x, boot.y + 40);
  p.dir = 'up';
  // Ein Grasbüschel direkt vor der Figur – mit der Hand ein passendes Ziel
  world.add(makeEntity('grass_tuft', boot.x, boot.y + 6));
  p.selectTool(0);
  assert.equal(p.tool.id, 'hand');

  const ziel = p.findTarget(world);
  assert.ok(ziel, 'irgendetwas muss in Reichweite sein');
  assert.equal(ziel.entity.kind, 'boat',
    'im Boot stehend muss das Boot gewinnen, nicht ' + ziel.entity.kind);
});


test('Die Überfahrt setzt einen auf festen Boden', () => {
  // `findWalkableNear` kennt die Kacheln, aber nicht, was darauf steht.
  // Über sechzig Seeds gemessen landete man einmal in einem Findling und
  // steckte fest – nie im Wasser, immer an einem Objekt. Ein Boot, das
  // einen gelegentlich einsperrt, ist kein Boot.
  for (let i = 0; i < 60; i++) {
    const w = new World(1000 + i * 7919).populate();
    for (const boot of [w.dock, w.isleDock]) {
      assert.ok(boot, 'Seed ' + i + ': ein Boot fehlt');
      const ziel = w.boatTarget(boot);
      assert.ok(ziel, 'Seed ' + i + ': kein Ziel');
      assert.ok(w.canStand(ziel.x, ziel.y, 12, 8),
        'Seed ' + (1000 + i * 7919) + ': man landet auf einem besetzten Platz');
    }
  }
});
