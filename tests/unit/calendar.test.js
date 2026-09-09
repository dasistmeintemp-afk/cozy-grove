import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SEASONS, SEASON_IDS, EVENTS, EVENT_IDS,
  seasonOf, eventOf, dayNumber, todayOf, shoalIndex, forceSeason,
} from '../../src/game/calendar.js';
import { SEASON_PALETTE, applySeason, currentSeason } from '../../src/art/season.js';
import { seasonTint } from '../../src/game/seasons.js';
import { INK } from '../../src/art/painted.js';
import { TILE_DEF, T } from '../../src/art/tiles.js';

/** Ein Datum in Ortszeit – so, wie es der Browser des Spielers sieht. */
function tag(jahr, monat, t) {
  return new Date(jahr, monat, t, 12, 0, 0);
}

test('Jedem Monat gehört genau eine Jahreszeit', () => {
  const gezaehlt = Object.create(null);
  for (let m = 0; m < 12; m++) {
    const s = seasonOf(tag(2025, m, 15));
    assert.ok(s && s.id, 'Monat ' + m + ' ohne Jahreszeit');
    gezaehlt[s.id] = (gezaehlt[s.id] || 0) + 1;
  }
  assert.deepEqual(Object.keys(gezaehlt).sort(), SEASON_IDS.slice().sort());
  for (const id of SEASON_IDS) assert.equal(gezaehlt[id], 3, id + ' deckt nicht drei Monate');
});

test('Die Jahreszeiten sitzen dort, wo man sie erwartet', () => {
  assert.equal(seasonOf(tag(2025, 3, 10)).id, 'spring', 'April');
  assert.equal(seasonOf(tag(2025, 6, 10)).id, 'summer', 'Juli');
  assert.equal(seasonOf(tag(2025, 9, 10)).id, 'autumn', 'Oktober');
  assert.equal(seasonOf(tag(2025, 0, 10)).id, 'winter', 'Januar');
  assert.equal(seasonOf(tag(2025, 11, 31)).id, 'winter', 'Silvester');
});

test('Ein Kalendertag hat immer dasselbe Ereignis', () => {
  // Zwei Leute, die am selben Tag spielen, sollen dasselbe erleben – sonst
  // kann man sich darüber nicht unterhalten.
  for (let i = 0; i < 40; i++) {
    const d = tag(2025, 5, 1 + i);
    const a = eventOf(d);
    const b = eventOf(new Date(d.getTime() + 6 * 3600 * 1000));
    assert.equal(a && a.id, b && b.id, 'Tag ' + (1 + i) + ' ändert sich im Lauf des Tages');
  }
});

test('Verschiedene Tage bringen verschiedene Ereignisse', () => {
  const gesehen = Object.create(null);
  let ohne = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const ev = eventOf(new Date(2025, 0, 1 + i, 12));
    if (!ev) { ohne++; continue; }
    gesehen[ev.id] = (gesehen[ev.id] || 0) + 1;
  }
  // Jedes Ereignis kommt vor …
  for (const id of EVENT_IDS) {
    assert.ok(gesehen[id] > 10, id + ' kommt nur ' + (gesehen[id] || 0) + ' Mal in ' + N + ' Tagen');
  }
  // … und ruhige Tage sind ungefähr jeder vierte. Ohne sie wäre nichts mehr
  // besonders.
  const anteil = ohne / N;
  assert.ok(anteil > 0.15 && anteil < 0.35,
    'ruhige Tage: ' + Math.round(anteil * 100) + ' %');
});

test('Nie zwei Ereignisse am selben Tag', () => {
  for (let i = 0; i < 60; i++) {
    const ev = eventOf(new Date(2025, 2, 1 + i, 9));
    if (ev) assert.ok(EVENTS[ev.id] === ev, 'unbekanntes Ereignis');
  }
});

test('Die Tagesgrenze verschiebt sich nicht mit der Sommerzeit', () => {
  // Am Umstellungstag ist ein Tag 23 oder 25 Stunden lang. Rechnete man in
  // Millisekunden, bekäme man ein Ereignis doppelt oder gar nicht.
  const tage = new Set();
  for (let i = 0; i < 10; i++) tage.add(dayNumber(new Date(2025, 2, 25 + i, 3, 30)));
  assert.equal(tage.size, 10, 'zehn Kalendertage müssen zehn Nummern ergeben');

  // Und innerhalb eines Tages bleibt die Nummer gleich, egal zu welcher Stunde
  const eins = dayNumber(new Date(2025, 6, 14, 0, 5));
  const zwei = dayNumber(new Date(2025, 6, 14, 23, 55));
  assert.equal(eins, zwei);
});

test('Jedes Ereignis hat Namen, Satz und Symbol', () => {
  for (const id of EVENT_IDS) {
    const ev = EVENTS[id];
    assert.equal(ev.id, id);
    assert.ok(ev.name && ev.name.length > 3, id + ' ohne Namen');
    assert.ok(ev.hint && ev.hint.length > 10, id + ' ohne Erklärung');
    assert.ok(/^icon_/.test(ev.icon), id + ' ohne Symbol');
  }
});

test('todayOf liefert Jahreszeit und Ereignis zusammen', () => {
  const t = todayOf(tag(2025, 9, 12));
  assert.equal(t.season.id, 'autumn');
  assert.ok(t.day > 20000);
  assert.ok(t.event === null || EVENT_IDS.indexOf(t.event.id) >= 0);
});

test('Der Schwarmfisch bleibt im Vorrat', () => {
  for (let i = 0; i < 50; i++) {
    const idx = shoalIndex(new Date(2025, 3, 1 + i), 7);
    assert.ok(idx >= 0 && idx < 7, 'Index ' + idx);
  }
  assert.equal(shoalIndex(new Date(2025, 3, 1), 0), 0, 'leerer Vorrat darf nicht krachen');
});

/* ---------------- Farben der Jahreszeiten ---------------- */

test('Jede Jahreszeit setzt eine vollständige Palette', () => {
  const sommer = { grass: INK.grass, leaf: INK.leaf };
  for (const id of SEASON_IDS) {
    applySeason(id);
    assert.equal(currentSeason(), id);
    for (const k in SEASON_PALETTE[id]) {
      assert.equal(INK[k], SEASON_PALETTE[id][k], id + ': ' + k + ' nicht gesetzt');
    }
    assert.equal(TILE_DEF[T.GRASS].base, INK.grass, id + ': der Boden zieht nicht mit');
  }
  applySeason('summer');
  assert.equal(INK.grass, SEASON_PALETTE.summer.grass);
  assert.ok(sommer.leaf, 'Grundpalette war leer');
});

test('Der Wechsel lässt nichts von der Jahreszeit davor stehen', () => {
  // Der Winter setzt den Nadelbaum um; Frühling und Herbst tun das nicht.
  // Ohne Zurücksetzen bliebe der Winterton stehen.
  applySeason('summer');
  const sommerPine = INK.pine;
  applySeason('winter');
  assert.notEqual(INK.pine, sommerPine);
  applySeason('spring');
  assert.equal(INK.pine, sommerPine, 'der Winter klebt am Nadelbaum');
  applySeason('summer');
});

/** Sättigung eines Hexwerts – 0 ist Grau. */
function saettigung(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function rgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)];
}

test('Keine Jahreszeit ist grau', () => {
  // Das Spiel handelt davon, Farbe zurückzubringen. Eine entsättigte
  // Jahreszeit würde genau dem Signal widersprechen, um das sich alles dreht.
  for (const id of SEASON_IDS) {
    applySeason(id);
    assert.ok(saettigung.apply(null, rgb(INK.grass)) > 0.07,
      id + ': die Wiese ist zu grau (' + INK.grass + ')');
    assert.ok(saettigung.apply(null, rgb(INK.leaf)) > 0.1,
      id + ': das Laub ist zu grau (' + INK.leaf + ')');
  }
  applySeason('summer');
});

test('Auch der Farbschleier macht nichts grau', () => {
  // Über der Palette liegt seit den Jahreszeiten ein Farbton über dem ganzen
  // Bild. Er ist schwach, aber die Regel oben gilt für das, was man am Ende
  // SIEHT – und das ist Palette PLUS Schleier, nicht die Palette allein.
  for (const id of SEASON_IDS) {
    applySeason(id);
    const t = seasonTint(id);
    if (!t) continue;
    for (const [name, hex, grenze] of [['Wiese', INK.grass, 0.07], ['Laub', INK.leaf, 0.1]]) {
      const [r, g, b] = rgb(hex);
      const ueber = [
        r * (1 - t.a) + t.r * t.a,
        g * (1 - t.a) + t.g * t.a,
        b * (1 - t.a) + t.b * t.a,
      ];
      assert.ok(saettigung.apply(null, ueber) > grenze,
        id + ': ' + name + ' wird unter dem Schleier grau (' + hex + ')');
    }
  }
  applySeason('summer');
});

test('Eine erzwungene Jahreszeit schlägt den Kalender – und lässt sich lösen', () => {
  // Der Schalter hinter `?season=` ist zum Nachsehen da. Er muss vollständig
  // wirken, sonst malt man den Winter und fischt im Sommer.
  const echt = seasonOf(tag(2025, 6, 15)).id;
  assert.equal(echt, 'summer');
  for (const id of SEASON_IDS) {
    assert.equal(forceSeason(id), id);
    assert.equal(seasonOf(tag(2025, 6, 15)).id, id, id + ': nicht durchgesetzt');
    assert.equal(todayOf(tag(2025, 6, 15)).season.id, id, id + ': der Tag weiß nichts davon');
  }
  assert.equal(forceSeason('regenzeit'), null, 'Unsinn wird nicht übernommen');
  assert.equal(seasonOf(tag(2025, 6, 15)).id, 'summer');
  assert.equal(forceSeason(null), null);
  assert.equal(seasonOf(tag(2025, 0, 15)).id, 'winter', 'danach gilt wieder der Kalender');
});

test('Unbekannte Jahreszeit fällt still auf Sommer zurück', () => {
  applySeason('regenzeit');
  assert.equal(currentSeason(), 'summer');
});
