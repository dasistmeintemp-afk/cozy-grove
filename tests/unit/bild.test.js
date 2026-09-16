/**
 * Die Skizzen – bleibt eine Erinnerung eine Erinnerung?
 *
 * Drei Sorten Prüfung:
 *
 * 1. **Eine je Ort und Jahreszeit.** Sonst hätte man nach drei Wochen
 *    vierzig Bilder von derselben Bank, und der Zettel wäre ein Protokoll
 *    statt einer Sammlung.
 * 2. **Der Ort ist eindeutig.** Am Lagerfeuer steht man auch „bei deinem
 *    Zuhause" und oft am Wasser. Ein Bild zeigt EINEN Platz.
 * 3. **Sie sieht nach ihrem Platz aus.** Zwei Orte mit denselben Malwerten
 *    ergäben zwei Zeilen im Zettel und ein Bild.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORTE, ORT_IDS, ZEITEN, JAHRESZEITEN, WETTER,
  ortAus, zeitAus, skizzeAus, kennung, schonDa, titel,
  moeglich, skizzeAusRoh, bilderAus, sortiert,
} from '../../src/game/bild.js';
import { ORT_FORM, ZEIT_FARBEN, JAHRES_FARBEN, WASSER_FARBEN } from '../../src/art/painted-bild.js';
import { ORTE as WUNSCH_ORTE } from '../../src/game/wishes.js';
import { SEASON_IDS } from '../../src/game/calendar.js';

const LAGE = {
  orte: ['wald'], jahreszeit: 'autumn', wetter: null,
  morgen: false, nacht: false, abend: false,
};

test('Die Orte sind dieselben wie bei den Wünschen', () => {
  // Ein zweites Ortsverzeichnis daneben wären zwei Wahrheiten darüber, wo
  // man gerade steht – und die erste Skizze, die „im Wald" heißt, während
  // ein Geist sich dort etwas anderes wünscht, wäre der Beweis.
  for (const id of ORT_IDS) {
    assert.ok(WUNSCH_ORTE[id], 'den Ort „' + id + '" kennen die Wünsche nicht');
  }
});

test('Jede Jahreszeit kommt vor', () => {
  for (const id of SEASON_IDS) {
    assert.ok(JAHRESZEITEN[id], 'keine Benennung für ' + id);
    assert.ok(JAHRES_FARBEN[id], 'keine Farben für ' + id);
    assert.ok(WASSER_FARBEN[id], 'kein Wasser für ' + id);
  }
  assert.equal(Object.keys(JAHRESZEITEN).length, SEASON_IDS.length);
});

test('Jeder Ort und jede Tageszeit lässt sich malen', () => {
  for (const id of ORT_IDS) {
    assert.ok(ORT_FORM[id], 'keine Malvorschrift für ' + id);
  }
  for (const z of Object.keys(ZEITEN)) {
    assert.ok(ZEIT_FARBEN[z], 'keine Farben für ' + z);
  }
});

test('Zwei Orte sehen nie gleich aus', () => {
  // Der Rang allein reicht nicht: Er entscheidet nur, WELCHER Ort gemeint
  // ist. Wie er aussieht, steht in der Malvorschrift, und zwei gleiche
  // ergäben zwei Zeilen im Zettel und ein Bild.
  const gesehen = Object.create(null);
  for (const id of ORT_IDS) {
    const f = ORT_FORM[id];
    const marke = [f.horizont, f.wasser, f.form, f.baeume, !!f.feuer, !!f.haus].join('|');
    assert.ok(!gesehen[marke], id + ' sieht aus wie ' + gesehen[marke]);
    gesehen[marke] = id;
  }
});

test('Die Ränge sind eindeutig – sonst entscheidet der Zufall', () => {
  const raenge = ORT_IDS.map((id) => ORTE[id].rang);
  assert.equal(new Set(raenge).size, raenge.length, 'zwei Orte mit demselben Rang');
});

test('Am Lagerfeuer ist man am Lagerfeuer, nicht am Wasser', () => {
  // Der Fall, für den es den Rang gibt: Dort treffen drei Orte zusammen.
  assert.equal(ortAus(['wasser', 'zuhause', 'lager']), 'lager');
  assert.equal(ortAus(['zuhause', 'wasser']), 'wasser');
  assert.equal(ortAus(['abseits', 'klippen']), 'klippen');
  // Reihenfolge der Liste ändert nichts – sonst hinge das Bild daran, in
  // welcher Reihenfolge die Ortsprüfungen zufällig durchlaufen.
  assert.equal(ortAus(['lager', 'wasser']), ortAus(['wasser', 'lager']));
  // Sachwünsche sind keine Orte.
  assert.equal(ortAus(['sitz', 'licht', 'gruen']), null);
  assert.equal(ortAus([]), null);
  assert.equal(ortAus(null), null);
});

test('Die Tageszeit kommt aus derselben Uhr wie das Geplauder', () => {
  assert.equal(zeitAus({ nacht: true }), 'nacht');
  assert.equal(zeitAus({ abend: true }), 'abend');
  assert.equal(zeitAus({ morgen: true }), 'morgen');
  assert.equal(zeitAus({}), 'tag');
  // Die Nacht schlägt alles andere: `ruheLage` setzt `abend` und `nacht`
  // zwar getrennt, aber wer beides bekäme, säße im Dunkeln.
  assert.equal(zeitAus({ nacht: true, abend: true, morgen: true }), 'nacht');
});

test('Ohne Ort gibt es keine Skizze', () => {
  // Mitten auf der Wiese, weit von allem und doch nicht „weit weg von
  // allem": Dann entsteht keine. Ein Bild von nichts wäre ein leerer Rahmen.
  assert.equal(skizzeAus({ orte: [], jahreszeit: 'spring' }, 3), null);
  assert.equal(skizzeAus({ orte: ['sitz'], jahreszeit: 'spring' }, 3), null);
  assert.equal(skizzeAus(null, 3), null);
  // Und ohne Jahreszeit auch nicht – der Maler bräuchte sie.
  assert.equal(skizzeAus({ orte: ['wald'] }, 3), null);
  assert.equal(skizzeAus({ orte: ['wald'], jahreszeit: 'gibtsnicht' }, 3), null);
});

test('Eine Skizze merkt sich Ort, Jahreszeit, Tageszeit und Wetter', () => {
  const s = skizzeAus(Object.assign({}, LAGE, { abend: true, wetter: 'regen' }), 42);
  assert.deepEqual(s, {
    ort: 'wald', jahreszeit: 'autumn', zeit: 'abend', wetter: 'regen', tag: 42,
  });
  // Ein Wetter, das es nicht gibt, wird verworfen statt weitergereicht.
  const t = skizzeAus(Object.assign({}, LAGE, { wetter: 'hagel' }), 1);
  assert.equal(t.wetter, null);
});

test('Erkannt wird sie an Ort und Jahreszeit – sonst an nichts', () => {
  // Das ist die Regel, die den Zettel zu einer Sammlung macht. Wer eine
  // Woche lang jeden Abend auf derselben Bank sitzt, bekommt EIN Bild.
  const a = skizzeAus(Object.assign({}, LAGE, { abend: true }), 1);
  const b = skizzeAus(Object.assign({}, LAGE, { nacht: true, wetter: 'regen' }), 9);
  assert.equal(kennung(a), kennung(b), 'derselbe Wald im selben Herbst zählt doppelt');
  const c = skizzeAus(Object.assign({}, LAGE, { jahreszeit: 'winter' }), 1);
  assert.notEqual(kennung(a), kennung(c), 'der Winterwald zählt nicht als eigenes Bild');
  assert.equal(kennung(null), null);

  assert.ok(schonDa([a], b), 'die zweite wäre durchgekommen');
  assert.ok(!schonDa([a], c));
  assert.ok(!schonDa([], a));
  // Ohne gültige Skizze gilt „schon da“ – sonst legte ein Unfall Bilder an.
  assert.ok(schonDa([], null));
});

test('Der Titel nennt den Platz, nicht das Datum', () => {
  const s = skizzeAus(Object.assign({}, LAGE, { abend: true, wetter: 'regen' }), 42);
  assert.equal(titel(s), 'Im Wald, im Herbst, am Abend, im Regen');
  const t = skizzeAus(LAGE, 7);
  assert.equal(titel(t), 'Im Wald, im Herbst, am Tag');
  // Kein Tag im Titel: Ein Bild mit einem Datum darunter ist ein Beleg.
  assert.ok(titel(s).indexOf('42') < 0);
  assert.equal(titel(null), '');
  assert.equal(titel({ ort: 'gibtsnicht', jahreszeit: 'spring' }), '');
});

test('Alle Titel sind verschieden', () => {
  // Zwei Zeilen im Zettel mit demselben Text wären zwei Bilder, zwischen
  // denen man nicht wählen kann.
  const alle = new Set();
  for (const ort of ORT_IDS) {
    for (const jz of Object.keys(JAHRESZEITEN)) {
      for (const z of Object.keys(ZEITEN)) {
        for (const w of [null].concat(Object.keys(WETTER))) {
          alle.add(titel({ ort: ort, jahreszeit: jz, zeit: z, wetter: w }));
        }
      }
    }
  }
  const erwartet = ORT_IDS.length * Object.keys(JAHRESZEITEN).length *
    Object.keys(ZEITEN).length * (Object.keys(WETTER).length + 1);
  assert.equal(alle.size, erwartet, 'zwei gleiche Titel');
});

test('Der Zettel kann nicht überlaufen', () => {
  // Sieben Orte mal vier Jahreszeiten. Eine Zahl, kein Gefühl: Ohne sie
  // wäre irgendwann die Frage, was passiert, wenn er voll ist – und jede
  // Antwort darauf („die älteste fällt raus") verdirbt etwas.
  assert.equal(moeglich(), ORT_IDS.length * Object.keys(JAHRESZEITEN).length);
  assert.equal(moeglich(), 28);
});

test('Ein Spielstand kann keine erfundene Skizze einschmuggeln', () => {
  // Was hier durchkommt, geht an den Maler, und der rechnet mit Kennungen,
  // die es gibt. Ein Spielstand ist eine Datei, die man von Hand ändern kann.
  assert.equal(skizzeAusRoh(null), null);
  assert.equal(skizzeAusRoh('wald'), null);
  assert.equal(skizzeAusRoh({ ort: 'mond', jahreszeit: 'spring' }), null);
  assert.equal(skizzeAusRoh({ ort: 'wald', jahreszeit: 'nieselzeit' }), null);
  // Unsinn in den weichen Feldern wird geglättet statt abgelehnt: Ort und
  // Jahreszeit machen das Bild, die anderen beiden nur seine Beschriftung.
  const s = skizzeAusRoh({ ort: 'wald', jahreszeit: 'spring', zeit: 'mittag', wetter: 'hagel' });
  assert.equal(s.zeit, 'tag');
  assert.equal(s.wetter, null);
  assert.equal(s.tag, 0);
});

test('Der geladene Zettel hat keine Doppelten', () => {
  const roh = [
    { ort: 'wald', jahreszeit: 'spring', zeit: 'tag' },
    { ort: 'wald', jahreszeit: 'spring', zeit: 'nacht' },
    { ort: 'mond', jahreszeit: 'spring' },
    { ort: 'wasser', jahreszeit: 'winter', zeit: 'abend' },
    null,
  ];
  const raus = bilderAus(roh);
  assert.equal(raus.length, 2);
  assert.equal(raus[0].zeit, 'tag', 'die zweite hat die erste überschrieben');
  assert.deepEqual(bilderAus(null), []);
  assert.deepEqual(bilderAus('wald'), []);
});

test('Sortiert wird nach Ort, dann nach Jahreszeit – nicht nach Tag', () => {
  // Nach Aufnahmetag sortiert wächst die Liste unten an und sieht nach
  // Verlauf aus. Nach Ort sieht man, welche Jahreszeit noch fehlt.
  const roh = [
    { ort: 'abseits', jahreszeit: 'winter', tag: 1 },
    { ort: 'lager', jahreszeit: 'winter', tag: 99 },
    { ort: 'lager', jahreszeit: 'spring', tag: 50 },
    { ort: 'wald', jahreszeit: 'summer', tag: 2 },
  ];
  const s = sortiert(bilderAus(roh));
  assert.deepEqual(s.map((b) => b.ort + ':' + b.jahreszeit),
    ['lager:spring', 'lager:winter', 'wald:summer', 'abseits:winter']);
  // Und die Vorlage bleibt unberührt.
  assert.equal(roh[0].ort, 'abseits');
});
