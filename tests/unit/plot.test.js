/**
 * Das Grundstück.
 *
 * Der Anlass war eine Messung: Vom Lagerbereich sind über achtzig Prozent
 * der Kacheln frei, aber das größte zusammenhängende freie Quadrat misst
 * nur sechs bis sieben Kacheln – und rund 190 Kacheln sind von Dingen
 * belegt, die nachwachsen. Wer sich Platz schafft, findet ihn drei Tage
 * später zugewachsen.
 *
 * Die eine Regel dagegen: Auf dem Grundstück wächst nichts nach. Die Tests
 * hier halten fest, dass sie gilt – und dass am Ende wirklich Bauplatz
 * herauskommt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLOT_STAGES, MAX_PLOT_STAGE, plotStage, nextPlotStage, plotBounds, inPlot, inPlotAt, plotRect,
  ISLE_PLOT_STAGES, MAX_ISLE_PLOT_STAGE, ISLE_PLOT_TILE, islePlotStage, nextIslePlotStage,
  islePlotBounds, islePlotRect, inIslePlot, inIslePlotAt, inAnyPlot, usableIsleTiles,
} from '../../src/game/plot.js';
import { World } from '../../src/world/world.js';
import {
  CAMP_TILE, MAP_W, MAP_H, tileIndex, regionAt, REGION, TILE_SIZE, HIGHLAND_Y,
} from '../../src/world/worldgen.js';
import { isWalkable } from '../../src/art/tiles.js';
import { defOf } from '../../src/world/entities.js';

test('Die Stufen wachsen und kosten mehr', () => {
  let w = 0;
  let h = 0;
  let glut = -1;
  for (const st of PLOT_STAGES) {
    assert.ok(st.halfW > w && st.halfH > h, st.id + ': wird nicht größer');
    assert.ok(st.ember > glut, st.id + ': wird nicht teurer');
    assert.ok(st.name && st.note, st.id + ' braucht Name und Zeile');
    w = st.halfW; h = st.halfH; glut = st.ember;
  }
  assert.equal(PLOT_STAGES[0].ember, 0, 'die erste Stufe hat man schon');
  assert.equal(MAX_PLOT_STAGE, PLOT_STAGES.length);
  assert.equal(nextPlotStage(MAX_PLOT_STAGE), null);
  assert.equal(plotStage(99), null);
});

test('Das Grundstück liegt um das Zelt und bleibt auf der Karte', () => {
  for (const st of PLOT_STAGES) {
    const b = plotBounds(st.id);
    assert.ok(b.x0 >= 1 && b.y0 >= 1, st.id + ': ragt oben/links hinaus');
    assert.ok(b.x1 <= MAP_W - 2 && b.y1 <= MAP_H - 2, st.id + ': ragt unten/rechts hinaus');
    assert.ok(inPlot(CAMP_TILE.x, CAMP_TILE.y, st.id), 'das Lager liegt immer drin');
    // Und eine Kachel jenseits der Grenze liegt draußen
    assert.equal(inPlot(b.x1 + 1, CAMP_TILE.y, st.id), false);
    assert.equal(inPlot(CAMP_TILE.x, b.y0 - 1, st.id), false);
  }
  // In Weltpixeln dasselbe
  const r = plotRect(1);
  assert.ok(inPlotAt(r.x + 10, r.y + 10, 1));
  assert.equal(inPlotAt(r.x - 40, r.y - 40, 1), false);
});

test('Ein größeres Grundstück enthält das kleinere ganz', () => {
  for (let i = 1; i < PLOT_STAGES.length; i++) {
    const klein = plotBounds(PLOT_STAGES[i - 1].id);
    const gross = plotBounds(PLOT_STAGES[i].id);
    assert.ok(gross.x0 <= klein.x0 && gross.y0 <= klein.y0 &&
      gross.x1 >= klein.x1 && gross.y1 >= klein.y1,
    'Stufe ' + PLOT_STAGES[i].id + ' verliert Fläche');
  }
});

test('Auf dem Grundstück wächst nichts nach – daneben schon', () => {
  const world = new World(4711).populate();
  world.plotStage = 2;

  // Je einen Baum drinnen und draußen fällen
  const baeume = world.entities.filter(function (e) {
    return e.kind && e.kind.indexOf('tree_') === 0 && !e.gone;
  });
  const drin = baeume.filter(function (e) { return inPlotAt(e.x, e.y, 2); })[0];
  const draussen = baeume.filter(function (e) { return !inPlotAt(e.x, e.y, 2); })[0];
  assert.ok(drin, 'auf dem Grundstück steht ein Baum');
  assert.ok(draussen, 'daneben steht auch einer');

  for (const e of [drin, draussen]) {
    e.gone = true;
    e.origin = e.kind;
    e.kind = 'tree_stump';
    e.respawnDay = 3;
  }
  const idDrin = drin.id;
  world.newDay(5);

  assert.equal(world.byId[idDrin], undefined,
    'der Baum auf dem Grundstück ist endgültig weg');
  assert.equal(draussen.gone, false, 'der daneben kommt zurück');
  assert.ok(draussen.kind.indexOf('tree_') === 0, 'und zwar als Baum, nicht als Stumpf');
});

test('Grabstellen und Blüten lassen das Grundstück aus', () => {
  const world = new World(4711).populate();
  world.plotStage = 3;
  world.newDay(4, { digs: 2, bloom: 12 });

  for (const e of world.entities) {
    if (e.gone) continue;
    if (e.kind !== 'digspot' && !e.fromEvent) continue;
    assert.equal(inPlotAt(e.x, e.y, 3), false,
      e.kind + ' liegt auf dem Grundstück bei ' +
      Math.floor(e.x / TILE_SIZE) + '/' + Math.floor(e.y / TILE_SIZE));
  }
});

/** Größtes zusammenhängendes freies Quadrat in einem Rechteck. */
function groesstesQuadrat(world, b, belegt) {
  const dp = new Int16Array(MAP_W * MAP_H);
  let best = 0;
  for (let ty = b.y0 + 1; ty <= b.y1; ty++) {
    for (let tx = b.x0 + 1; tx <= b.x1; tx++) {
      const i = tileIndex(tx, ty);
      if (!isWalkable(world.tileAtTile(tx, ty)) || (belegt && belegt[i])) { dp[i] = 0; continue; }
      dp[i] = 1 + Math.min(dp[tileIndex(tx - 1, ty)], dp[tileIndex(tx, ty - 1)],
        dp[tileIndex(tx - 1, ty - 1)]);
      if (dp[i] > best) best = dp[i];
    }
  }
  return best;
}

test('Gerodet gibt das Grundstück wirklich Bauplatz her', () => {
  for (const seed of [4711, 20250907, 999999]) {
    const world = new World(seed).populate();

    // Vorher: das größte freie Quadrat im GANZEN Lagerbereich
    const belegt = new Uint8Array(MAP_W * MAP_H);
    for (const e of world.entities) {
      const d = defOf(e.kind);
      if (!d || e.gone) continue;
      if (!d.solid && d.category !== 'forage' && d.category !== 'station') continue;
      const tx = Math.floor(e.x / TILE_SIZE);
      const ty = Math.floor(e.y / TILE_SIZE);
      if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) belegt[tileIndex(tx, ty)] = 1;
    }
    const lager = { x0: 1, y0: 1, x1: MAP_W - 2, y1: MAP_H - 2 };
    const vorher = groesstesQuadrat(world, lager, belegt);

    // Nachher: das volle Grundstück, freigeräumt
    const nachher = groesstesQuadrat(world, plotBounds(MAX_PLOT_STAGE), null);

    // Gemessen: vorher sechs bis sieben Kacheln, nachher zweiundzwanzig.
    assert.ok(vorher <= 9, 'Seed ' + seed + ': vorher schon ' + vorher + ' Kacheln frei?');
    assert.ok(nachher >= 18,
      'Seed ' + seed + ': gerodet nur ' + nachher + '×' + nachher + ' – zu wenig zum Bauen');
    assert.ok(nachher >= vorher * 2.5,
      'Seed ' + seed + ': ' + vorher + ' -> ' + nachher + ', das lohnt den Ausbau nicht');
  }
});

test('Die erste Stufe ist an einem Nachmittag freigeräumt', () => {
  for (const seed of [4711, 20250907, 999999]) {
    const world = new World(seed).populate();
    let zuRoden = 0;
    for (const e of world.entities) {
      const d = defOf(e.kind);
      if (!d || e.gone) continue;
      if (d.category === 'station' || d.category === 'fox' || d.category === 'spirit') continue;
      if (!d.solid && d.category !== 'forage') continue;
      if (inPlotAt(e.x, e.y, 1)) zuRoden++;
    }
    // Genug, dass es Arbeit ist – wenig genug, dass man anfängt.
    assert.ok(zuRoden >= 3, 'Seed ' + seed + ': nur ' + zuRoden + ' zu roden, das ist kein Anfang');
    assert.ok(zuRoden <= 40, 'Seed ' + seed + ': ' + zuRoden + ' zu roden ist eine Woche Arbeit');
  }
});

test('Auf eigenem Grund darf man näher an die eigenen Bauten', () => {
  const world = new World(4711).populate();
  const zelt = world.tent;
  const bruecke = world.bridgeSpot;

  // Die Regel aus `_canPlaceAt` nachgebaut, für beide Seiten der Grenze
  function zuNah(x, y, station, stufe) {
    const eigen = inPlotAt(x, y, stufe);
    const r = eigen ? 74 : 110;
    const dx = station.x - x;
    const dy = station.y - y;
    return dx * dx + dy * dy < r * r;
  }

  // 108 px vom Zelt: draußen wäre das zu nah, auf eigenem Grund nicht.
  const nah = { x: zelt.x + 90, y: zelt.y + 60 };
  assert.ok(inPlotAt(nah.x, nah.y, 1), 'der Punkt liegt auf dem Grundstück');
  assert.equal(zuNah(nah.x, nah.y, zelt, 1), false, 'auf eigenem Grund erlaubt');

  // Derselbe Abstand zu einer Station AUSSERHALB des Grundstücks bleibt gesperrt
  assert.ok(bruecke, 'der Brückenplatz steht');
  assert.equal(inPlotAt(bruecke.x, bruecke.y, 4), false,
    'der Brückenplatz liegt außerhalb, auch beim größten Grundstück');
  // Nach OBEN versetzt, sonst liegt der Prüfpunkt selbst wieder auf dem
  // Grundstück – dessen Rand verläuft dicht unter dem Brückenplatz.
  const dortNah = { x: bruecke.x + 90, y: bruecke.y - 60 };
  assert.equal(inPlotAt(dortNah.x, dortNah.y, 4), false, 'der Prüfpunkt liegt draußen');
  assert.equal(zuNah(dortNah.x, dortNah.y, bruecke, 4), true,
    'außerhalb gilt weiter der große Abstand');
});

/* ------------------------------------------------------- Die Bucht drüben */

test('Die Bucht wächst und kostet mehr', () => {
  let w = 0;
  let h = 0;
  let preis = 0;
  for (const st of ISLE_PLOT_STAGES) {
    assert.ok(st.halfW >= w && st.halfH > h, st.id + ': wird nicht größer');
    assert.ok(st.coins > preis, st.id + ': wird nicht teurer');
    assert.ok(st.name && st.note, st.id + ' braucht Name und Zeile');
    w = st.halfW; h = st.halfH; preis = st.coins;
  }
  assert.ok(ISLE_PLOT_STAGES[0].coins > 0, 'die erste Stufe muss man kaufen');
  assert.equal(MAX_ISLE_PLOT_STAGE, ISLE_PLOT_STAGES.length);
  assert.equal(nextIslePlotStage(MAX_ISLE_PLOT_STAGE), null);
  assert.equal(islePlotStage(99), null);
});

test('Stufe 0 heißt: es gibt sie nicht', () => {
  // Die halbe Sorge bei einem zweiten Grundstück ist, dass es wirkt, bevor
  // man es gekauft hat – und dann wüchse auf der halben Insel nichts nach.
  assert.equal(islePlotBounds(0), null);
  assert.equal(islePlotRect(0), null);
  assert.equal(inIslePlot(ISLE_PLOT_TILE.x, ISLE_PLOT_TILE.y, 0), false);
  assert.equal(inIslePlotAt(ISLE_PLOT_TILE.x * TILE_SIZE, ISLE_PLOT_TILE.y * TILE_SIZE, 0), false);
  assert.equal(inIslePlot(ISLE_PLOT_TILE.x, ISLE_PLOT_TILE.y, 1), true);
});

test('Die Bucht liegt auf der Insel, nicht daneben', () => {
  for (const stufe of [1, 2, 3, 4]) {
    const b = islePlotBounds(stufe);
    for (let ty = b.y0; ty <= b.y1; ty++) {
      for (let tx = b.x0; tx <= b.x1; tx++) {
        assert.equal(regionAt(tx, ty), REGION.ISLE,
          'Stufe ' + stufe + ': Kachel ' + tx + '|' + ty + ' liegt nicht auf der Insel');
      }
    }
    // Und nicht im Hochland: dort ist Fels, kein Garten
    assert.ok(b.y0 > HIGHLAND_Y, 'Stufe ' + stufe + ' reicht ins Hochland');
  }
});

test('Die Bucht gibt wirklich Bauplatz her', () => {
  // Die Insel ist schmal; ein Rechteck kann dort schnell halb im Wasser
  // liegen. Gemessen über mehrere Seeds muss genug Land übrig bleiben,
  // sonst kauft man eine Bucht und bekommt eine Bucht.
  for (const seed of [1, 7, 31337, 90210, 4242]) {
    const world = new World(seed);
    const klein = usableIsleTiles(world, 1);
    const gross = usableIsleTiles(world, MAX_ISLE_PLOT_STAGE);
    const b = islePlotBounds(MAX_ISLE_PLOT_STAGE);
    const flaeche = (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
    assert.ok(klein > 100, 'Seed ' + seed + ': erste Stufe nur ' + klein + ' Kacheln Land');
    assert.ok(gross > 380, 'Seed ' + seed + ': volle Bucht nur ' + gross + ' Kacheln Land');
    assert.ok(gross / flaeche > 0.6,
      'Seed ' + seed + ': nur ' + Math.round(gross / flaeche * 100) + '% davon ist Land');
    assert.ok(gross > klein, 'Seed ' + seed + ': Ausbauen bringt nichts');
  }
});

test('Beide Grundstücke folgen derselben Regel', () => {
  // `inAnyPlot` ist die Stelle, an der Welt und Aufstellen entscheiden. Sie
  // muss beide kennen – sonst wüchse in der Bucht alles nach.
  const imLager = { tx: CAMP_TILE.x, ty: CAMP_TILE.y };
  const inBucht = { tx: ISLE_PLOT_TILE.x, ty: ISLE_PLOT_TILE.y };
  assert.equal(inAnyPlot(imLager.tx, imLager.ty, 1, 0), true);
  assert.equal(inAnyPlot(inBucht.tx, inBucht.ty, 1, 0), false, 'ungekauft zählt nicht');
  assert.equal(inAnyPlot(inBucht.tx, inBucht.ty, 1, 1), true);
  assert.equal(inAnyPlot(imLager.tx, imLager.ty, 1, 4), true, 'das Lager bleibt dabei');
  // Und eine Stelle, die zu keinem gehört
  assert.equal(inAnyPlot(70, 20, 4, 4), false);
});

test('Auf der Insel wächst in der Bucht nichts nach', () => {
  const world = new World(31337);
  world.populate();
  world.islePlotStage = MAX_ISLE_PLOT_STAGE;
  const b = islePlotBounds(MAX_ISLE_PLOT_STAGE);

  // Alles in der Bucht fällen und drei Tage weiterspielen
  const drin = world.entities.filter(function (e) {
    return inIslePlotAt(e.x, e.y, MAX_ISLE_PLOT_STAGE) && !e.gone;
  });
  assert.ok(drin.length > 0, 'in der Bucht steht überhaupt etwas');
  const ids = drin.map(function (e) { return e.id; });
  for (const e of drin) {
    e.gone = true;
    e.respawnDay = 1;
  }
  world.newDay(4, {});
  let zurueck = 0;
  for (const id of ids) if (world.byId[id] && !world.byId[id].gone) zurueck++;
  assert.equal(zurueck, 0, zurueck + ' Dinge sind in der Bucht nachgewachsen');

  // Und außerhalb wächst weiterhin etwas nach – sonst prüfte der Test nichts
  let draussen = 0;
  for (const e of world.entities) {
    if (e.gone) continue;
    if (regionAt(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE)) !== REGION.ISLE) continue;
    if (inIslePlotAt(e.x, e.y, MAX_ISLE_PLOT_STAGE)) continue;
    draussen++;
  }
  assert.ok(draussen > 20, 'außerhalb der Bucht steht nichts mehr, der Test misst nichts');
  assert.ok(b.y1 > b.y0);
});
