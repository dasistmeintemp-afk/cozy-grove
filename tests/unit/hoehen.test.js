/**
 * Höhenstufen und Steilkanten.
 *
 * Die Insel hat Ebenen. Was dabei schiefgehen kann, ist nicht das
 * Aussehen – das sieht man –, sondern die Begehbarkeit: Eine Wand an der
 * falschen Stelle schneidet lautlos einen halben Landesteil ab, und
 * gemerkt wird es erst, wenn jemand dorthin will.
 *
 * Deshalb prüft diese Datei vor allem WEGE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateTiles, hoehenFuer, tileIndex, MAP_W, MAP_H, MAX_STUFE,
  CAMP_TILE, FORD_X0, FORD_X1, RIVER_Y0, RIVER_Y1,
  CHANNEL_X0, CHANNEL_X1, BRIDGE_Y0, BRIDGE_Y1,
} from '../../src/world/worldgen.js';
import { T, isWalkable } from '../../src/art/tiles.js';
import { plotBounds, MAX_PLOT_STAGE, islePlotBounds, MAX_ISLE_PLOT_STAGE } from '../../src/game/plot.js';

const SEEDS = [11, 4711, 555, 20250907, 999999, 7];

/** Alles, was von hier aus zu Fuß zu erreichen ist. */
function erreichbarVon(tiles, sx, sy) {
  const da = new Uint8Array(MAP_W * MAP_H);
  const stapel = [sx, sy];
  da[tileIndex(sx, sy)] = 1;
  while (stapel.length) {
    const ty = stapel.pop();
    const tx = stapel.pop();
    const nach = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
    for (const [nx, ny] of nach) {
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const j = tileIndex(nx, ny);
      if (da[j] || !isWalkable(tiles[j])) continue;
      da[j] = 1;
      stapel.push(nx, ny);
    }
  }
  return da;
}

test('Die Insel hat wirklich mehrere Ebenen', () => {
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const hoehen = hoehenFuer(seed);
    const zaehler = [0, 0, 0];
    for (let i = 0; i < tiles.length; i++) {
      if (!isWalkable(tiles[i])) continue;
      zaehler[hoehen[i]]++;
    }
    const land = zaehler[0] + zaehler[1] + zaehler[2];
    // Jede Stufe muss ein ORT sein, keine Handvoll Kacheln. Unter fünf
    // Prozent sieht man sie nicht und findet sie nie.
    //
    // Es ist jetzt EINE Stufe über der Grundebene statt zweier. Drei
    // Ebenen ergaben zwei Sorten Grenze und damit rund 760
    // Klippenkacheln je Insel – ein Geäder quer durch die Wiese statt
    // weniger Hochflächen. Die Schleife bleibt, damit sie mitwächst,
    // wenn je wieder eine Ebene dazukommt.
    for (let z = 1; z <= MAX_STUFE; z++) {
      assert.ok(zaehler[z] > land * 0.04,
        'Seed ' + seed + ': Stufe ' + z + ' hat nur ' + zaehler[z] + ' von ' + land + ' Kacheln');
    }
    /**
     * Die Hochfläche IST die Insel, die Grundebene ist ihr Saum.
     *
     * Hier stand das Gegenteil: „die unterste Ebene muss die größte
     * bleiben". Das galt, solange die Hochflächen aus einem Rauschfeld
     * kamen und über die Insel verteilt lagen – dann wäre eine
     * Mehrheit oben gleichbedeutend mit „überall Klippen".
     *
     * Seit die Klippe am RAND liegt, ist es umgekehrt: Das
     * Landesinnere ist die Hochfläche, und unten liegt der Küstensaum
     * mit dem Strand. Eine Grundebene, die die Mehrheit hätte, wäre
     * eine Insel, die fast nur aus Strand besteht.
     *
     * Geprüft wird jetzt, dass es beides WIRKLICH gibt: Der Saum darf
     * weder verschwinden noch die Insel auffressen.
     */
    assert.ok(zaehler[0] > land * 0.15,
      'Seed ' + seed + ': der Küstensaum hat nur ' + zaehler[0] + ' von ' + land);
    assert.ok(zaehler[0] < land * 0.5,
      'Seed ' + seed + ': der Küstensaum hat ' + zaehler[0] + ' von ' + land
      + ' – das ist keine Insel mehr, sondern ein Strand');
  }
});

test('Eine Steilkante steht nur dort, wo es höher weitergeht', () => {
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const hoehen = hoehenFuer(seed);
    let wände = 0;
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const i = tileIndex(tx, ty);
        if (tiles[i] !== T.CLIFF) continue;
        wände++;
        const z = hoehen[i];
        const nachbarn = [i - 1, i + 1, i - MAP_W, i + MAP_W];
        const hoeher = nachbarn.some((j) => hoehen[j] > z);
        assert.ok(hoeher, 'Seed ' + seed + ': Wand bei ' + tx + '|' + ty
          + ' ohne höheren Nachbarn');
      }
    }
    assert.ok(wände > 60, 'Seed ' + seed + ': nur ' + wände + ' Wandkacheln');
  }
});

test('Eine Steilkante ist nicht begehbar', () => {
  // Die ganze Bauart hängt daran: keine zweite Begehbarkeitsregel neben
  // `isWalkable`, sondern eine Kachel, die nicht begehbar IST. Wäre sie
  // es doch, liefe die Figur die Wand hinauf und niemand merkte es, weil
  // es im Bild richtig aussieht.
  assert.equal(isWalkable(T.CLIFF), false);
});

test('Trotz aller Wände kommt man überall hin', () => {
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const start = erreichbarVon(tiles, CAMP_TILE.x, CAMP_TILE.y);
    // Gezählt wird nur das FESTLAND, also die Landmasse des Lagers und
    // was über Land daran hängt. Die Stille Insel liegt hinter Wasser;
    // für sie prüft isle.test.js denselben Weg vom Anleger aus.
    let erreicht = 0;
    for (let i = 0; i < tiles.length; i++) if (start[i]) erreicht++;
    // Alles, was eine Wand von diesem Gebiet trennt, muss offen sein:
    // Eine Wandkachel mit erreichtem UND unerreichtem Nachbarn bedeutet,
    // dass die Rampensuche aufgegeben hat.
    let getrennt = 0;
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const i = tileIndex(tx, ty);
        if (tiles[i] !== T.CLIFF) continue;
        const n = [i - 1, i + 1, i - MAP_W, i + MAP_W];
        const ja = n.some((j) => start[j]);
        const nein = n.some((j) => isWalkable(tiles[j]) && !start[j]);
        if (ja && nein) getrennt++;
      }
    }
    assert.equal(getrennt, 0,
      'Seed ' + seed + ': ' + getrennt + ' Wandkacheln trennen noch etwas ab');
    assert.ok(erreicht > 1200, 'Seed ' + seed + ': nur ' + erreicht + ' Kacheln am Lager');
  }
});

test('Auf keinem Grundstück steht eine Steilkante', () => {
  // Eine Felswand mitten im eigenen Garten wäre absurd – und sie wäre
  // auch nicht wegzuräumen: Eine Steilkante ist kein Baum.
  //
  // Dieser Test ist zugleich die Gegenprobe zu den Maßen, die in
  // `worldgen.js` von Hand stehen (FLACHE_PLAETZE). Wächst eine
  // Grundstücksstufe, schlägt er an, statt dass jemand Jahre später eine
  // Wand im Beet findet.
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    for (const b of [plotBounds(MAX_PLOT_STAGE), islePlotBounds(MAX_ISLE_PLOT_STAGE)]) {
      for (let ty = b.y0; ty <= b.y1; ty++) {
        for (let tx = b.x0; tx <= b.x1; tx++) {
          assert.notEqual(tiles[tileIndex(tx, ty)], T.CLIFF,
            'Seed ' + seed + ': Wand auf dem Grundstück bei ' + tx + '|' + ty);
        }
      }
    }
  }
});

test('Furt und Brücke bleiben frei', () => {
  // Ein Übergang, vor dem eine Wand steht, ist kein Übergang.
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    for (let ty = RIVER_Y0 - 3; ty <= RIVER_Y1 + 3; ty++) {
      for (let tx = FORD_X0 - 2; tx <= FORD_X1 + 2; tx++) {
        assert.notEqual(tiles[tileIndex(tx, ty)], T.CLIFF, 'Seed ' + seed + ': Wand an der Furt');
      }
    }
    for (let ty = BRIDGE_Y0 - 3; ty <= BRIDGE_Y1 + 3; ty++) {
      for (let tx = CHANNEL_X0 - 3; tx <= CHANNEL_X1 + 3; tx++) {
        assert.notEqual(tiles[tileIndex(tx, ty)], T.CLIFF, 'Seed ' + seed + ': Wand an der Brücke');
      }
    }
  }
});

test('Derselbe Samen ergibt dieselben Höhen', () => {
  generateTiles(4711);
  const a = Array.from(hoehenFuer(4711));
  generateTiles(999999);
  const b = Array.from(hoehenFuer(4711));
  assert.deepEqual(a, b, 'der Zwischenspeicher gibt die Höhen eines anderen Samens zurück');
});
