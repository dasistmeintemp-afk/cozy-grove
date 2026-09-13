/**
 * Der Tagesrückblick – zählt er, was er zeigt?
 *
 * Der Anlass war ein echter Fund, und zwar dreimal derselbe: Das Spiel zählte
 * beim Schlafen mit, wie viele Gerichte gekocht, wie viele Wünsche erfüllt
 * und wie viele Reihen im Fundbuch voll geworden waren – und zeigte nichts
 * davon. Die Strichliste stand an drei Stellen (angelegt, angezeigt, geprüft
 * ob sich das Fenster lohnt), und die drei waren auseinandergelaufen.
 *
 * Eine Reihe im Fundbuch vollzumachen ist das Seltenste, was an einem Tag
 * passieren kann. Am nächsten Morgen stand kein Wort davon da.
 *
 * Dieser Test ist die Zusicherung dagegen: **Was gezählt wird, wird auch
 * gezeigt.** Er liest dafür den Quelltext von `game.js` – anders ist nicht
 * herauszubekommen, welche Striche das Spiel überhaupt macht.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  DAYBOOK_ROWS, DAYBOOK_KEYS, emptyDaybook, daybookHasContent,
} from '../../src/game/daybook.js';

const GAME_SRC = readFileSync(
  fileURLToPath(new URL('../../src/game/game.js', import.meta.url)), 'utf8');

/** Alle Felder, auf die `_note(...)` im Spiel wirklich einen Strich macht. */
function gezaehlteFelder() {
  const raus = [];
  const re = /_note\('([a-zA-Z]+)'/g;
  let m;
  while ((m = re.exec(GAME_SRC))) if (raus.indexOf(m[1]) < 0) raus.push(m[1]);
  return raus;
}

/* ---------------- Zählen und Zeigen ---------------- */

test('Jeder Strich, den das Spiel macht, steht auch im Rückblick', () => {
  // Genau das war der Fehler: „gekocht", „wish" und „sets" wurden gezählt
  // und nirgends gezeigt.
  const gezaehlt = gezaehlteFelder();
  assert.ok(gezaehlt.length >= 10,
    'nur ' + gezaehlt.length + ' Striche gefunden – der Quelltext wurde nicht gelesen');
  const ohne = gezaehlt.filter((f) => DAYBOOK_KEYS.indexOf(f) < 0);
  assert.deepEqual(ohne, [],
    'wird gezählt, aber nie angezeigt: ' + ohne.join(', '));
});

test('Und umgekehrt: keine Zeile, die nie einen Strich bekommt', () => {
  // Eine Zeile, die niemals erscheint, ist toter Text im Fenster.
  const gezaehlt = gezaehlteFelder();
  const nie = DAYBOOK_KEYS.filter((k) => gezaehlt.indexOf(k) < 0);
  assert.deepEqual(nie, [],
    'steht im Rückblick, wird aber nie gezählt: ' + nie.join(', '));
});

test('Jede Zeile hat Symbol, Einzahl und Mehrzahl', () => {
  // „1 Bitten erfüllt" ist der Satz, an dem ein sorgfältiges Spiel auffliegt.
  for (const z of DAYBOOK_ROWS) {
    assert.ok(z.key, 'Zeile ohne Schlüssel');
    assert.ok(/^icon_[a-z_0-9]+$/.test(z.icon), z.key + ': „' + z.icon + '" ist kein Symbolname');
    assert.ok(z.ein && z.mehr, z.key + ': Einzahl oder Mehrzahl fehlt');
    assert.ok(z.ein.length <= 40 && z.mehr.length <= 40, z.key + ': zu lang fürs Fenster');
  }
});

test('Keine zwei Zeilen zählen dasselbe', () => {
  const gesehen = Object.create(null);
  for (const z of DAYBOOK_ROWS) {
    assert.ok(!gesehen[z.key], z.key + ' steht zweimal in der Liste');
    gesehen[z.key] = 1;
  }
  const texte = Object.create(null);
  for (const z of DAYBOOK_ROWS) {
    assert.ok(!texte[z.mehr], 'zwei Zeilen heißen „' + z.mehr + '"');
    texte[z.mehr] = 1;
  }
});

/* ---------------- Die frische Liste ---------------- */

test('Eine frische Strichliste steht auf lauter Nullen', () => {
  const b = emptyDaybook(7, 0.25);
  assert.equal(b.day, 7);
  assert.equal(b.colorStart, 0.25);
  for (const k of DAYBOOK_KEYS) assert.equal(b[k], 0, k + ' fängt nicht bei null an');
  // Kein Prototyp, an dem `toString` hängt.
  assert.equal(b.helped.toString, undefined);
});

test('Ein Tag ohne Strich macht kein Fenster auf', () => {
  // Ein Rückblick auf lauter Nullen wäre ein Vorwurf, und davon gibt es hier
  // keine.
  assert.equal(daybookHasContent(null), false);
  assert.equal(daybookHasContent(emptyDaybook(1, 0.4)), false);
});

test('Ein einziger Strich genügt – bei jeder Sorte', () => {
  // Vorher fehlten hier vier Sorten: Wer nur ein Beet goss, einen Wunsch
  // erfüllte, eine Reihe vollmachte oder einen Meilenstein erreichte, bekam
  // kein Fenster zu sehen.
  for (const k of DAYBOOK_KEYS) {
    const b = emptyDaybook(1, 0.4);
    b[k] = 1;
    assert.equal(daybookHasContent(b), true, 'ein Strich bei ' + k + ' reicht nicht');
  }
});

test('Auch nur Farbe reicht', () => {
  // Die Insel kann über Nacht bunter werden, ohne dass jemand einen Strich
  // gemacht hat.
  const b = emptyDaybook(1, 0.40);
  b.colorEnd = 0.41;
  assert.equal(daybookHasContent(b), true);
  b.colorEnd = 0.4005;   // unter der Schwelle: zu wenig für eine Meldung
  assert.equal(daybookHasContent(b), false);
});
