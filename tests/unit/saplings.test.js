/**
 * Setzlinge – wird daraus wirklich ein Baum?
 *
 * Die ganze Bauart hängt an einem Satz: **Ein Setzling wird ein GEWÖHNLICHER
 * Baum.** Kein „gepflanzter Baum" mit eigenen Regeln, sondern ein `tree_oak`
 * wie jeder andere – damit gilt alles, was es für Bäume ohnehin gibt, ohne
 * dass eine Zeile davon etwas von Setzlingen wissen muss.
 *
 * Deshalb prüft diese Datei vor allem eines: dass das Ziel jedes Setzlings
 * eine Baumart ist, die es wirklich gibt und die sich wie ein Baum verhält.
 * Ein Tippfehler dort wäre ein Objekt, das nach acht Tagen zu etwas wird,
 * das nicht existiert – und der Spieler hätte eine Woche darauf gewartet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SETZLINGE, SETZLING_IDS, STUFEN, AUS_BAUM,
  setzlingFuer, setzlingVonBaum, tageFuer, stufeVon, spriteVon, tageBis,
} from '../../src/game/saplings.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { getItem, CAT } from '../../src/game/items.js';
import { SEASON_IDS } from '../../src/game/calendar.js';
import { SEASON_REGROW } from '../../src/game/seasons.js';
import { HINTS } from '../../src/game/collection.js';

test('Aus jedem Setzling wird ein Baum, den es wirklich gibt', () => {
  for (const id of SETZLING_IDS) {
    const sl = SETZLINGE[id];
    const def = ENTITY_DEFS[sl.wird];
    assert.ok(def, id + ' wird zu „' + sl.wird + '", und das gibt es nicht');
    // Und zwar zu etwas, das sich wie ein Baum verhält: Ohne das wäre der
    // ganze Kniff dahin – dann müsste doch wieder jede Baumregel wissen,
    // dass es Setzlinge gibt.
    assert.equal(def.category, 'tree', sl.wird + ' ist kein Baum');
    assert.ok(def.hits >= 1, sl.wird + ' lässt sich nicht fällen');
    assert.ok(def.becomes, sl.wird + ' hinterlässt keinen Stumpf');
  }
});

test('Jede Baumart auf der Insel hat ihren Setzling', () => {
  // Sonst wäre eine Sorte die, die man abholzt und nie ersetzt – und
  // niemand wüsste, warum ausgerechnet die.
  const arten = Object.keys(ENTITY_DEFS).filter(function (k) {
    return ENTITY_DEFS[k].category === 'tree';
  });
  assert.ok(arten.length >= 4, 'zu wenige Baumarten gefunden');
  for (const a of arten) {
    assert.ok(setzlingVonBaum(a), a + ' hat keinen Setzling');
  }
  assert.equal(setzlingVonBaum('tree_gibtsnicht'), null);
  assert.equal(arten.length, SETZLING_IDS.length,
    'ein Setzling ohne Baumart oder umgekehrt');
});

test('Jeder Setzling ist ein Gegenstand, den man setzen kann', () => {
  for (const id of SETZLING_IDS) {
    const it = getItem(id);
    assert.ok(it, id + ' gibt es als Gegenstand nicht');
    assert.equal(it.cat, CAT.SEED);
    assert.equal(it.pflanzt, id, id + ': pflanzt etwas anderes');
    // `pflanzt` und NICHT `plant`: Die Saat legt ein Beet an, das man
    // erntet und das danach weg ist. Ein Setzling wird ein Baum und bleibt.
    assert.ok(!it.plant, id + ' gilt als Saat');
    assert.ok(it.prop, id + ' hat kein Vorschaubild');
    assert.ok(it.value > 0 && it.value < 40, id + ': Wert ' + it.value);
  }
});

test('Die Sorten unterscheiden sich – sonst wäre einer genug', () => {
  const ziele = SETZLING_IDS.map((id) => SETZLINGE[id].wird);
  assert.equal(new Set(ziele).size, ziele.length, 'zwei Setzlinge, ein Baum');
  const farben = SETZLING_IDS.map((id) => SETZLINGE[id].laub);
  assert.equal(new Set(farben).size, farben.length, 'zwei Setzlinge, eine Farbe');
  for (const id of SETZLING_IDS) {
    assert.match(SETZLINGE[id].laub, /^#[0-9a-f]{6}$/i, id);
    assert.ok(SETZLINGE[id].name.length > 5, id + ': kein Name');
  }
});

test('Die Jahreszeit entscheidet, wie lange es dauert', () => {
  // Über `regrowDays`, nicht über eine eigene Rechnung: Der Winter bremst
  // den Nachwuchs schon, und zwei Formeln für dieselbe Sache liefen beim
  // ersten Zahlendreher auseinander.
  for (const id of SETZLING_IDS) {
    const sl = SETZLINGE[id];
    const fruehling = tageFuer(sl, 'spring');
    const winter = tageFuer(sl, 'winter');
    assert.ok(fruehling < winter, id + ': der Winter bremst nicht');
    assert.ok(fruehling >= 1, id + ': fertig am selben Tag');
    // Und die Faktoren sind dieselben wie beim Nachwuchs.
    assert.equal(winter, Math.max(1, Math.round(sl.tage * SEASON_REGROW.winter)));
  }
  // Ohne Jahreszeit läuft es weiter, statt auf null zu fallen.
  assert.ok(tageFuer(SETZLINGE.sapling_oak, null) >= 1);
  assert.equal(tageFuer(null, 'spring'), 1);
});

test('Ein Baum braucht deutlich länger als ein Beet', () => {
  // Vier Tage wären ein schnelles Beet. Der Unterschied ist der Punkt: Man
  // pflanzt einen Baum nicht für morgen.
  for (const id of SETZLING_IDS) {
    for (const jz of SEASON_IDS) {
      assert.ok(tageFuer(SETZLINGE[id], jz) >= 4,
        id + ' im ' + jz + ': nur ' + tageFuer(SETZLINGE[id], jz) + ' Tage');
    }
  }
});

test('Die Stufe steigt, und am Ende ist er fertig', () => {
  const tage = 8;
  assert.equal(stufeVon(0, tage), 0);
  assert.equal(stufeVon(tage - 1, tage), STUFEN - 1);
  assert.equal(stufeVon(tage, tage), STUFEN, 'am Zieltag noch nicht fertig');
  assert.equal(stufeVon(tage + 5, tage), STUFEN, 'darüber hinaus nicht mehr fertig');
  // Sie geht nie zurück.
  let letzte = -1;
  for (let g = 0; g <= tage; g++) {
    const st = stufeVon(g, tage);
    assert.ok(st >= letzte, 'Stufe fällt bei ' + g);
    letzte = st;
  }
  // Und ein kaputter Wert macht keine Ausnahme: `tageFuer` klemmt auf
  // mindestens einen Tag, also ist auch ein Setzling mit „0 Tage nötig" am
  // Pflanztag noch nicht fertig. Nichts auf dieser Insel wird am selben Tag
  // fertig, und das gilt hier auch für einen verbogenen Spielstand.
  assert.equal(stufeVon(0, 0), 0);
  assert.equal(stufeVon(1, 0), STUFEN, 'am Tag danach schon');
  assert.equal(stufeVon(3, -5), STUFEN, 'negative Dauer ist sofort vorbei');
});

test('Jede Stufe zeigt auf eine Grafik, die es gibt', () => {
  // Der Name wird aus der Kennung gebaut – ein Umbenennen der Sorte ohne
  // die Grafik wäre ein Setzling ohne Bild.
  for (const id of SETZLING_IDS) {
    for (let st = 0; st < STUFEN; st++) {
      assert.equal(spriteVon(id, st), 'sapling_' + id.replace('sapling_', '') + '_' + st);
    }
    // Ausserhalb wird geklemmt statt erfunden.
    assert.equal(spriteVon(id, -3), spriteVon(id, 0));
    assert.equal(spriteVon(id, 99), spriteVon(id, STUFEN - 1));
  }
});

test('Die Restzeit zählt herunter und bleibt bei null stehen', () => {
  assert.equal(tageBis(0, 6), 6);
  assert.equal(tageBis(5, 6), 1);
  assert.equal(tageBis(6, 6), 0);
  assert.equal(tageBis(9, 6), 0, 'negative Tage');
});

test('Ein Setzling liegt als Objekt bereit und lässt sich mit der Hand nehmen', () => {
  const def = ENTITY_DEFS.sapling;
  assert.ok(def, 'keine Objektdefinition');
  assert.equal(def.category, 'sapling');
  assert.equal(def.solid, false, 'man läuft um einen Steckling nicht herum');
  assert.equal(def.hits, 1);
  // Mit der HAND: Wer versehentlich gepflanzt hat, soll ihn wieder aufheben
  // können, ohne die Axt zu holen.
  assert.ok(def.tool, 'kein Werkzeug');
  // Keine eigene Ausbeute: Welche Sorte zurückkommt, steht am Objekt und
  // nicht an der Definition – siehe `_collect`.
  assert.equal(def.yield, undefined, 'die Definition kennt die Sorte gar nicht');
  assert.equal(def.respawn, undefined, 'ein Setzling wächst nicht nach');
});

test('Gefällte Bäume geben oft genug einen her, aber nicht immer', () => {
  // Bei jedem Baum hätte man nach einer Woche dreißig Setzlinge und
  // pflanzte nie; bei jedem zehnten wäre es ein Glücksfall statt einer
  // Möglichkeit.
  assert.ok(AUS_BAUM > 0.15 && AUS_BAUM < 0.6, 'Ausbeute ' + AUS_BAUM);
});

test('Jeder Setzling sagt, woher er kommt', () => {
  for (const id of SETZLING_IDS) {
    const t = HINTS[id];
    assert.ok(t && t.length > 10, id + ': kein Fingerzeig');
    assert.ok(/fäll/i.test(t), id + ': der Fingerzeig nennt das Fällen nicht: ' + t);
  }
});

test('Eine unbekannte Kennung erfindet keinen Baum', () => {
  assert.equal(setzlingFuer('gibtsnicht'), null);
  assert.equal(setzlingFuer(null), null);
  assert.equal(setzlingFuer(undefined), null);
});
