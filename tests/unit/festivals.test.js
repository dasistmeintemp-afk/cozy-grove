/**
 * Feste – vier Termine, die wirklich kommen.
 *
 * Das Tückische an einem Kalenderdatum ist, dass man es nicht ausprobieren
 * kann: Wer im September prüft, ob das Lichterfest funktioniert, wartet drei
 * Monate. Alles hier ist deshalb eine Rechnung auf einem übergebenen Datum –
 * und die Prüfungen gehen ein ganzes Jahr Tag für Tag durch.
 *
 * Die zwei Fehler, die eine solche Tabelle wirklich macht:
 *
 *   1. Ein Datum, das es nicht jedes Jahr gibt (der 29. Februar) oder das in
 *      der falschen Jahreszeit liegt – ein Erntefest im Frühling.
 *   2. Ein Fest, das auf etwas zeigt, das es nicht gibt: eine Deko ohne
 *      Grafik, ein Geschenk ohne Gegenstand, ein Geist ohne Satz.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FESTE, FEST_IDS, FEST_SATZ, festOn, festSatz, emptyFeste,
  SCHMUCK_RADIUS, SCHMUCK_ANZAHL,
} from '../../src/game/festivals.js';
import { SEASON_IDS, SEASONS, seasonOf } from '../../src/game/calendar.js';
import { SPIRIT_IDS, SPIRITS } from '../../src/game/spirits.js';
import { getItem, CAT } from '../../src/game/items.js';

/** Alle Tage eines Jahres, echte Monatslängen. */
function jahresTage(jahr) {
  const raus = [];
  for (let m = 0; m < 12; m++) {
    const letzter = new Date(jahr, m + 1, 0).getDate();
    for (let t = 1; t <= letzter; t++) raus.push(new Date(jahr, m, t, 12));
  }
  return raus;
}

/* ---------------- Die Termine ---------------- */

test('Vier Feste, eines je Jahreszeit', () => {
  assert.equal(FEST_IDS.length, 4);
  const jz = FEST_IDS.map((id) => FESTE[id].season).sort();
  assert.deepEqual(jz, SEASON_IDS.slice().sort(),
    'nicht jede Jahreszeit hat ihr Fest');
});

test('Jedes Fest liegt wirklich in seiner Jahreszeit', () => {
  // Ein Erntefest im Frühling wäre schwer zu erklären – und niemandem
  // aufgefallen, denn Datum und Jahreszeit stehen in zwei Dateien.
  for (const id of FEST_IDS) {
    const f = FESTE[id];
    const d = new Date(2026, f.datum.monat, f.datum.tag, 12);
    assert.equal(seasonOf(d).id, f.season,
      f.name + ' am ' + f.datum.tag + '.' + (f.datum.monat + 1) + '. fällt in ' +
      seasonOf(d).name + ', nicht in ' + SEASONS[f.season].name);
  }
});

test('Jedes Datum gibt es in jedem Jahr', () => {
  // Derselbe Fehler, den die Geburtstage schon einmal hatten: Ein 31. Juni
  // rutscht still in den Juli, ein 29. Februar kommt alle vier Jahre.
  for (const id of FEST_IDS) {
    const f = FESTE[id];
    for (const jahr of [2025, 2026, 2027, 2028]) {
      const d = new Date(jahr, f.datum.monat, f.datum.tag, 12);
      assert.equal(d.getMonth(), f.datum.monat, f.name + ': Monat rutscht in ' + jahr);
      assert.equal(d.getDate(), f.datum.tag, f.name + ': Tag rutscht in ' + jahr);
    }
  }
});

test('Keine zwei Feste am selben Tag', () => {
  const gesehen = Object.create(null);
  for (const id of FEST_IDS) {
    const f = FESTE[id];
    const key = f.datum.monat + '-' + f.datum.tag;
    assert.ok(!gesehen[key], f.name + ' liegt auf ' + gesehen[key]);
    gesehen[key] = f.name;
  }
});

test('Im Jahr kommt jedes Fest genau einmal', () => {
  const tage = jahresTage(2026);
  assert.ok(tage.length >= 365, 'das Jahr ist zu kurz geraten');
  const wer = Object.create(null);
  let treffer = 0;
  for (const d of tage) {
    const f = festOn(d);
    if (!f) continue;
    treffer++;
    assert.ok(!wer[f.id], f.name + ' kommt zweimal im Jahr');
    wer[f.id] = 1;
  }
  assert.equal(treffer, FEST_IDS.length);
  for (const id of FEST_IDS) assert.ok(wer[id], FESTE[id].name + ' kommt nie');
});

test('An allen anderen Tagen ist kein Fest', () => {
  // Die Gegenprobe: Ohne sie könnte `festOn` jeden Tag etwas melden.
  const tage = jahresTage(2026);
  const mit = tage.filter((d) => !!festOn(d)).length;
  assert.equal(mit, 4);
  assert.ok(tage.length - mit > 355, 'fast jeder Tag ist ein Festtag');
});

/* ---------------- Woran ein Fest hängt ---------------- */

test('Jedes Fest hat Name, Hinweis, Symbol – und die sind verschieden', () => {
  const namen = Object.create(null);
  for (const id of FEST_IDS) {
    const f = FESTE[id];
    assert.equal(f.id, id, id + ': die Kennung passt nicht zum Schlüssel');
    assert.ok(f.name && f.hint && f.icon, f.name + ' ist unvollständig');
    assert.ok(!namen[f.name], 'zwei Feste heißen ' + f.name);
    namen[f.name] = 1;
    assert.ok(/[.!?]$/.test(f.hint), f.name + ': der Hinweis hört mitten im Satz auf');
  }
});

test('Der Schmuck besteht aus Deko, die es wirklich gibt', () => {
  // Ein Fest, das auf eine Grafik zeigt, die es nicht gibt, stellt am 21.
  // Dezember nichts auf – und niemand wüsste, warum.
  for (const id of FEST_IDS) {
    const f = FESTE[id];
    assert.ok(f.schmuck && f.schmuck.length >= 2,
      f.name + ' hat kaum Schmuck – dann sieht die Insel gleich aus');
    for (const s of f.schmuck) {
      const item = getItem(s);
      assert.ok(item, f.name + ': „' + s + '" gibt es nicht');
      assert.equal(item.cat, CAT.DECOR, f.name + ': ' + s + ' ist keine Deko');
      assert.ok(item.prop, f.name + ': ' + s + ' hat keine Weltgrafik');
    }
  }
});

test('Jedes Fest schmückt anders', () => {
  // Vier Feste mit derselben Laterne wären ein Fest mit vier Namen.
  for (let i = 0; i < FEST_IDS.length; i++) {
    for (let j = i + 1; j < FEST_IDS.length; j++) {
      const a = FESTE[FEST_IDS[i]].schmuck;
      const b = FESTE[FEST_IDS[j]].schmuck;
      const gleich = a.filter((x) => b.indexOf(x) >= 0).length;
      assert.ok(gleich < a.length,
        FESTE[FEST_IDS[i]].name + ' und ' + FESTE[FEST_IDS[j]].name +
        ' schmücken identisch');
    }
  }
});

test('Die Gaben gibt es, und sie sind spürbar', () => {
  for (const id of FEST_IDS) {
    const f = FESTE[id];
    assert.ok(f.gabe, f.name + ' gibt nichts');
    const items = f.gabe.items || [];
    for (const it of items) {
      assert.ok(getItem(it.id), f.name + ': „' + it.id + '" gibt es nicht');
      assert.ok(it.n >= 1, f.name + ': ' + it.id + ' ohne Menge');
    }
    assert.ok(items.length > 0 || f.gabe.ember > 0, f.name + ': leere Gabe');
    assert.ok((f.gabe.ember || 0) <= 20,
      f.name + ': ' + f.gabe.ember + ' Glut je Geist sind sieben mal so viel am Tag');
  }
});

test('Der Schmuck steht ums Lager und nicht über die halbe Insel', () => {
  assert.ok(SCHMUCK_RADIUS >= 150, 'enger als das Lager selbst');
  assert.ok(SCHMUCK_RADIUS <= 600, 'darüber sucht man den Schmuck');
  assert.ok(SCHMUCK_ANZAHL >= 4, 'weniger sieht man nicht');
  assert.ok(SCHMUCK_ANZAHL <= 20, 'mehr ist ein Möbellager');
});

/* ---------------- Was die Geister sagen ---------------- */

test('Jeder Geist sagt zu jedem Fest etwas', () => {
  for (const fid of FEST_IDS) {
    assert.ok(FEST_SATZ[fid], FESTE[fid].name + ' hat gar keine Sätze');
    for (const sid of SPIRIT_IDS) {
      const satz = festSatz(fid, sid);
      assert.ok(satz, SPIRITS[sid].name + ' sagt nichts zum ' + FESTE[fid].name);
      assert.ok(satz.length <= 70, fid + '/' + sid + ': zu lang – ' + satz);
      assert.ok(/[.!?…]$/.test(satz), fid + '/' + sid + ': unfertig – ' + satz);
    }
  }
});

test('Kein Festsatz steht zweimal da', () => {
  // Dieselbe Regel wie beim Geplauder: Sieben Stimmen, nicht eine.
  const gesehen = Object.create(null);
  for (const fid of FEST_IDS) {
    for (const sid of SPIRIT_IDS) {
      const satz = festSatz(fid, sid);
      assert.ok(!gesehen[satz], 'derselbe Satz bei ' + gesehen[satz] + ' und ' + fid + '/' + sid);
      gesehen[satz] = fid + '/' + sid;
    }
  }
});

test('Niemand erteilt am Fest einen Auftrag', () => {
  const verdaechtig = /\b(bring|hol|sammle|besorg|solltest|könntest du|kannst du mir)\b/i;
  for (const fid of FEST_IDS) {
    for (const sid of SPIRIT_IDS) {
      assert.ok(!verdaechtig.test(festSatz(fid, sid)),
        fid + '/' + sid + ' klingt nach Auftrag');
    }
  }
});

test('Es gibt keine Sätze für Geister oder Feste, die es nicht gibt', () => {
  for (const fid in FEST_SATZ) {
    assert.ok(FESTE[fid], 'Sätze für ein Fest, das es nicht gibt: ' + fid);
    for (const sid in FEST_SATZ[fid]) {
      assert.ok(SPIRITS[sid], fid + ': Satz für einen Geist, den es nicht gibt: ' + sid);
    }
  }
  assert.equal(festSatz('gibtsnicht', 'mira'), '');
  assert.equal(festSatz('bluete', 'niemand'), '');
});

test('Ein leerer Feststand ist wirklich leer', () => {
  const f = emptyFeste();
  assert.equal(Object.keys(f).length, 0);
  // Kein Prototyp, an dem `toString` hängt – sonst gälte jeder Geist namens
  // „toString" als schon begrüßt.
  assert.equal(f.toString, undefined);
});
