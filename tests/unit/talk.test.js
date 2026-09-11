/**
 * Geplauder – dass die Geister wirklich sieben verschiedene sind.
 *
 * Bei einer Textsammlung geht selten die Technik kaputt. Kaputt gehen die
 * Sätze: Einer fehlt, einer steht zweimal da, einer klingt wie der Nachbar,
 * einer erteilt heimlich einen Auftrag. Genau danach sucht diese Datei.
 *
 * Der schärfste Test hier ist der auf doppelte Sätze ÜBER ALLE GEISTER
 * hinweg. Er hält fest, was das Ganze überhaupt soll: Wenn Bruno und Nelly
 * dasselbe über Regen sagen dürfen, hätte man sich das Schreiben sparen und
 * eine gemeinsame Liste nehmen können.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAUDEREI, PLAUDER_IDS, GEWICHT, PLAUDER_MERK, FREUND_AB,
  GEMUETLICH_AB, KAHL_BIS, gruppenFuer, saetzeFuer, waehlePlauderei,
  merkePlauderei,
} from '../../src/game/talk.js';
import { SPIRITS, SPIRIT_IDS, friendshipLevel } from '../../src/game/spirits.js';
import { SEASON_IDS } from '../../src/game/calendar.js';
import { COSY_MAX } from '../../src/game/cosiness.js';

/* ---------------- Vollständigkeit ---------------- */

test('Jeder Geist plaudert – und keiner zu viel', () => {
  assert.deepEqual(PLAUDER_IDS.slice().sort(), SPIRIT_IDS.slice().sort());
});

test('Alle Geister haben dieselben Gelegenheiten', () => {
  // Sonst schweigt ausgerechnet einer beim Schnee, und das merkt man erst
  // im dritten Winter.
  const soll = Object.keys(PLAUDEREI[SPIRIT_IDS[0]]).sort();
  for (const id of SPIRIT_IDS) {
    assert.deepEqual(Object.keys(PLAUDEREI[id]).sort(), soll,
      id + ' hat andere Gelegenheiten als ' + SPIRIT_IDS[0]);
  }
});

test('Jede Gelegenheit hat mehr als einen Satz', () => {
  for (const id of SPIRIT_IDS) {
    for (const gruppe in PLAUDEREI[id]) {
      const n = PLAUDEREI[id][gruppe].length;
      assert.ok(n >= 2, id + '/' + gruppe + ' hat nur ' + n + ' Satz');
    }
  }
});

test('Jedes Wetter, jede Jahreszeit, beide Tageszeiten sind abgedeckt', () => {
  const noetig = ['regen', 'nebel', 'schnee', 'morgen', 'nacht',
    'freund', 'gemuetlich', 'kahl'].concat(SEASON_IDS);
  for (const id of SPIRIT_IDS) {
    for (const gruppe of noetig) {
      assert.ok(saetzeFuer(id, gruppe).length > 0,
        id + ' sagt nichts zu „' + gruppe + '"');
    }
  }
});

/* ---------------- Sieben Stimmen, nicht eine ---------------- */

test('Kein Satz steht zweimal da – auch nicht bei zwei verschiedenen Geistern', () => {
  const gesehen = Object.create(null);
  for (const id of SPIRIT_IDS) {
    for (const gruppe in PLAUDEREI[id]) {
      for (const satz of PLAUDEREI[id][gruppe]) {
        assert.ok(!gesehen[satz],
          'derselbe Satz bei ' + gesehen[satz] + ' und ' + id + '/' + gruppe + ': ' + satz);
        gesehen[satz] = id + '/' + gruppe;
      }
    }
  }
});

test('Die Begrüßungen kommen aus spirits.js und werden nicht abgeschrieben', () => {
  // Einundzwanzig Zeilen standen dort und wurden von nirgendwo angezeigt.
  // Jetzt sind sie der Grundstock – aber eben DIESELBEN, nicht eine Kopie.
  for (const id of SPIRIT_IDS) {
    assert.deepEqual(saetzeFuer(id, 'immer'), SPIRITS[id].lines.greet,
      id + ': „immer" ist nicht die Begrüßung aus spirits.js');
    assert.ok(SPIRITS[id].lines.greet.length >= 2, id + ' hat kaum Begrüßungen');
  }
});

test('Die Sätze sind kurz und ganz', () => {
  for (const id of SPIRIT_IDS) {
    for (const gruppe in PLAUDEREI[id]) {
      for (const satz of PLAUDEREI[id][gruppe]) {
        assert.ok(satz.length <= 70,
          id + '/' + gruppe + ': zu lang für eine Sprechblase – ' + satz);
        assert.ok(/[.!?…]$/.test(satz),
          id + '/' + gruppe + ': hört mitten im Satz auf – ' + satz);
      }
    }
  }
});

test('Niemand erteilt beim Plaudern heimlich einen Auftrag', () => {
  // Die zweite Regel des Moduls, als Prüfung: Geplauder ist kein versteckter
  // Hinweis. Ein „Bring mir mal ..." wäre eine Aufgabe ohne Aufgabenfenster,
  // und der Spieler liefe los, ohne dass etwas mitzählt.
  const verdaechtig = /\b(bring|hol|sammle|besorg|solltest|könntest du|kannst du mir)\b/i;
  for (const id of SPIRIT_IDS) {
    for (const gruppe in PLAUDEREI[id]) {
      for (const satz of PLAUDEREI[id][gruppe]) {
        assert.ok(!verdaechtig.test(satz),
          id + '/' + gruppe + ' klingt nach Auftrag: ' + satz);
      }
    }
  }
});

test('Zusammen ist das deutlich mehr, als vorher gesprochen wurde', () => {
  // Vorher: vier Zeilengruppen je Geist, davon wurde beim „nichts zu tun"
  // GENAU EINE angezeigt. Die Zahl hier ist der eigentliche Zweck der Datei.
  let n = 0;
  for (const id of SPIRIT_IDS) {
    for (const gruppe in PLAUDEREI[id]) n += PLAUDEREI[id][gruppe].length;
  }
  assert.ok(n >= 140, 'nur ' + n + ' Sätze – das trägt keine dreißig Tage');
});

/* ---------------- Die Auswahl ---------------- */

const LAGE_VOLL = {
  wetter: 'regen', jahreszeit: 'autumn', nacht: true,
  freund: true, gemuetlich: true,
};

test('Was gerade zutrifft, kommt in die Auswahl', () => {
  const ids = gruppenFuer('mira', LAGE_VOLL).map((g) => g.id);
  for (const soll of ['regen', 'autumn', 'nacht', 'freund', 'gemuetlich', 'immer']) {
    assert.ok(ids.indexOf(soll) >= 0, soll + ' fehlt');
  }
  assert.equal(new Set(ids).size, ids.length, 'eine Gruppe steht zweimal drin');
});

test('Ohne alles bleibt die Begrüßung', () => {
  assert.deepEqual(gruppenFuer('bruno', {}).map((g) => g.id), ['immer']);
  assert.ok(waehlePlauderei('bruno', {}, [], () => 0.5).length > 0);
});

test('Es gibt immer genau eine Tageszeit und höchstens eine Deko-Lage', () => {
  const zeiten = ['morgen', 'nacht'];
  const deko = ['gemuetlich', 'kahl'];
  for (const lage of [{ morgen: true, nacht: true }, { nacht: true },
    { morgen: true }, { gemuetlich: true, kahl: true }, { kahl: true }, {}]) {
    const ids = gruppenFuer('nelly', lage).map((g) => g.id);
    assert.ok(ids.filter((i) => zeiten.indexOf(i) >= 0).length <= 1,
      JSON.stringify(lage) + ': mehrere Tageszeiten');
    assert.ok(ids.filter((i) => deko.indexOf(i) >= 0).length <= 1,
      JSON.stringify(lage) + ': gemütlich UND kahl');
  }
  const beides = gruppenFuer('nelly', { morgen: true, nacht: true }).map((g) => g.id);
  assert.ok(beides.indexOf('morgen') >= 0 && beides.indexOf('nacht') < 0,
    'der Morgen muss die Nacht schlagen');
  const dekoBeides = gruppenFuer('nelly', { gemuetlich: true, kahl: true }).map((g) => g.id);
  assert.ok(dekoBeides.indexOf('gemuetlich') >= 0 && dekoBeides.indexOf('kahl') < 0,
    'gemütlich muss kahl schlagen');
});

test('Ein unbekannter Geist bringt nichts zum Absturz', () => {
  assert.deepEqual(gruppenFuer('niemand', LAGE_VOLL).map((g) => g.id), []);
  assert.equal(waehlePlauderei('niemand', LAGE_VOLL, [], () => 0.5), '');
  assert.deepEqual(saetzeFuer('niemand', 'regen'), []);
  assert.deepEqual(saetzeFuer('mira', 'gibtsnicht'), []);
});

test('Das Wetter kommt öfter dran als die Jahreszeit', () => {
  // Gemessen, nicht behauptet: Ohne Gewichte gewönne die Gruppe mit den
  // meisten Sätzen, und das wäre Zufall statt Absicht.
  assert.ok(GEWICHT.wetter > GEWICHT.jahreszeit);
  let rnd = 3;
  const wurf = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  const zaehler = { regen: 0, autumn: 0, andere: 0 };
  for (let i = 0; i < 3000; i++) {
    const satz = waehlePlauderei('kiesel', { wetter: 'regen', jahreszeit: 'autumn' }, [], wurf);
    if (PLAUDEREI.kiesel.regen.indexOf(satz) >= 0) zaehler.regen++;
    else if (PLAUDEREI.kiesel.autumn.indexOf(satz) >= 0) zaehler.autumn++;
    else zaehler.andere++;
  }
  assert.ok(zaehler.regen > zaehler.autumn * 1.5,
    'Regen kommt zu selten: ' + JSON.stringify(zaehler));
  assert.ok(zaehler.autumn > 0, 'die Jahreszeit kommt gar nicht mehr vor');
});

/* ---------------- Das Gedächtnis ---------------- */

test('Ein eben gesagter Satz kommt nicht sofort wieder', () => {
  const alle = PLAUDEREI.tobi.schnee;
  const gemieden = alle.slice(0, alle.length - 1);
  for (let i = 0; i < 40; i++) {
    const satz = waehlePlauderei('tobi', { wetter: 'schnee' }, gemieden, () => i / 40);
    if (alle.indexOf(satz) < 0) continue;   // die Begrüßung darf kommen
    assert.equal(satz, alle[alle.length - 1], 'ein gemiedener Satz kam zurück: ' + satz);
  }
});

test('Ist alles gesagt, kommt lieber eine Wiederholung als Schweigen', () => {
  const alles = [];
  for (const gruppe in PLAUDEREI.wanda) alles.push(...PLAUDEREI.wanda[gruppe]);
  alles.push(...SPIRITS.wanda.lines.greet);
  const satz = waehlePlauderei('wanda', LAGE_VOLL, alles, () => 0.37);
  assert.ok(satz && alles.indexOf(satz) >= 0, 'gar kein Satz mehr übrig');
});

test('Das Gedächtnis wächst nicht unbegrenzt und merkt das Neueste zuerst', () => {
  let liste = [];
  for (let i = 0; i < PLAUDER_MERK + 6; i++) liste = merkePlauderei(liste, 'S' + i);
  assert.equal(liste.length, PLAUDER_MERK);
  assert.equal(liste[0], 'S' + (PLAUDER_MERK + 5));
  assert.ok(liste.indexOf('S0') < 0, 'das Älteste ist noch da');
  liste = merkePlauderei(['a', 'b'], 'b');
  assert.deepEqual(liste, ['b', 'a'], 'b steht jetzt zweimal drin');
});

test('Auch bei magerem Vorrat nie zweimal hintereinander dasselbe', () => {
  // Der Fall, den die Prüfung darunter NICHT trifft: Sie benutzt eine reiche
  // Lage, in der immer etwas Ungesagtes übrig ist. Hier ist absichtlich fast
  // nichts da – nur die Begrüßung –, und das Gedächtnis ist größer als der
  // Vorrat. Gemessen im laufenden Spiel kam in dreißig Zügen genau eine
  // unmittelbare Wiederholung; im alten Unit-Test keine einzige.
  let rnd = 5;
  const wurf = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  for (const id of SPIRIT_IDS) {
    const vorrat = saetzeFuer(id, 'immer');
    assert.ok(vorrat.length < PLAUDER_MERK,
      id + ': der Vorrat ist größer als das Gedächtnis – dann prüft das hier nichts');
    let letzte = [];
    let vorher = null;
    for (let i = 0; i < 200; i++) {
      const satz = waehlePlauderei(id, {}, letzte, wurf);
      assert.ok(satz, id + ' sagt gar nichts mehr');
      assert.notEqual(satz, vorher, id + ' sagt zweimal hintereinander: ' + satz);
      vorher = satz;
      letzte = merkePlauderei(letzte, satz);
    }
  }
});

test('In tausend Zügen wiederholt sich bei niemandem etwas unmittelbar', () => {
  let rnd = 11;
  const wurf = () => { rnd = (rnd * 1103515245 + 12345) % 2147483648; return rnd / 2147483648; };
  for (const id of SPIRIT_IDS) {
    let letzte = [];
    let vorher = null;
    for (let i = 0; i < 1000; i++) {
      const satz = waehlePlauderei(id, LAGE_VOLL, letzte, wurf);
      assert.notEqual(satz, vorher, id + ' sagt zweimal hintereinander: ' + satz);
      vorher = satz;
      letzte = merkePlauderei(letzte, satz);
    }
  }
});

/* ---------------- Die Schwellen ---------------- */

test('Die Freundschaftsschwelle liegt da, wo man sie erreichen kann', () => {
  assert.ok(FREUND_AB >= 1, 'ab Stufe 0 wäre jeder gleich zu Anfang ein Freund');
  assert.ok(FREUND_AB <= 10, 'darüber gibt es die Stufe gar nicht');
  // Und sie ist wirklich erreichbar: So viele erledigte Bitten braucht es.
  const noetig = FREUND_AB * 3;
  assert.equal(friendshipLevel(noetig), FREUND_AB,
    'nach ' + noetig + ' Bitten müsste Stufe ' + FREUND_AB + ' stehen');
  assert.ok(friendshipLevel(noetig - 1) < FREUND_AB, 'die Schwelle greift zu früh');
});

test('Gemütlich und kahl liegen innerhalb der Skala', () => {
  assert.ok(GEMUETLICH_AB >= 1 && GEMUETLICH_AB <= COSY_MAX,
    'die Gemütlichkeitsstufe ' + GEMUETLICH_AB + ' gibt es nicht (0..' + COSY_MAX + ')');
  assert.ok(KAHL_BIS >= 0 && KAHL_BIS < GEMUETLICH_AB,
    'kahl und gemütlich überschneiden sich');
});
