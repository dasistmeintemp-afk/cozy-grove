/**
 * Die Trachten – sind es Kleider, und bleibt Seli dabei Seli?
 *
 * Zwei Sorten Prüfung, und die zweite ist die, die diesem Stück Spiel seine
 * Grenze zieht:
 *
 * 1. **Vollständigkeit und Unterschied.** Jede Tracht setzt ALLE Kleider,
 *    und keine zwei sehen gleich aus. Eine halbe Tracht sähe je nachdem,
 *    was man vorher anhatte, anders aus – und wäre dann keine Tracht mehr,
 *    sondern ein Zufall.
 * 2. **Seli bleibt Seli.** Keine Tracht bringt Haar- oder Augenfarbe mit,
 *    und der Maler ließe sie auch nicht durch. Das ist keine Kleiderauswahl
 *    mehr, wenn man darin einen zweiten Charakter bauen kann.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TRACHTEN, TRACHT_IDS, trachtFuer, offen, offeneAus, offeneZahl,
  trachtenStand, trachtZuFest, trachtVomWanderer,
} from '../../src/game/tracht.js';
import { KLEIDER, trachtFarben } from '../../src/art/painted-camp.js';
import { SELI } from '../../src/art/painted-camp.js';
import { FEST_IDS } from '../../src/game/festivals.js';

/** '#rrggbb' → [r, g, b]. */
function rgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Grob, wie hell eine Farbe wirkt. */
function hell(hex) {
  const c = rgb(hex);
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}

/** Abstand zweier Farben – reicht für „sieht anders aus". */
function abstand(a, b) {
  const x = rgb(a);
  const y = rgb(b);
  return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
}

test('Jede Tracht setzt alle Kleider – keine halben', () => {
  for (const t of TRACHTEN) {
    for (const k of KLEIDER) {
      assert.ok(typeof t[k] === 'string', t.id + ': ' + k + ' fehlt');
      assert.match(t[k], /^#[0-9a-f]{6}$/i, t.id + ': ' + k + ' ist keine Farbe: ' + t[k]);
    }
  }
});

test('Keine Tracht fasst Haar oder Augen an', () => {
  // Seli ist blond und blauäugig. Das ist sie, nicht ihr Aufzug.
  const tabu = ['hair', 'hairShade', 'hairLight', 'eye', 'eyeDeep'];
  for (const t of TRACHTEN) {
    for (const k of tabu) {
      assert.ok(!(k in t), t.id + ': fasst „' + k + '" an');
    }
  }
});

test('Und der Maler ließe es auch nicht zu', () => {
  // Die eigentliche Absicherung: Die Prüfung oben liest die Liste, diese
  // hier nimmt eine Tracht, die es böse meint. `trachtFarben` geht nur die
  // Kleider durch und sieht sich nichts anderes an.
  const boese = { top: '#123456', hair: '#000000', eye: '#ff0000', hairLight: '#00ff00' };
  const c = trachtFarben(boese);
  assert.equal(c.top, '#123456', 'die Kleider kommen nicht an');
  assert.equal(c.hair, SELI.hair, 'das Haar wurde umgefärbt');
  assert.equal(c.hairLight, SELI.hairLight, 'die Haarspitzen wurden umgefärbt');
  assert.equal(c.eye, SELI.eye, 'die Augen wurden umgefärbt');
  // Und ohne Tracht kommt Selis eigene Tafel heraus.
  assert.equal(trachtFarben(null), SELI);
});

test('Der Schatten ist dunkler als die Farbe darüber', () => {
  // Der Maler legt ihn versetzt darüber. Ein hellerer „Schatten" ist keiner,
  // sondern ein Fleck – und zwei unverwandte Farben ergeben denselben Fleck.
  const paare = [['top', 'topShade'], ['skirt', 'skirtShade'],
    ['hat', 'hatShade'], ['pack', 'packShade']];
  for (const t of TRACHTEN) {
    for (const [farbe, schatten] of paare) {
      assert.ok(hell(t[schatten]) < hell(t[farbe]),
        t.id + ': ' + schatten + ' ist nicht dunkler als ' + farbe);
      // Und nicht irgendeine dunkle Farbe, sondern dieselbe – sonst sieht es
      // aus wie ein zweites Kleidungsstück darunter.
      assert.ok(abstand(t[farbe], t[schatten]) < 110,
        t.id + ': ' + schatten + ' ist eine andere Farbe als ' + farbe);
    }
  }
});

test('Keine zwei Trachten sehen gleich aus', () => {
  // Sechs Zeilen im Schrank, von denen zwei dasselbe tun, sind fünf Zeilen
  // und ein Fehler.
  for (let i = 0; i < TRACHTEN.length; i++) {
    for (let j = i + 1; j < TRACHTEN.length; j++) {
      const a = TRACHTEN[i];
      const b = TRACHTEN[j];
      // Gemessen an den drei großen Flächen: Bluse, Rock, Hut.
      const d = abstand(a.top, b.top) + abstand(a.skirt, b.skirt) + abstand(a.hat, b.hat);
      assert.ok(d > 120, a.id + ' und ' + b.id + ' liegen zu dicht: ' + Math.round(d));
    }
  }
});

test('Kennungen sind eindeutig, und die erste ist die gewohnte', () => {
  assert.equal(new Set(TRACHT_IDS).size, TRACHT_IDS.length, 'zwei gleiche Kennungen');
  assert.equal(TRACHTEN[0].id, 'standard');
  assert.equal(TRACHTEN[0].ab, null, 'die erste Tracht ist verschlossen');
  // Und die erste trägt genau das, womit Seli anfängt.
  for (const k of KLEIDER) {
    assert.equal(TRACHTEN[0][k], SELI[k], 'die erste Tracht ist nicht Selis eigene: ' + k);
  }
});

test('Was verschlossen ist, braucht einen Grund und einen Vermerk', () => {
  for (const t of TRACHTEN) {
    if (!t.ab) continue;
    assert.ok(t.ab.fest || t.ab.wanderer, t.id + ': `ab` sagt nicht, woher');
    assert.ok(t.woher && t.woher.length > 3,
      t.id + ': steht verschlossen da, ohne zu sagen woher');
  }
});

test('Jedes Fest bringt genau eine Tracht mit', () => {
  // Drei Feste mit Tracht und eines ohne wären drei Feste und eine Frage.
  for (const id of FEST_IDS) {
    const t = trachtZuFest(id);
    assert.ok(t, 'kein Kleid zum Fest ' + id);
    assert.ok(TRACHT_IDS.indexOf(t) >= 0, id + ': zeigt auf ' + t);
  }
  assert.equal(trachtZuFest('gibtsnicht'), null);
});

test('Der Wanderer bringt seine beim vierten Tausch', () => {
  assert.equal(trachtVomWanderer(4), 'wanderer');
  // Nicht beim zweiten – da kommt die Laterne, und zwei Andenken an einem
  // Tag wären keines mehr.
  assert.equal(trachtVomWanderer(2), null);
  assert.equal(trachtVomWanderer(3), null);
  assert.equal(trachtVomWanderer(5), null);
});

test('Das Gewohnte ist immer offen, alles andere erst, wenn es dasteht', () => {
  assert.ok(offen(trachtFuer('standard'), []));
  assert.ok(!offen(trachtFuer('bluete'), []));
  assert.ok(offen(trachtFuer('bluete'), ['bluete']));
  assert.ok(!offen(trachtFuer('bluete'), ['ernte']));
  assert.ok(!offen(null, ['bluete']));
});

test('Eine unbekannte Kennung macht Seli nicht nackt', () => {
  assert.equal(trachtFuer('gibtsnicht').id, 'standard');
  assert.equal(trachtFuer(null).id, 'standard');
  assert.equal(trachtFuer(undefined).id, 'standard');
});

test('Ein alter oder kaputter Spielstand gibt eine leere Liste', () => {
  assert.deepEqual(offeneAus(undefined), []);
  assert.deepEqual(offeneAus(null), []);
  assert.deepEqual(offeneAus('bluete'), [], 'eine Zeichenkette ist keine Liste');
  assert.deepEqual(offeneAus({ bluete: true }), []);
  // Erfundenes fliegt raus, Doppeltes auch.
  assert.deepEqual(offeneAus(['bluete', 'gibtsnicht', 'bluete', 7, null, 'ernte']),
    ['bluete', 'ernte']);
});

test('Der Schrank zählt, was offen ist', () => {
  assert.equal(offeneZahl([]), 1, 'am Anfang hängt genau eine darin');
  assert.equal(offeneZahl(['bluete', 'ernte']), 3);
  assert.equal(offeneZahl(TRACHT_IDS), TRACHTEN.length);

  const stand = trachtenStand(['bluete']);
  assert.equal(stand.length, TRACHTEN.length);
  assert.ok(stand[0].offen, 'das Gewohnte steht verschlossen da');
  const bluete = stand.find((t) => t.id === 'bluete');
  assert.ok(bluete.offen && bluete.woher, 'offen, aber ohne Herkunft');
  const lichter = stand.find((t) => t.id === 'lichter');
  assert.ok(!lichter.offen, 'das Lichterfest war noch gar nicht');
});
