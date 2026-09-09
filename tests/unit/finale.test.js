/**
 * Der letzte Abend.
 *
 * Die Zusicherung: Der Abschluss lässt sich nicht verpassen. Jeder Geist
 * hat einen Satz, der Ring am Feuer wartet, und wer alle gehört hat, bekommt
 * das letzte Wort. Danach geht es weiter – ein gemütliches Spiel macht nicht
 * zu, nur weil man fertig ist.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FINALE_LINES, FINALE_CLOSE, FINALE_COUNT, finaleLine, stillSilent, allHeard, circleSpots,
} from '../../src/game/finale.js';
import { SPIRITS, SPIRIT_IDS } from '../../src/game/spirits.js';
import { MILESTONES } from '../../src/game/milestones.js';

test('Jeder Geist hat genau einen Schlusssatz', () => {
  for (const id of SPIRIT_IDS) {
    const satz = finaleLine(id);
    assert.ok(satz, id + ' sagt zum Schluss nichts');
    assert.ok(satz.length > 30, id + ': zu kurz für einen Abschluss');
    assert.ok(satz.length < 130, id + ': zu lang – das Spiel ist ein Symbolspiel');
  }
  assert.equal(FINALE_COUNT, SPIRIT_IDS.length);
  // Und keiner sagt dasselbe wie ein anderer
  const saetze = SPIRIT_IDS.map(finaleLine);
  assert.equal(new Set(saetze).size, saetze.length, 'zwei Geister sagen dasselbe');
  // Kein Satz für einen Geist, den es nicht gibt
  for (const id of Object.keys(FINALE_LINES)) {
    assert.ok(SPIRITS[id], 'Schlusssatz für unbekannten Geist ' + id);
  }
  assert.equal(finaleLine('gibtesnicht'), null);
});

test('Das letzte Wort lässt die Insel offen', () => {
  assert.ok(FINALE_CLOSE.length > 30);
  // Kein „Ende", kein „Vorbei": Danach darf man weiterspielen, und das soll
  // der Satz auch sagen.
  assert.ok(/bleib|weiter|immer/i.test(FINALE_CLOSE),
    'der Schlusssatz muss die Insel offen lassen: ' + FINALE_CLOSE);
});

test('Gehört ist gehört – und erst alle zählen', () => {
  const heard = Object.create(null);
  assert.equal(allHeard(heard), false);
  assert.equal(stillSilent(heard).length, FINALE_COUNT);

  for (let i = 0; i < SPIRIT_IDS.length - 1; i++) heard[SPIRIT_IDS[i]] = 3;
  assert.equal(allHeard(heard), false, 'einer fehlt noch');
  assert.deepEqual(stillSilent(heard), [SPIRIT_IDS[SPIRIT_IDS.length - 1]]);

  heard[SPIRIT_IDS[SPIRIT_IDS.length - 1]] = 3;
  assert.equal(allHeard(heard), true);
  assert.deepEqual(stillSilent(heard), []);
  assert.equal(allHeard(null), false, 'ohne Angaben hat niemand gesprochen');
});

test('Der Ring um das Feuer ist ein Ring', () => {
  const feuer = { x: 1000, y: 1000 };
  const plaetze = circleSpots(feuer, 7, 200);
  assert.equal(plaetze.length, 7);
  // Alle etwa gleich weit weg (y gestaucht, das ist die Aufsicht)
  for (const p of plaetze) {
    const dx = p.x - feuer.x;
    const dy = (p.y - feuer.y) / 0.72;
    const d = Math.sqrt(dx * dx + dy * dy);
    assert.ok(Math.abs(d - 200) < 1, 'Abstand ' + Math.round(d));
  }
  // Und keiner steht auf dem anderen
  for (let i = 0; i < plaetze.length; i++) {
    for (let j = i + 1; j < plaetze.length; j++) {
      const dx = plaetze[i].x - plaetze[j].x;
      const dy = plaetze[i].y - plaetze[j].y;
      assert.ok(dx * dx + dy * dy > 60 * 60, 'zwei Plätze zu dicht beieinander');
    }
  }
  // Niemand steht genau vor dem Feuer (dort läuft man hin)
  for (const p of plaetze) {
    assert.ok(Math.abs(p.x - feuer.x) > 20 || p.y < feuer.y,
      'ein Platz liegt genau vor dem Feuer');
  }
});

test('Der Abschluss hängt am letzten Meilenstein', () => {
  const letzter = MILESTONES[MILESTONES.length - 1];
  assert.equal(letzter.id, 'ganz', 'der Abschluss hängt an "ganz"');
  assert.equal(letzter.at, 1);
});
