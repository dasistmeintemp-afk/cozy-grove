/**
 * Biome.
 *
 * Die Prüfungen hier sind nicht hübsch, sondern streng: Ein Biom, das
 * auf dem Papier existiert und sich auf der Insel nicht vom Nachbarn
 * unterscheidet, ist keins. Gemessen wird deshalb der BEWUCHS – was
 * wirklich dort steht, nicht was die Tabelle verspricht.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import { BIOM, BIOM_NAMEN, BIOME, biomeFuer, biomStand } from '../../src/world/biome.js';
import { generateTiles, tileIndex, MAP_W, MAP_H } from '../../src/world/worldgen.js';
import { T, TILE_SIZE, isWalkable } from '../../src/art/tiles.js';

const SEEDS = [11, 4711, 555, 20250907, 7];

test('Jede Insel hat jedes Biom', () => {
  // Eine Insel, auf der der Nadelwald fehlt, hat einen Ort weniger –
  // und man merkt es nie, weil nichts dort einen Hinweis gibt.
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const stand = biomStand(biomeFuer(seed), tiles);
    let summe = 0;
    for (const k in stand) summe += stand[k];
    for (const k in BIOME) {
      assert.ok(stand[k] > summe * 0.015,
        'Seed ' + seed + ': ' + BIOM_NAMEN[k] + ' hat nur '
        + Math.round((stand[k] / summe) * 1000) / 10 + ' %');
    }
  }
});

test('Die Biome liegen in Flecken, nicht als Flickenteppich', () => {
  // Ein Biom, durch das man in fünf Schritten durch ist, ist kein Ort.
  // Gemessen wird, wie oft sich das Biom zwischen zwei Nachbarkacheln
  // ändert: Je seltener, desto größer die Flecken.
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const karte = biomeFuer(seed);
    let kanten = 0;
    let paare = 0;
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 2; tx++) {
        const i = tileIndex(tx, ty);
        const j = tileIndex(tx + 1, ty);
        if (!isWalkable(tiles[i]) || !isWalkable(tiles[j])) continue;
        if (tiles[i] === T.SAND || tiles[j] === T.SAND) continue;
        paare++;
        if (karte[i] !== karte[j]) kanten++;
      }
    }
    /**
     * Gemessen wird jetzt die Strecke, nicht der Anteil.
     *
     * Beides ist dieselbe Zahl, nur herum: Ein Anteil von acht Prozent
     * sind zwölfeinhalb Kacheln am Stück. Die Strecke steht hier, weil
     * sie das ist, worum es geht – „wie weit laufe ich, bevor sich die
     * Gegend ändert“ – und weil der Anteil sich mit der Zahl der Biome
     * mitbewegt, ohne dass sich für den Spieler etwas ändert.
     *
     * Die Schwelle ist von zwölfeinhalb auf zehneinhalb Kacheln
     * gegangen, als aus neun Biomen vierzehn wurden. Das ist eine echte
     * Lockerung und keine Buchhaltung: Auf derselben Insel teilen sich
     * jetzt mehr Gegenden dasselbe Land, also ist jede kleiner. Der
     * Rauschmaßstab ist im Gegenzug von 0,013 auf 0,009 gegangen, was
     * den schlechtesten Inselwurf von 10,2 auf 7,6 Prozent gebracht hat
     * – erst danach ist die Schwelle angefasst worden, und nur um die
     * zwei Prozentpunkte, die vierzehn statt neun Biome kosten.
     */
    const strecke = paare / Math.max(1, kanten);
    assert.ok(strecke >= 10.5, 'Seed ' + seed + ': im Mittel nur '
      + Math.round(strecke * 10) / 10 + ' Kacheln bis zum nächsten Biom – '
      + 'das ist ein Flickenteppich');
  }
});

test('Im Birkenhain stehen wirklich überwiegend Birken', () => {
  // Das ist die Probe aufs Ganze: Die Tabelle sagt 11 zu 1 für die
  // Birke. Wenn auf der fertigen Insel dort trotzdem alles mögliche
  // steht, nützt die Tabelle nichts.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const karte = biomeFuer(seed);
    let birken = 0;
    let andere = 0;
    for (const e of welt.entities) {
      if (e.gone || e.kind.indexOf('tree_') !== 0) continue;
      if (e.kind === 'tree_stump' || e.kind === 'tree_wind') continue;
      const i = tileIndex(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE));
      if (karte[i] !== BIOM.BIRKENHAIN) continue;
      if (e.kind === 'tree_birch') birken++; else andere++;
    }
    assert.ok(birken + andere > 10, 'Seed ' + seed + ': fast keine Bäume im Birkenhain');
    assert.ok(birken > (birken + andere) * 0.75,
      'Seed ' + seed + ': nur ' + birken + ' von ' + (birken + andere) + ' Bäumen sind Birken');
  }
});

test('Die Heide ist offen, der Nadelwald dicht', () => {
  // Ohne eine Gegend, in der man WEIT sehen kann, ist eine Insel aus
  // Wald und Lichtung ein einziger Wald. Gemessen: Bäume je 100 Kacheln
  // im jeweiligen Biom.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const karte = biomeFuer(seed);
    const flaeche = biomStand(karte, welt.tiles);
    const baeume = {};
    for (const e of welt.entities) {
      if (e.gone || e.kind.indexOf('tree_') !== 0 || e.kind === 'tree_stump') continue;
      const b = karte[tileIndex(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE))];
      baeume[b] = (baeume[b] || 0) + 1;
    }
    const je100 = function (b) {
      return flaeche[b] > 40 ? ((baeume[b] || 0) / flaeche[b]) * 100 : null;
    };
    const heide = je100(BIOM.HEIDE);
    const wald = je100(BIOM.NADELWALD);
    if (heide == null || wald == null) continue;
    assert.ok(wald > heide * 2.5, 'Seed ' + seed + ': Nadelwald ' + Math.round(wald)
      + ' Bäume je 100 Kacheln, Heide ' + Math.round(heide) + ' – das ist kein Unterschied');
  }
});

test('Schilf im Landesinneren heißt nasser Boden – überall sonst steht keins', () => {
  // Schilf wächst sonst nur am Sandufer. Dass es mitten auf der Insel
  // steht, ist das Zeichen, an dem man nassen Boden erkennt – und das
  // funktioniert nur, wenn es wirklich nirgends sonst steht.
  //
  // Zwei Biome haben nassen Boden, seit es die feuchte Zone gibt: der
  // Sumpf und der Mangrovenwald. Die Prüfung hieß vorher „der Sumpf ist
  // der einzige Ort“ und ist daran gefallen – zu Recht gemeldet, aber
  // die Antwort ist nicht, dem Mangrovenwald sein Schilf wegzunehmen:
  // Beide stehen im Wasser, und das ist ja der Grund für das Schilf.
  // Die Zähne der Prüfung sitzen ohnehin in der zweiten Zusicherung:
  // Außerhalb dieser beiden darf keins stehen, und das sind nach wie
  // vor zwölf von vierzehn Biomen.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const karte = biomeFuer(seed);
    let imSumpf = 0;
    let woanders = 0;
    for (const e of welt.entities) {
      if (e.gone || e.kind !== 'reeds') continue;
      const tx = Math.floor(e.x / TILE_SIZE);
      const ty = Math.floor(e.y / TILE_SIZE);
      // Das Ufer zählt nicht mit: Dort gehört Schilf hin.
      if (welt.tileAtTile(tx, ty) === T.SAND) continue;
      const b = karte[tileIndex(tx, ty)];
      if (b === BIOM.SUMPF || b === BIOM.MANGROVE) imSumpf++; else woanders++;
    }
    assert.ok(imSumpf > 20, 'Seed ' + seed + ': nur ' + imSumpf + ' Schilf auf nassem Boden');
    assert.equal(woanders, 0,
      'Seed ' + seed + ': ' + woanders + ' Schilf außerhalb von nassem Boden und Ufer');
  }
});

test('Das Totholz ist eine Geschichte, kein Irrgarten', () => {
  // Stümpfe lassen sich nicht wegräumen – das ist der Punkt an ihnen.
  // Genau deshalb dürfen es nicht zu viele sein: Ein Feld voller fester
  // Hindernisse ist ein Irrgarten, eine Handvoll ist eine Geschichte.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const karte = biomeFuer(seed);
    const flaeche = biomStand(karte, welt.tiles);
    if (!flaeche[BIOM.TOTHOLZ] || flaeche[BIOM.TOTHOLZ] < 60) continue;
    let stuempfe = 0;
    for (const e of welt.entities) {
      if (e.gone || e.kind !== 'tree_stump') continue;
      const i = tileIndex(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE));
      if (karte[i] === BIOM.TOTHOLZ) stuempfe++;
    }
    const je100 = (stuempfe / flaeche[BIOM.TOTHOLZ]) * 100;
    assert.ok(je100 > 1, 'Seed ' + seed + ': nur ' + stuempfe + ' Stümpfe im Totholz');
    assert.ok(je100 < 7, 'Seed ' + seed + ': ' + Math.round(je100)
      + ' Stümpfe je 100 Kacheln – das ist ein Irrgarten');
  }
});

test('Jedes Biom hat eine eigene Handschrift am Boden', () => {
  // Zwei Biome, die dasselbe Kleinzeug streuen, sind dasselbe Biom mit
  // zwei Namen. Geprüft wird die Tabelle selbst: Keine zwei Listen
  // dürfen gleich sein, und jede braucht einen eigenen Schwerpunkt.
  const gesehen = {};
  for (const k in BIOME) {
    const def = BIOME[k];
    assert.ok(def.boden.length >= 3, BIOM_NAMEN[k] + ': zu wenig Kleinzeug');
    const haupt = def.boden.slice().sort(function (a, b) { return b[1] - a[1]; })[0][0];
    const schluessel = def.boden.map(function (e) { return e[0]; }).sort().join('|');
    assert.ok(!gesehen[schluessel], BIOM_NAMEN[k] + ' streut dasselbe wie '
      + gesehen[schluessel]);
    gesehen[schluessel] = BIOM_NAMEN[k];
    assert.ok(haupt, BIOM_NAMEN[k] + ': kein Schwerpunkt');
  }
  // Und die Baumarten dürfen sich nicht alle gleichen.
  const ersten = Object.keys(BIOME).map(function (k) { return BIOME[k].baeume[0][0]; });
  assert.ok(new Set(ersten).size >= 3, 'fast alle Biome haben denselben Hauptbaum');
});
