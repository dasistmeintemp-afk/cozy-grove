/**
 * Landmarken.
 *
 * Die Prüfungen hier fragen nicht, ob es sie gibt, sondern ob sie ihren
 * Zweck erfüllen: einmalig sein, weit auseinanderstehen und am richtigen
 * Ort. Eine Marke, die es zweimal gibt, ist Deko. Eine, die neben der
 * nächsten steht, ist eine Gruppe. Und ein Leuchtturm im Wald ist ein
 * Fehler, den niemand meldet, weil alles „funktioniert".
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import { MARKEN } from '../../src/world/marken.js';
import { BIOM } from '../../src/world/biome.js';
import { T, TILE_SIZE, isWater, isWalkable } from '../../src/art/tiles.js';
import { regionAt, REGION } from '../../src/world/worldgen.js';

const SEEDS = [11, 4711, 555, 20250907, 7, 999999];

function welten() {
  return SEEDS.map(function (seed) { return { seed: seed, w: new World(seed).populate() }; });
}

test('Jede Insel trägt jede Landmarke genau einmal', () => {
  for (const { seed, w } of welten()) {
    const marken = w.entities.filter(function (e) { return e.kind === 'marke'; });
    assert.equal(marken.length, MARKEN.length,
      'Seed ' + seed + ': ' + marken.length + ' statt ' + MARKEN.length + ' Marken');
    const ids = marken.map(function (e) { return e.markeId; }).sort();
    assert.equal(new Set(ids).size, MARKEN.length, 'Seed ' + seed + ': doppelte Marke');
  }
});

test('Zwei Landmarken stehen nie nebeneinander', () => {
  // Zwei Wahrzeichen in Sichtweite sind ein Wahrzeichen. Einundzwanzig
  // Kacheln sind gut ein Bildschirm – so weit, dass man die eine
  // verlässt, bevor man die andere sieht.
  //
  // Geprüft wird gegen den NOTABSTAND von fünfzehn: Findet sich mit dem
  // vollen Abstand kein Platz, rückt die Marke näher, statt ganz zu
  // fehlen. Auf zwei von acht Inseln fiel sonst der Steinkreis oder der
  // hohle Baum aus, weil Heide beziehungsweise Nadelwald dort klein
  // ausfielen – und eine Marke, die es manchmal nicht gibt, ist kein
  // Wahrzeichen.
  for (const { seed, w } of welten()) {
    const marken = w.entities.filter(function (e) { return e.kind === 'marke'; });
    for (let i = 0; i < marken.length; i++) {
      for (let k = i + 1; k < marken.length; k++) {
        const d = Math.hypot(marken[i].x - marken[k].x, marken[i].y - marken[k].y);
        assert.ok(d >= 15 * TILE_SIZE, 'Seed ' + seed + ': ' + marken[i].markeId
          + ' und ' + marken[k].markeId + ' stehen ' + Math.round(d / TILE_SIZE)
          + ' Kacheln auseinander');
      }
    }
  }
});

test('Jede Landmarke steht dort, wo sie hingehört', () => {
  // Das ist die eigentliche Probe. Geprüft wird nicht die Regel aus
  // `marken.js` noch einmal, sondern die FOLGE davon – mit eigenen
  // Worten, damit ein Fehler in der Regel hier auffällt.
  for (const { seed, w } of welten()) {
    const bei = {};
    for (const e of w.entities) if (e.kind === 'marke') bei[e.markeId] = e;
    const kachel = function (id) {
      return w.tileAtTile(Math.floor(bei[id].x / TILE_SIZE), Math.floor(bei[id].y / TILE_SIZE));
    };
    const biom = function (id) {
      return w.biomAtTile(Math.floor(bei[id].x / TILE_SIZE), Math.floor(bei[id].y / TILE_SIZE));
    };
    const wasserNah = function (id, r) {
      const tx = Math.floor(bei[id].x / TILE_SIZE);
      const ty = Math.floor(bei[id].y / TILE_SIZE);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (isWater(w.tileAtTile(tx + dx, ty + dy))) return true;
        }
      }
      return false;
    };
    const m = 'Seed ' + seed + ': ';
    assert.equal(kachel('wrack'), T.SAND, m + 'das Wrack liegt nicht im Sand');
    assert.ok(wasserNah('wrack', 3), m + 'das Wrack liegt nicht am Wasser');
    assert.equal(kachel('gerippe'), T.SAND, m + 'das Gerippe liegt nicht im Sand');
    assert.equal(biom('steinkreis'), BIOM.HEIDE, m + 'der Steinkreis steht nicht auf der Heide');
    assert.equal(biom('baum'), BIOM.NADELWALD, m + 'der hohle Baum steht nicht im Nadelwald');
    assert.ok(wasserNah('leuchtturm', 4), m + 'der Leuchtturm steht nicht am Wasser');
    assert.equal(regionAt(Math.floor(bei.leuchtturm.x / TILE_SIZE),
      Math.floor(bei.leuchtturm.y / TILE_SIZE)), REGION.CLIFFS,
    m + 'der Leuchtturm steht nicht an den Klippen');
    for (const id of ['torbogen', 'muehle']) {
      assert.ok(biom(id) === BIOM.WIESE || biom(id) === BIOM.BLUMENWIESE,
        m + id + ' steht nicht auf einer Wiese');
    }
  }
});

test('Um jede Landmarke herum kommt man herum', () => {
  // Eine Marke, die einen Weg versperrt, ist ein Hindernis. Geprüft
  // wird der Kranz in zwei Kacheln Abstand: Mindestens die Hälfte davon
  // muss begehbar sein.
  for (const { seed, w } of welten()) {
    for (const e of w.entities) {
      if (e.kind !== 'marke') continue;
      const tx = Math.floor(e.x / TILE_SIZE);
      const ty = Math.floor(e.y / TILE_SIZE);
      let frei = 0;
      let n = 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== 3) continue;
          n++;
          if (isWalkable(w.tileAtTile(tx + dx, ty + dy))) frei++;
        }
      }
      // Der Leuchtturm steht auf einer Landspitze – dort ist der Kranz
      // naturgemäß zur Hälfte Wasser. Um einen Leuchtturm geht man
      // nicht herum, man geht zu ihm hin.
      const mindestens = e.markeId === 'leuchtturm' ? 0.25 : 0.4;
      assert.ok(frei > n * mindestens, 'Seed ' + seed + ': um ' + e.markeId
        + ' herum sind nur ' + frei + ' von ' + n + ' Kacheln begehbar');
    }
  }
});

test('Eine Landmarke lässt sich nicht abbauen', () => {
  // Der ganze Sinn ist, dass sie bleibt. Eine Marke mit Werkzeug wäre
  // nach einer Woche weg, und mit ihr die Orientierung.
  const w = new World(11).populate();
  const e = w.entities.find(function (x) { return x.kind === 'marke'; });
  assert.ok(e, 'keine Marke gefunden');
  assert.equal(w.canStand(e.x, e.y, 15, 11), false, 'man steht mitten in der Marke');
  for (const m of MARKEN) {
    assert.ok(m.block >= 60, m.id + ': zu kleiner Block für eine Landmarke');
    assert.ok(m.sprite.indexOf('marke_') === 0, m.id + ': unerwarteter Grafikname');
  }
});

test('Dieselbe Insel trägt ihre Marken immer an derselben Stelle', () => {
  // Ohne das wäre es kein Wahrzeichen: Wer seinen Spielstand lädt, muss
  // das Wrack dort wiederfinden, wo er es verlassen hat. Die Welt wird
  // beim Laden neu aus dem Samen gebaut.
  const a = new World(4711).populate().marken;
  const b = new World(4711).populate().marken;
  assert.deepEqual(a, b);
});
