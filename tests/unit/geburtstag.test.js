/**
 * Geburtstage und Sternenstaub – zwei Tage im Jahr, die anders sind.
 *
 * **Geburtstage** geben der Freundschaft einen Termin. Jeder Geist hat einen,
 * er sagt es, und wer ihm an dem Tag etwas mitbringt, hat etwas erwischt, das
 * man nicht kaufen kann. Das Spiel hatte alles dafür schon – einen echten
 * Kalender, Lieblingsgeschenke, Freundschaft – nur den Termin nicht.
 *
 * **Sternenstaub** gibt der Sternennacht eine Folge. Die Sternschnuppen
 * bleiben ausdrücklich das, was sie sind – ein Bild ohne Aufgabe, niemand
 * muss hochsehen oder etwas anklicken. Belohnt wird trotzdem, aber ohne
 * Bedingung und am Morgen danach: Wer durchgeschlafen hat, findet dasselbe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SPIRITS, SPIRIT_IDS, birthdayOn, hasBirthday, GEBURTSTAG_FAKTOR, favouriteOf,
} from '../../src/game/spirits.js';
import { getItem, ITEM_LIST, CAT } from '../../src/game/items.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { HINTS, hintFor } from '../../src/game/collection.js';
import { EVENT_IDS } from '../../src/game/calendar.js';

/* ---------------- Geburtstage ---------------- */

test('Jeder Geist hat einen Geburtstag, und alle sind verschieden', () => {
  const gesehen = Object.create(null);
  for (const id of SPIRIT_IDS) {
    const g = SPIRITS[id].geburtstag;
    assert.ok(g, id + ' hat keinen Geburtstag');
    assert.ok(g.monat >= 0 && g.monat <= 11, id + ': Monat außerhalb (' + g.monat + ')');
    // Der Tag muss es in SEINEM Monat wirklich geben, und zwar in jedem
    // Jahr: Ein 30. Februar käme nie, ein 29. Februar nur alle vier Jahre.
    // (Nicht pauschal „höchstens der 28." – der 30. Juni ist völlig in
    // Ordnung, und die Regel wäre nur strenger, nicht richtiger.)
    for (const jahr of [2025, 2026, 2028]) {
      const d = new Date(jahr, g.monat, g.tag, 12);
      assert.equal(d.getMonth(), g.monat,
        id + ': den ' + g.tag + '. gibt es im Monat ' + (g.monat + 1) + ' nicht (' + jahr + ')');
      assert.equal(d.getDate(), g.tag, id + ': Datum rutscht in ' + jahr);
    }
    const key = g.monat + '-' + g.tag;
    assert.ok(!gesehen[key], 'zwei Geister am selben Tag: ' + gesehen[key] + ' und ' + id);
    gesehen[key] = id;
  }
});

test('Sie liegen über das Jahr verteilt', () => {
  // Sieben an sieben verschiedenen Monaten: nicht über zwölf (dann wären
  // Monate ohne), nicht gedrängt (dann käme alles auf einmal).
  const monate = new Set(SPIRIT_IDS.map((id) => SPIRITS[id].geburtstag.monat));
  assert.equal(monate.size, SPIRIT_IDS.length, 'zwei Geburtstage im selben Monat');
});

/** Alle Tage eines Jahres, echte Monatslängen. */
function jahresTage(jahr) {
  const raus = [];
  for (let m = 0; m < 12; m++) {
    const letzter = new Date(jahr, m + 1, 0).getDate();
    for (let t = 1; t <= letzter; t++) raus.push(new Date(jahr, m, t, 12));
  }
  return raus;
}

test('Im Jahr kommt jeder Geist genau einmal dran', () => {
  const tage = jahresTage(2026);
  assert.ok(tage.length >= 365, 'das Jahr ist zu kurz geraten');
  const wer = Object.create(null);
  let treffer = 0;
  for (const d of tage) {
    const s = birthdayOn(d);
    if (!s) continue;
    treffer++;
    assert.ok(!wer[s.id], s.name + ' hat zweimal im Jahr Geburtstag');
    wer[s.id] = 1;
  }
  assert.equal(treffer, SPIRIT_IDS.length, 'nicht jeder Geist kommt einmal dran');
  for (const id of SPIRIT_IDS) assert.ok(wer[id], SPIRITS[id].name + ' kommt nie dran');
});

test('An den übrigen Tagen hat niemand Geburtstag', () => {
  // Die Gegenprobe: Ohne sie könnte `birthdayOn` jeden Tag jemanden melden.
  const tage = jahresTage(2026);
  const mit = tage.filter((d) => !!birthdayOn(d)).length;
  assert.equal(mit, SPIRIT_IDS.length);
  assert.ok(tage.length - mit > 350, 'fast jeder Tag ist ein ganz normaler');
});

test('hasBirthday trifft nur den richtigen Geist', () => {
  for (const id of SPIRIT_IDS) {
    const g = SPIRITS[id].geburtstag;
    const tag = new Date(2026, g.monat, g.tag, 12);
    assert.equal(hasBirthday(id, tag), true, id + ': eigener Geburtstag nicht erkannt');
    for (const anderer of SPIRIT_IDS) {
      if (anderer === id) continue;
      assert.equal(hasBirthday(anderer, tag), false,
        anderer + ' hat an ' + id + 's Geburtstag nichts zu feiern');
    }
  }
});

test('Der Geburtstag ist spürbar, aber kein zweites Spiel', () => {
  assert.ok(GEBURTSTAG_FAKTOR >= 2, 'unter dem Doppelten merkt es niemand');
  assert.ok(GEBURTSTAG_FAKTOR <= 4, 'mehr als das Vierfache macht den Rest wertlos');
});

test('Jeder Geist hat etwas, das man ihm schenken kann', () => {
  // Ohne Lieblingsstück wäre der Geburtstag ein Datum ohne Handlung.
  for (const id of SPIRIT_IDS) {
    const fav = favouriteOf(id);
    assert.ok(fav, id + ' hat kein Lieblingsstück');
    assert.ok(getItem(fav), id + ': „' + fav + '" gibt es nicht');
    assert.ok(SPIRITS[id].likes.indexOf(fav) >= 0,
      id + ': das Lieblingsstück steht nicht in seiner Liste');
  }
});

/* ---------------- Sternenstaub ---------------- */

test('Sternenstaub gibt es als Gegenstand, Objekt und Grafik', () => {
  const item = getItem('stardust');
  assert.ok(item, 'kein Gegenstand');
  assert.equal(item.cat, CAT.MATERIAL);
  assert.ok(item.value > 20, 'ein seltener Fund darf nicht wie Holz zählen');
  const def = ENTITY_DEFS.stardust;
  assert.ok(def, 'kein Objekt in der Welt');
  assert.ok(def.yield, 'gibt beim Aufheben nichts her');
  const aus = def.yield(1, () => 0.5) || [];
  assert.ok(aus.some((o) => o.id === 'stardust'), 'gibt keinen Sternenstaub');
});

test('Er wächst NICHT nach – sonst wäre das Seltene Kulisse', () => {
  // Treibholz kommt jeden Tag wieder, Sternenstaub nicht: Er wird vom
  // Ereignis ausgelegt und am nächsten Morgen wieder abgeräumt.
  assert.ok(!ENTITY_DEFS.stardust.respawn,
    'mit Nachwuchs läge nach dem zehnten Sternenhimmel überall Staub');
  assert.equal(ENTITY_DEFS.driftwood.respawn, 1, 'Treibholz dagegen schon – zur Gegenprobe');
});

test('Das Fundbuch sagt, wo er herkommt', () => {
  assert.ok(HINTS.stardust, 'kein Hinweis');
  assert.ok(/Sternennacht/i.test(hintFor('stardust')),
    'der Hinweis nennt das Ereignis nicht: ' + hintFor('stardust'));
  assert.ok(EVENT_IDS.indexOf('stars') >= 0, 'die Sternennacht gibt es gar nicht');
});

test('Er steht in der Materialreihe und macht sie nicht unvollständig', () => {
  // Dieselbe Regel wie bei der Feder: Was im Fundbuch steht, muss man
  // bekommen können. Hier hängt es am Ereignis, und das kommt von selbst.
  const material = ITEM_LIST.filter((i) => i.cat === CAT.MATERIAL);
  assert.ok(material.some((i) => i.id === 'stardust'));
  for (const i of material) {
    assert.ok(HINTS[i.id], i.id + ' ohne Hinweis in der Materialreihe');
  }
});
