/**
 * Sternbilder – ist das wirklich ein fünfter Erzählschritt?
 *
 * Die Zahl, um die es geht: Das Spiel hat 28 Erzählschritte, sieben Geister
 * mit je vier, und das ist die ganze geschriebene Geschichte. Sie ist nach
 * rund 180 Aufträgen durch. Jedes Sternbild hängt deshalb an genau einem
 * Geist und kommt erst, wenn dessen vier Schritte erzählt sind – sonst wäre
 * es ein Nachwort zu einem ungelesenen Buch und kein fünfter Schritt.
 *
 * Diese Datei prüft vor allem, dass diese Kopplung hält. Sie ist leicht zu
 * verlieren: Ein `faelligesSternbild`, das die Geschichte nicht abfragt,
 * funktioniert tadellos, verschenkt aber alle sieben Sätze an jemanden, der
 * die Geister gerade erst kennengelernt hat.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STERNBILDER, STERNBILD_IDS,
  sternbildVon, sternbildFuerGeist, geistName,
  emptySternbilder, gefunden, heuteSchon, himmelFrei,
  faelligesSternbild, merke, gefundene, sternbilderStand,
} from '../../src/game/sternbilder.js';
import { SPIRIT_IDS, SPIRITS } from '../../src/game/spirits.js';
import { STORIES } from '../../src/game/stories.js';

/** Eine klare Nacht. */
const NACHT = { nacht: true, wetter: null };
/** Alle Geschichten erzählt. */
const ALLES = function () { return true; };
/** Keine. */
const NICHTS = function () { return false; };

test('jeder Geist hat genau ein Sternbild – und jedes einen Geist', function () {
  assert.equal(STERNBILDER.length, SPIRIT_IDS.length,
    'sieben Geister, aber ' + STERNBILDER.length + ' Sternbilder');
  for (const id of SPIRIT_IDS) {
    const sb = sternbildFuerGeist(id);
    assert.ok(sb, id + ' hat kein Sternbild');
    assert.ok(SPIRITS[id], sb.id + ' gehört zu keinem Geist');
    // Und die Geschichte dieses Geistes muss es überhaupt geben, sonst
    // kann das Sternbild nie fällig werden.
    assert.ok(STORIES[id], id + ' hat keine Geschichte');
  }
  assert.equal(STERNBILD_IDS.length, new Set(STERNBILD_IDS).size, 'doppelte Kennung');
  const geister = STERNBILDER.map(function (s) { return s.geist; });
  assert.equal(geister.length, new Set(geister).size, 'zwei Sternbilder für einen Geist');
  assert.equal(sternbildVon('gibtsnicht'), null);
  assert.equal(geistName(sternbildFuerGeist('flamey')), SPIRITS.flamey.name);
});

test('das Sternbild kommt NACH der Geschichte, nicht vorher', function () {
  // Die Kopplung, um die es geht. Ohne sie bekäme jemand alle sieben Sätze,
  // bevor er die Geister überhaupt kennt.
  assert.equal(faelligesSternbild(emptySternbilder(), NACHT, 5, NICHTS), null,
    'ein Sternbild kam, obwohl keine Geschichte erzählt ist');

  // Nur ein Geist fertig: genau sein Sternbild, keines der anderen.
  const nurEiner = function (g) { return g === 'kiesel'; };
  const sb = faelligesSternbild(emptySternbilder(), NACHT, 5, nurEiner);
  assert.ok(sb);
  assert.equal(sb.geist, 'kiesel');
});

test('nur bei klarem Himmel', function () {
  assert.equal(himmelFrei({ nacht: true, wetter: null }), true);
  assert.equal(himmelFrei({ nacht: true, wetter: 'regen' }), false);
  assert.equal(himmelFrei({ nacht: true, wetter: 'nebel' }), false);
  assert.equal(himmelFrei({ nacht: true, wetter: 'schnee' }), false);
  assert.equal(himmelFrei({ nacht: false, wetter: null }), false, 'am Tag sieht man Sterne');
  assert.equal(himmelFrei(null), false);

  for (const lage of [{ nacht: true, wetter: 'regen' }, { nacht: false, wetter: null }]) {
    assert.equal(faelligesSternbild(emptySternbilder(), lage, 5, ALLES), null,
      JSON.stringify(lage) + ': ein Sternbild kam trotzdem');
  }
});

test('höchstens eines je Nacht, und jedes nur einmal', function () {
  let stand = emptySternbilder();
  const erst = faelligesSternbild(stand, NACHT, 10, ALLES);
  assert.ok(erst);
  stand = merke(stand, erst.id, 10);

  // Sieben Sätze an einem Abend wären ein Abspann, kein Nachwort.
  assert.equal(faelligesSternbild(stand, NACHT, 10, ALLES), null, 'zwei in einer Nacht');
  assert.equal(heuteSchon(stand, 10), true);
  assert.equal(heuteSchon(stand, 11), false);

  // In der nächsten Nacht das nächste – aber nie wieder dasselbe.
  const zweit = faelligesSternbild(stand, NACHT, 11, ALLES);
  assert.ok(zweit);
  assert.notEqual(zweit.id, erst.id);
  assert.equal(gefunden(stand, erst.id), true);
  assert.equal(gefunden(stand, zweit.id), false);
});

test('alle sind über ebenso viele Nächte erreichbar – und dann ist Schluss', function () {
  // Die Zahl kommt aus der Liste, nicht aus dem Namen der Prüfung: Mit
  // Silke Schiefer kam ein achtes Sternbild dazu, und „sieben“ stand an
  // drei Stellen hier drin.

  let stand = emptySternbilder();
  const gesehen = [];
  for (let nacht = 1; nacht <= STERNBILDER.length + 5; nacht++) {
    const sb = faelligesSternbild(stand, NACHT, nacht, ALLES);
    if (!sb) continue;
    gesehen.push(sb.id);
    stand = merke(stand, sb.id, nacht);
  }
  assert.equal(gesehen.length, STERNBILDER.length,
    'nur ' + gesehen.length + ' von ' + STERNBILDER.length + ' erreichbar');
  assert.equal(new Set(gesehen).size, gesehen.length, 'eines kam doppelt');
  // Danach kommt nichts mehr – und zwar `null` und nicht etwa wieder das
  // erste.
  assert.equal(faelligesSternbild(stand, NACHT, 99, ALLES), null);
  assert.deepEqual(sternbilderStand(stand),
    { gefunden: STERNBILDER.length, gesamt: STERNBILDER.length });
});

test('ein Sternbild gibt nichts her', function () {
  // Wie bei den Momenten: Mit Beute wäre der Himmel ein Vorrat.
  for (const sb of STERNBILDER) {
    for (const verboten of ['gift', 'items', 'coins', 'ember', 'lohn', 'gibt']) {
      assert.equal(sb[verboten], undefined, sb.id + ' gibt etwas her (' + verboten + ')');
    }
    assert.ok(sb.name && sb.satz, sb.id + ': Name oder Satz fehlt');
  }
  // Keine zwei Geister sagen dasselbe.
  const saetze = STERNBILDER.map(function (s) { return s.satz; });
  assert.equal(saetze.length, new Set(saetze).size, 'zwei Sternbilder sagen dasselbe');
});

test('die Sternlagen taugen zum Malen', function () {
  // Der Maler rechnet Anteile 0..1 auf die Bildgröße. Eine Zahl außerhalb
  // davon landet außerhalb des Bildes, und eine Linie auf einen Stern, den
  // es nicht gibt, wird still übersprungen – beides sieht man erst, wenn
  // man hinsieht.
  for (const sb of STERNBILDER) {
    assert.ok(sb.sterne.length >= 4, sb.id + ': nur ' + sb.sterne.length + ' Sterne');
    assert.ok(sb.linien.length >= 3, sb.id + ': zu wenige Linien zum Erkennen');
    for (const st of sb.sterne) {
      assert.ok(st[0] >= 0 && st[0] <= 1, sb.id + ': x außerhalb (' + st[0] + ')');
      assert.ok(st[1] >= 0 && st[1] <= 1, sb.id + ': y außerhalb (' + st[1] + ')');
      assert.ok([1, 2, 3].indexOf(st[2]) >= 0, sb.id + ': Helligkeit ' + st[2] + ' gibt es nicht');
    }
    for (const l of sb.linien) {
      assert.ok(sb.sterne[l[0]] && sb.sterne[l[1]],
        sb.id + ': Linie ' + JSON.stringify(l) + ' zeigt auf einen Stern, den es nicht gibt');
      assert.notEqual(l[0], l[1], sb.id + ': eine Linie von einem Stern zu sich selbst');
    }
    // Genau ein hellster Stern: Er ist der Anker, an dem das Auge die Form
    // festmacht. Zwei gleich helle und das Bild hat keine Mitte.
    const hellste = sb.sterne.filter(function (st) { return st[2] === 3; }).length;
    assert.equal(hellste, 1, sb.id + ': ' + hellste + ' hellste Sterne');
  }
});

test('die Chronik zeigt sie in der Reihenfolge des Findens', function () {
  let stand = emptySternbilder();
  stand = merke(stand, STERNBILDER[4].id, 90);
  stand = merke(stand, STERNBILDER[1].id, 40);
  stand = merke(stand, STERNBILDER[6].id, 65);
  const liste = gefundene(stand);
  assert.deepEqual(liste.map(function (e) { return e.tag; }), [40, 65, 90]);
  assert.equal(liste[0].sternbild.id, STERNBILDER[1].id);
  assert.equal(sternbilderStand(emptySternbilder()).gefunden, 0);
  assert.equal(sternbilderStand(null).gefunden, 0);
});
