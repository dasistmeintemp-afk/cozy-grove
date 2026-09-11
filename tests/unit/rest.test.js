/**
 * Ausruhen – Sitzen, und was es bringt.
 *
 * Das Besondere an diesem Teil ist, dass er nichts einbringt: keine Münzen,
 * keine Glut, keinen Fortschritt. Prüfbar ist trotzdem genug, und zwar
 * hauptsächlich zweierlei:
 *
 *   1. Dass die Sitzmöbel dieselben sind, die der Rest des Spiels für
 *      Sitzmöbel hält – die Wünsche, das Haustier, der Katalog.
 *   2. Dass die Gedanken zum Ort passen und sich nicht wiederholen.
 *
 * Der zweite Punkt ist der, an dem so etwas sonst kaputtgeht: Eine Liste mit
 * Sätzen, die niemand nachzählt, sagt nach dem dritten Mal Sitzen immer
 * dasselbe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SITZ_HOEHE, SITZ_IDS, istSitzplatz, sitzHoehe, HALTEN_SEK,
  ERSTER_GEDANKE, GEDANKE_ALLE, GEDANKE_MERK, ZAHM_RADIUS, ZAHM_ABSTAND,
  GEWICHT, DEKO_GEDANKE, GEDANKEN, gruppenFuer, waehleGedanke, merkeGedanke,
  ABEND_AB, MORGEN_BIS,
} from '../../src/game/rest.js';
import { DayCycle, DAY_START } from '../../src/game/daycycle.js';
import { SORTEN } from '../../src/game/wishes.js';
import { RUHE_DEKO } from '../../src/game/pet.js';
import { getItem } from '../../src/game/items.js';
import { ORTE } from '../../src/game/wishes.js';
import { SEASON_IDS } from '../../src/game/calendar.js';

/* ---------------- Die Möbel ---------------- */

test('Sitzmöbel sind genau die, die die Wünsche „Platz zum Sitzen" nennen', () => {
  // Zwei Listen, die auseinanderlaufen können, wären ein Wunsch nach einer
  // Bank, auf die man sich nicht setzen kann.
  assert.deepEqual(SITZ_IDS.slice().sort(), SORTEN.sitz.items.slice().sort());
});

test('Jedes Sitzmöbel gibt es wirklich – und das Tier legt sich auch darauf', () => {
  for (const id of SITZ_IDS) {
    assert.ok(getItem(id), id + ' ist gar kein Gegenstand');
    assert.ok(RUHE_DEKO[id], id + ': Seli sitzt darauf, das Tier nicht');
  }
});

test('Die Sitzhöhen liegen im Bild, nicht daneben', () => {
  for (const id of SITZ_IDS) {
    const h = sitzHoehe(id);
    assert.ok(h > 0, id + ': Sitzhöhe 0 – sie säße im Boden');
    // Die höchste Sitzfläche im Spiel ist das Schaukelbrett bei 93 Punkten.
    // Alles darüber wäre Schweben.
    assert.ok(h <= 93, id + ': ' + h + ' Punkte über dem Boden ist zu hoch');
  }
});

test('Die Schaukel sitzt höher als die Bank', () => {
  // Die Gegenprobe zur Tabelle: Wären alle Zahlen gleich, fiele es keinem
  // Test von oben auf, und Seli klebte auf jedem Möbel gleich hoch.
  assert.ok(SITZ_HOEHE.swing > SITZ_HOEHE.chair, 'Schaukel nicht über dem Stuhl');
  assert.ok(SITZ_HOEHE.chair > SITZ_HOEHE.bench, 'Stuhl nicht über der Bank');
});

test('Alles andere ist kein Sitzplatz', () => {
  assert.equal(istSitzplatz('bench'), true);
  for (const id of ['lantern', 'fence', 'rug', 'table', 'pond', 'scarecrow']) {
    assert.equal(istSitzplatz(id), false, id + ' gilt als Sitzmöbel');
  }
  assert.equal(istSitzplatz(undefined), false);
  assert.equal(istSitzplatz('toString'), false, 'Object.prototype schlägt durch');
});

test('Halten dauert länger als ein Tastendruck, aber keine Ewigkeit', () => {
  assert.ok(HALTEN_SEK >= 0.3, 'darunter packt man beim Aufstehen versehentlich ein');
  assert.ok(HALTEN_SEK <= 1.2, 'darüber hält man die Taste und glaubt, es geht nicht');
});

test('Die Tiere kommen näher, aber nicht auf die Nase', () => {
  assert.ok(ZAHM_ABSTAND > 0, 'ohne Abstand fliegen sie in Seli hinein');
  assert.ok(ZAHM_RADIUS > ZAHM_ABSTAND * 2,
    'der Anziehungskreis muss deutlich größer sein als der Freiraum darin');
});

/* ---------------- Die Sätze ---------------- */

test('Jede Gruppe hat mehr als einen Satz', () => {
  for (const id in GEDANKEN) {
    assert.ok(Array.isArray(GEDANKEN[id]), id + ' ist keine Liste');
    assert.ok(GEDANKEN[id].length >= 2,
      id + ' hat nur ' + GEDANKEN[id].length + ' Satz – der käme jedes Mal');
  }
});

test('Kein Satz steht zweimal da', () => {
  const gesehen = Object.create(null);
  for (const id in GEDANKEN) {
    for (const satz of GEDANKEN[id]) {
      assert.ok(!gesehen[satz],
        'derselbe Satz in „' + gesehen[satz] + '" und „' + id + '": ' + satz);
      gesehen[satz] = id;
    }
  }
});

test('Die Sätze sind kurz und ganz', () => {
  for (const id in GEDANKEN) {
    for (const satz of GEDANKEN[id]) {
      assert.ok(satz.length <= 90, id + ': zu lang für eine Sprechblase – ' + satz);
      assert.ok(/[.!?…]$/.test(satz), id + ': hört mitten im Satz auf – ' + satz);
    }
  }
});

test('Jedes Sitzmöbel hat eigene Sätze', () => {
  for (const id of SITZ_IDS) {
    assert.ok(GEDANKEN[id] && GEDANKEN[id].length,
      id + ': keine eigenen Gedanken, man säße stumm darauf');
  }
});

test('Jede Jahreszeit und jeder Ort der Wünsche hat Sätze', () => {
  for (const id of SEASON_IDS) {
    assert.ok(GEDANKEN[id], 'keine Gedanken für ' + id);
  }
  // „beiMir" ist kein Ort für sich, sondern sieben – der gehört zur Gruppe
  // „geist" und hat deshalb keinen eigenen Eintrag.
  for (const id in ORTE) {
    if (ORTE[id].nameFuer) continue;
    assert.ok(GEDANKEN[id], 'keine Gedanken für den Ort ' + id);
  }
});

test('Jede Deko, die einen Gedanken auslöst, gibt es auch', () => {
  for (const id in DEKO_GEDANKE) {
    assert.ok(getItem(id), id + ' ist kein Gegenstand');
    const gruppe = DEKO_GEDANKE[id];
    assert.ok(GEDANKEN[gruppe], id + ' zeigt auf die Gruppe „' + gruppe + '", die es nicht gibt');
  }
});

/* ---------------- Die Auswahl ---------------- */

const LAGE_LEER = {};
const LAGE_VOLL = {
  moebel: 'bench', geist: 'mira', deko: ['firebowl', 'lantern'],
  wetter: 'regen', nacht: true, orte: ['wasser', 'lager'], jahreszeit: 'autumn',
};

test('Ohne jede Angabe kommt trotzdem ein Satz', () => {
  // Der Fall zählt: Am ersten Tag steht die Bank irgendwo im Nirgendwo, das
  // Wetter ist klar, es ist Mittag. Ein leerer Gedanke wäre eine leere Blase.
  const g = gruppenFuer(LAGE_LEER);
  assert.deepEqual(g.map((x) => x.id), ['immer']);
  assert.ok(waehleGedanke(LAGE_LEER, [], () => 0.5).length > 0);
});

test('Was da ist, kommt in die Auswahl – und nichts doppelt', () => {
  const ids = gruppenFuer(LAGE_VOLL).map((x) => x.id);
  for (const soll of ['bench', 'geist', 'feuer', 'licht', 'regen', 'nacht',
    'wasser', 'lager', 'autumn', 'immer']) {
    assert.ok(ids.indexOf(soll) >= 0, soll + ' fehlt in der Auswahl');
  }
  assert.equal(new Set(ids).size, ids.length, 'eine Gruppe steht zweimal drin');
});

test('Zwei Lampen nebeneinander zählen als eine Gruppe', () => {
  const ids = gruppenFuer({ deko: ['lantern', 'paperlamp', 'stringlights'] })
    .map((x) => x.id);
  assert.deepEqual(ids, ['licht', 'immer']);
});

test('Unbekannte Namen stören nicht', () => {
  const ids = gruppenFuer({ moebel: 'gibtsnicht', orte: ['mond'], jahreszeit: 'nie' })
    .map((x) => x.id);
  assert.deepEqual(ids, ['immer']);
});

test('Den Abend gibt es im Spieltag wirklich', () => {
  // Die stillste Art, ein Feature zu verlieren: Der Tag läuft von 6 bis 2
  // Uhr nachts, dunkel wird es um halb acht. Läge `ABEND_AB` dahinter, käme
  // kein einziger Abendsatz je vor – und niemand würde es je bemerken.
  const tag = new DayCycle();
  assert.ok(ABEND_AB > DAY_START, 'der Abend läge vor dem Aufstehen');
  tag.hour = ABEND_AB;
  assert.equal(tag.isDark(), false,
    'um ' + ABEND_AB + ' Uhr ist es schon dunkel – dann gilt immer „nachts"');
  // Und die Gegenprobe: Irgendwann danach wird es wirklich dunkel.
  tag.hour = ABEND_AB + 4;
  assert.equal(tag.isDark(), true, 'es wird nach dem Abend gar nicht mehr Nacht');
});

test('Abends nur abends – und nachts zählt die Nacht', () => {
  assert.ok(gruppenFuer({ abend: true }).some((g) => g.id === 'abend'));
  const nachts = gruppenFuer({ nacht: true, abend: true }).map((g) => g.id);
  assert.ok(nachts.indexOf('nacht') >= 0, 'nachts fehlt die Nacht');
  assert.ok(nachts.indexOf('abend') < 0, 'nachts und abends gleichzeitig');
});

test('Es gibt immer genau eine Tageszeit', () => {
  // Sonst käme zweimal hintereinander ein Satz über dieselbe Stunde, einmal
  // als Nacht und einmal als Abend.
  const zeiten = ['morgen', 'nacht', 'abend'];
  for (const lage of [{ morgen: true, nacht: true, abend: true },
    { nacht: true, abend: true }, { morgen: true }, { nacht: true },
    { abend: true }, {}]) {
    const ids = gruppenFuer(lage).map((g) => g.id).filter((id) => zeiten.indexOf(id) >= 0);
    assert.ok(ids.length <= 1,
      JSON.stringify(lage) + ' ergibt mehrere Tageszeiten: ' + ids.join(', '));
  }
  assert.deepEqual(gruppenFuer({ morgen: true, nacht: true }).map((g) => g.id)
    .filter((id) => zeiten.indexOf(id) >= 0), ['morgen'],
  'der Morgen muss die Nacht schlagen, nicht umgekehrt');
});

test('Die Stunde, zu der man aufwacht, ist Morgen und nicht Nacht', () => {
  // Der Fehler, den eine laufende Sitzung gefunden hat und kein Test:
  // `isDark()` ist vor 6:48 Uhr wahr – fürs Licht richtig, denn da dämmert
  // es erst. Seli sagte deshalb um 06:14 Uhr „Die Sterne stehen still".
  // Die erste Dreiviertelstunde JEDES Tages war Nacht.
  const tag = new DayCycle();
  assert.equal(tag.hour, DAY_START, 'der Tag beginnt woanders als gedacht');
  assert.equal(tag.isDark(), true,
    'ohne diese Voraussetzung prüft der Rest hier nichts');
  assert.ok(DAY_START < MORGEN_BIS,
    'beim Aufwachen (' + DAY_START + ' Uhr) gilt der Morgen nicht');

  // Und die Gegenprobe: Irgendwann nach dem Morgen wird es wirklich Nacht.
  tag.hour = MORGEN_BIS + 12;
  assert.equal(tag.isDark(), true, 'nach dem Morgen bleibt es für immer hell');
});

test('Der Morgen hat eigene Sätze, und sie sind keine Nachtsätze', () => {
  assert.ok(GEDANKEN.morgen && GEDANKEN.morgen.length >= 2, 'keine Morgensätze');
  for (const satz of GEDANKEN.morgen) {
    assert.ok(!/nacht|stern/i.test(satz), 'das ist ein Nachtsatz: ' + satz);
  }
});

test('Das Besondere wiegt schwerer als das Allgemeine', () => {
  assert.ok(GEWICHT.geist > GEWICHT.immer);
  assert.ok(GEWICHT.deko > GEWICHT.jahreszeit);
  assert.ok(GEWICHT.wetter > GEWICHT.immer);
});

test('Der Geist neben der Bank kommt öfter dran als das Allgemeine', () => {
  // Die Gegenprobe zu den Gewichten: Ohne sie gewönne die größte Gruppe,
  // und das ist „immer". Gemessen statt behauptet.
  let rnd = 0;
  const wurf = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  const zaehler = Object.create(null);
  for (let i = 0; i < 2000; i++) {
    const satz = waehleGedanke({ geist: 'mira' }, [], wurf);
    const gruppe = GEDANKEN.geist.indexOf(satz) >= 0 ? 'geist' : 'immer';
    zaehler[gruppe] = (zaehler[gruppe] || 0) + 1;
  }
  assert.ok(zaehler.geist > zaehler.immer * 2,
    'der Geist kommt zu selten: ' + JSON.stringify(zaehler));
  assert.ok(zaehler.immer > 0, 'das Allgemeine kommt gar nicht mehr vor');
});

test('Ein eben gesagter Satz kommt nicht sofort wieder', () => {
  // Mit nur einer Gruppe ist das am schärfsten prüfbar: Drei Sätze, zwei
  // davon gemieden – es muss zwingend der dritte kommen.
  const alle = GEDANKEN.bench;
  const gemieden = [alle[0], alle[1]];
  for (let i = 0; i < 40; i++) {
    const satz = waehleGedanke({ moebel: 'bench', keineOrte: true }, gemieden,
      () => i / 40);
    if (GEDANKEN.bench.indexOf(satz) < 0) continue;   // „immer" darf kommen
    assert.equal(satz, alle[2], 'ein gemiedener Satz kam zurück: ' + satz);
  }
});

test('Ist alles gesagt, kommt lieber eine Wiederholung als nichts', () => {
  const alles = [];
  for (const id in GEDANKEN) for (const s of GEDANKEN[id]) alles.push(s);
  const satz = waehleGedanke(LAGE_VOLL, alles, () => 0.42);
  assert.ok(satz && alles.indexOf(satz) >= 0, 'gar kein Satz mehr übrig');
});

test('Das Gedächtnis merkt sich das Neueste zuerst und vergisst das Älteste', () => {
  let liste = [];
  for (let i = 0; i < GEDANKE_MERK + 5; i++) liste = merkeGedanke(liste, 'Satz ' + i);
  assert.equal(liste.length, GEDANKE_MERK, 'das Gedächtnis wächst unbegrenzt');
  assert.equal(liste[0], 'Satz ' + (GEDANKE_MERK + 4), 'das Neueste steht nicht vorn');
  assert.ok(liste.indexOf('Satz 0') < 0, 'das Älteste ist noch da');
});

test('Derselbe Satz steht danach nur einmal im Gedächtnis', () => {
  let liste = merkeGedanke(['a', 'b', 'c'], 'c');
  assert.deepEqual(liste, ['c', 'a', 'b']);
  liste = merkeGedanke(liste, 'c');
  assert.deepEqual(liste, ['c', 'a', 'b'], 'c steht jetzt zweimal drin');
});

test('Der erste Gedanke lässt auf sich warten, die nächsten länger', () => {
  assert.ok(ERSTER_GEDANKE >= 2, 'käme sofort beim Hinsetzen');
  assert.ok(ERSTER_GEDANKE <= 8, 'so lange bleibt niemand sitzen, um zu prüfen, ob was kommt');
  assert.ok(GEDANKE_ALLE > ERSTER_GEDANKE, 'danach soll es seltener werden, nicht öfter');
});

test('In tausend Zügen wiederholt sich nichts unmittelbar', () => {
  // Die eigentliche Frage bei so einer Liste: Hört man sich selbst zu?
  let rnd = 7;
  const wurf = () => { rnd = (rnd * 1103515245 + 12345) % 2147483648; return rnd / 2147483648; };
  let letzte = [];
  let vorher = null;
  for (let i = 0; i < 1000; i++) {
    const satz = waehleGedanke(LAGE_VOLL, letzte, wurf);
    assert.notEqual(satz, vorher, 'zweimal hintereinander derselbe Satz: ' + satz);
    vorher = satz;
    letzte = merkeGedanke(letzte, satz);
  }
});
