/**
 * Reaktion auf Deko – bemerkt wirklich jemand, was man hinstellt?
 *
 * Das ist die fehlende Hälfte des einzigen unbegrenzten Brunnens im Spiel:
 * Einrichten gab es längst, bemerkt hat es niemand. Und es steht und fällt
 * mit einer Regel, die man beim Schreiben leicht verwässert: **Gesagt wird
 * das konkrete Stück, nicht die Stimmung.** Ein „Schön hast du es hier"
 * wäre schlimmer als gar nichts – es behauptet Aufmerksamkeit, die nicht da
 * ist.
 *
 * Geprüft wird deshalb vor allem, dass jede Gruppe wirklich einen eigenen
 * Satz hat, dass kein Satz eine Bitte oder eine Wertung enthält, und dass
 * jedes Deko-Stück, das zugeordnet ist, auch existiert.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GRUPPE, ALLGEMEIN, EIGEN,
  gruppeVon, satzFuer, emptyDekoreaktion, schluessel, schonGesagt,
  reaktionFuer, merke, reaktionenStand,
} from '../../src/game/dekoreaktion.js';
import { getItem } from '../../src/game/items.js';
import { SPIRIT_IDS } from '../../src/game/spirits.js';

const GRUPPEN = Array.from(new Set(Object.values(GRUPPE)));

test('jedes zugeordnete Stück gibt es wirklich – und es ist Deko', function () {
  // Ein Tippfehler hier ist still: Der Geist sagt dann nie etwas zu dem
  // Stück, und niemand erfährt, warum.
  for (const id of Object.keys(GRUPPE)) {
    const it = getItem(id);
    assert.ok(it, 'Deko „' + id + '" gibt es nicht');
    assert.equal(it.cat, 'decor', id + ' ist keine Deko, sondern ' + it.cat);
  }
});

test('jede Gruppe hat einen allgemeinen Satz', function () {
  // Ohne ihn fällt ein Geist ohne eigenen Satz auf `null` zurück und sagt
  // gar nichts – das Stück wäre dann für sechs von sieben Geistern
  // unsichtbar.
  for (const g of GRUPPEN) {
    assert.ok(ALLGEMEIN[g], 'Gruppe „' + g + '" hat keinen allgemeinen Satz');
  }
  // Und umgekehrt kein Satz für eine Gruppe, die kein Stück hat.
  for (const g of Object.keys(ALLGEMEIN)) {
    assert.ok(GRUPPEN.indexOf(g) >= 0, 'Satz für Gruppe „' + g + '", die es nicht gibt');
  }
  // Die eigenen Sätze müssen auf echte Geister und echte Gruppen zeigen.
  for (const geist of Object.keys(EIGEN)) {
    assert.ok(SPIRIT_IDS.indexOf(geist) >= 0, 'Geist „' + geist + '" gibt es nicht');
    for (const g of Object.keys(EIGEN[geist])) {
      assert.ok(GRUPPEN.indexOf(g) >= 0, geist + ': Gruppe „' + g + '" gibt es nicht');
    }
  }
});

test('kein Satz bittet um etwas oder bewertet', function () {
  // Regel 3. Ein „Du solltest mal …" macht aus dem Einrichten eine
  // Aufgabenliste, die die Geister schreiben – und damit genau nicht mehr
  // das, was dem Spieler gehört.
  const verboten = [
    'du solltest', 'stell mir', 'bring mir', 'kannst du', 'könntest du',
    'wäre besser', 'hässlich', 'schade',
  ];
  const alle = Object.values(ALLGEMEIN).slice();
  for (const geist of Object.keys(EIGEN)) alle.push(...Object.values(EIGEN[geist]));
  for (const satz of alle) {
    const klein = satz.toLowerCase();
    for (const w of verboten) {
      assert.ok(klein.indexOf(w) < 0, 'Satz enthält „' + w + '": ' + satz);
    }
    assert.ok(satz.length > 10 && satz.length < 110, 'unpassende Länge: ' + satz);
  }
  // Und keine zwei gleichen Sätze – ein doppelter Satz ist einer zu wenig.
  assert.equal(alle.length, new Set(alle).size, 'zwei Geister sagen wortgleich dasselbe');
});

test('ein eigener Satz schlägt den allgemeinen', function () {
  // Regel 4: Die Paarungen sind der eigentliche Gewinn. Wenn der
  // allgemeine Satz gewinnt, ist die ganze Tabelle `EIGEN` umsonst.
  assert.equal(satzFuer('kiesel', 'stillwasser'), EIGEN.kiesel.stillwasser);
  assert.notEqual(satzFuer('kiesel', 'stillwasser'), ALLGEMEIN.stillwasser);
  // Ein Geist ohne eigenen Satz bekommt den allgemeinen.
  assert.equal(satzFuer('flamey', 'waesche'), ALLGEMEIN.waesche);
  // Eine Gruppe, die es nicht gibt, ergibt `null` statt undefined.
  assert.equal(satzFuer('flamey', 'raumschiff'), null);
});

test('einmal je Geist und Sache – nicht einmal je Stück', function () {
  // Vier Laternen sind ein Lichtverhältnis und nicht vier Gelegenheiten,
  // über Licht zu reden.
  let stand = emptyDekoreaktion();
  const vier = ['lantern', 'moonlamp', 'paperlamp', 'stringlights'];

  const erst = reaktionFuer(stand, 'bruno', vier);
  assert.ok(erst);
  assert.equal(erst.gruppe, 'licht');
  stand = merke(stand, 'bruno', erst.gruppe);

  // Dieselben vier Laternen: nichts mehr.
  assert.equal(reaktionFuer(stand, 'bruno', vier), null, 'er sagt es ein zweites Mal');
  assert.equal(schonGesagt(stand, 'bruno', 'licht'), true);

  // Ein ANDERER Geist sagt trotzdem noch etwas dazu – gemerkt wird das
  // Paar, nicht die Sache.
  assert.ok(reaktionFuer(stand, 'mira', vier), 'ein zweiter Geist schweigt dazu');
  assert.equal(schonGesagt(stand, 'mira', 'licht'), false);

  // Und zu einer anderen Sache sagt Bruno weiter etwas.
  assert.ok(reaktionFuer(stand, 'bruno', ['bench']));
});

test('ohne zugeordnete Deko sagt niemand etwas', function () {
  const stand = emptyDekoreaktion();
  // Ein Zaunpfahl ohne Gruppe, ein Gegenstand, der keine Deko ist, nichts.
  assert.equal(reaktionFuer(stand, 'bruno', []), null);
  assert.equal(reaktionFuer(stand, 'bruno', ['wood', 'berry']), null);
  assert.equal(reaktionFuer(stand, 'bruno', null), null);
  assert.equal(gruppeVon('wood'), null);
  assert.equal(gruppeVon('bench'), 'sitzen');
});

test('dieselbe Lage ergibt zweimal dieselbe Antwort', function () {
  // Kein Zufall: Wer zweimal hinsieht, soll nicht zwei verschiedene Sätze
  // bekommen und sich fragen, was er übersehen hat.
  const stand = emptyDekoreaktion();
  const stuecke = ['bench', 'lantern', 'pond', 'windchime'];
  const a = reaktionFuer(stand, 'tobi', stuecke);
  const b = reaktionFuer(stand, 'tobi', stuecke);
  assert.deepEqual(a, b);
  // Und die Reihenfolge der Stücke entscheidet, nicht ein Wurf.
  assert.equal(a.gruppe, 'sitzen');
});

test('der Stand zählt Paare', function () {
  let stand = emptyDekoreaktion();
  assert.equal(reaktionenStand(stand), 0);
  stand = merke(stand, 'bruno', 'licht');
  stand = merke(stand, 'mira', 'licht');
  stand = merke(stand, 'bruno', 'sitzen');
  assert.equal(reaktionenStand(stand), 3);
  assert.equal(reaktionenStand(null), 0);
  assert.equal(schluessel('bruno', 'licht'), 'bruno:licht');
});
