/**
 * Deko, die etwas tut.
 *
 * Der Anlass war eine Zählung: Von 26 aufstellbaren Stücken hing bei **17**
 * außer dem Charmewert nichts. Bei den meisten ist das ehrlich – ein Tisch
 * ist ein Tisch. Bei einigen stand der Name für ein Versprechen, das nichts
 * einlöste: eine Vogeltränke ohne Vögel, ein Bienenkorb ohne Bienen, ein
 * Wetterhahn, der über das Wetter nichts sagte.
 *
 * Diese Tests wachen über die zwei Arten, wie so eine Wirkung kaputtgeht:
 * Sie darf nicht verschwinden (dann ist das Stück wieder stumm), und sie
 * darf nicht durch Stapeln beliebig groß werden (dann ist die beste
 * Einrichtung ein Feld aus zwanzig Bienenkörben).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WIRK_RADIUS, BEET_HILFE, BEET_HELFER, beetHilfe,
  TIER_RADIUS, LOCKT, VERSCHEUCHT, tierGunst,
  istWetterhahn, klingt, WIRKUNG, wirkungVon,
} from '../../src/game/decor.js';
import { ITEM_LIST, CAT, getItem } from '../../src/game/items.js';
import { KATALOG } from '../../src/game/catalog.js';
import { hintFor } from '../../src/game/collection.js';
import { RUHE_DEKO } from '../../src/game/pet.js';
import { CROPS, CROP_IDS, growthPerDay } from '../../src/game/crops.js';
import { WEATHER_LABEL, weatherFor } from '../../src/render/weather.js';

/** Ein aufgestelltes Stück Deko, wie es in der Welt steht. */
function deko(id, x, y) {
  return { kind: 'decor', itemId: id, x: x, y: y, gone: false };
}

/* ---------------- Die Tabelle ---------------- */

test('Jede Wirkung gehört zu einem Stück, das es wirklich gibt', () => {
  // Ein Tippfehler in einer Kennung wäre eine Wirkung, die nie eintritt –
  // und im Katalog stünde trotzdem der Satz.
  const alle = Object.keys(BEET_HILFE)
    .concat(Object.keys(LOCKT), Object.keys(VERSCHEUCHT), Object.keys(WIRKUNG));
  for (const id of alle) {
    const item = getItem(id);
    assert.ok(item, id + ': steht in decor.js, aber nicht in der Gegenstandsliste');
    assert.equal(item.cat, CAT.DECOR, id + ' ist keine Deko');
    assert.ok(item.prop, id + ' lässt sich gar nicht aufstellen');
  }
});

test('Jedes Stück mit Wirkung hat auch einen Satz dazu', () => {
  // Sonst kauft man eine Vogeltränke für 285 Münzen und erfährt erst nach
  // dem Auspacken – oder nie –, wofür sie gut ist.
  const wirkt = Object.keys(BEET_HILFE).concat(Object.keys(LOCKT), Object.keys(VERSCHEUCHT));
  for (const id of wirkt) {
    assert.ok(wirkungVon(id).length > 10, id + ': wirkt, sagt es aber nirgends');
  }
  assert.equal(wirkungVon('table'), '', 'ein Tisch behauptet nichts');
  assert.equal(wirkungVon('gibtesnicht'), '');
});

test('Der Satz steht im Katalog und im Fundbuch – aus derselben Quelle', () => {
  for (const id of Object.keys(WIRKUNG)) {
    const hinweis = hintFor(id);
    assert.ok(hinweis.indexOf(WIRKUNG[id]) >= 0,
      id + ': das Fundbuch sagt nicht, was das Stück tut (' + hinweis + ')');
  }
});

/* ---------------- Der Garten ---------------- */

test('Ein Bienenkorb hilft dem Beet nebenan, keinem weit entfernten', () => {
  assert.deepEqual(beetHilfe([], 0, 0).arten, [], 'ohne Deko keine Hilfe');
  const nah = beetHilfe([deko('beehive', WIRK_RADIUS - 20, 0)], 0, 0);
  assert.equal(nah.wachstum, 1, 'in Reichweite muss er wirken');
  const weit = beetHilfe([deko('beehive', WIRK_RADIUS + 20, 0)], 0, 0);
  assert.equal(weit.wachstum, 0, 'außerhalb darf er nicht wirken');
});

test('Zwanzig Bienenkörbe sind nicht besser als einer', () => {
  // Das ist die eigentliche Zusicherung: Ohne sie wäre die beste
  // Einrichtung ein Feld aus Körben, und Einrichten wäre Stapeln.
  const viele = [];
  for (let i = 0; i < 20; i++) viele.push(deko('beehive', i * 3, 0));
  const h = beetHilfe(viele, 0, 0);
  assert.equal(h.wachstum, 1, 'gestapelt gibt es trotzdem nur einen Schritt');
  assert.deepEqual(h.arten, ['beehive']);
});

test('Verschiedene Helfer zählen einzeln', () => {
  const h = beetHilfe([deko('beehive', 20, 0), deko('trellis', 40, 0)], 0, 0);
  assert.equal(h.wachstum, 1);
  assert.equal(h.ernte, 1);
  assert.equal(h.arten.length, 2);
});

test('Der Korb ist genau so stark wie die Gießkanne, nicht stärker', () => {
  // Der Maßstab, an dem die Zahl hängt. Ein zweiter Schritt oben drauf
  // machte aus dem Garten einen Automaten – und der Garten ist die eine
  // Sache im Spiel, die von gestern abhängt.
  const tage = function (crop, extra) {
    let g = 0;
    let t = 0;
    while (g < crop.days && t < 60) { g += growthPerDay('clear') + extra; t++; }
    return t;
  };
  for (const id of CROP_IDS) {
    const c = CROPS[id];
    const mitKanne = tage(c, 1);
    const mitKorb = tage(c, BEET_HILFE.beehive.wachstum);
    assert.equal(mitKorb, mitKanne, c.name + ': Korb und Kanne müssen gleich stark sein');
    assert.ok(mitKorb >= 1, c.name + ': nie unter einem Tag');
  }
});

test('Kein Helfer macht ein Beet an einem halben Tag reif', () => {
  const c = CROPS[CROP_IDS[0]];
  const alles = growthPerDay('rain') + 1 + BEET_HILFE.beehive.wachstum + 1; // Regen, Perk, Korb, gegossen
  assert.ok(alles <= 5, 'mehr als fünf Schritte am Tag wären kein Garten mehr');
  assert.ok(c.days >= 1);
});

/* ---------------- Tiere ---------------- */

test('Die Tränke lockt, die Vogelscheuche vertreibt', () => {
  assert.equal(tierGunst([], 0, 0), 1, 'ohne Deko ist alles normal');
  assert.ok(tierGunst([deko('birdbath', 50, 0)], 0, 0) > 1, 'die Tränke muss locken');
  assert.equal(tierGunst([deko('scarecrow', 50, 0)], 0, 0), 0, 'die Scheuche muss vertreiben');
});

test('Die Gunst wird nie negativ', () => {
  // Sonst rechnet sich ein zweiter Vogelscheuchen-Ständer in eine Zahl
  // unter null, und wer sie irgendwo als Faktor benutzt, dreht das
  // Vorzeichen um. Null heißt „hier kommt nichts her", und tiefer geht es
  // nicht.
  for (let n = 1; n <= 5; n++) {
    const scheuchen = [];
    for (let i = 0; i < n; i++) scheuchen.push(deko('scarecrow', i * 5, 0));
    assert.equal(tierGunst(scheuchen, 0, 0), 0, n + ' Vogelscheuchen ergeben keine negative Gunst');
  }
});

test('Tränke und Scheuche nebeneinander heben sich auf', () => {
  // Genau das sollen sie: Erst daran sieht man, dass beide etwas tun.
  assert.equal(tierGunst([deko('birdbath', 40, 0), deko('scarecrow', 60, 0)], 0, 0), 1);
});

test('Auch die Tiere lassen sich nicht beliebig stapeln', () => {
  const viele = [];
  for (let i = 0; i < 30; i++) viele.push(deko('birdbath', i * 2, 0));
  assert.ok(tierGunst(viele, 0, 0) <= 4, 'gedeckelt, sonst steht dort ein Schwarm');
});

test('Weit entfernte Deko lässt die Tiere in Ruhe', () => {
  assert.equal(tierGunst([deko('scarecrow', TIER_RADIUS + 30, 0)], 0, 0), 1);
});

/* ---------------- Wetterhahn ---------------- */

test('Der Wetterhahn ist genau einer', () => {
  assert.equal(istWetterhahn('weathervane'), true);
  assert.equal(istWetterhahn('windchime'), false);
  assert.equal(istWetterhahn(null), false);
});

test('Das Wetter von morgen steht schon fest', () => {
  // Darauf beruht der Wetterhahn: Das Wetter hing immer nur an Inselzahl,
  // Tag und Jahreszeit – man kann es ausrechnen, ohne zu schlafen.
  for (let day = 2; day < 30; day++) {
    const a = weatherFor(4711, day + 1, 'autumn');
    const b = weatherFor(4711, day + 1, 'autumn');
    assert.equal(a.kind, b.kind, 'Tag ' + (day + 1) + ' ist nicht vorhersagbar');
    assert.ok(WEATHER_LABEL[a.kind], a.kind + ' hat kein Wort für die Anzeige');
  }
});

test('Jedes Wetter hat ein Wort – auch ein neues', () => {
  for (const kind of ['clear', 'rain', 'fog', 'snow']) {
    assert.ok(WEATHER_LABEL[kind] && WEATHER_LABEL[kind].length > 2, kind + ' ohne Wort');
  }
});

/* ---------------- Kleinigkeiten ---------------- */

test('Das Windspiel klingt, der Tisch nicht', () => {
  assert.equal(klingt('windchime'), true);
  assert.equal(klingt('table'), false);
});

test('Der Zierteich ist ein Ruheplatz fürs Tier', () => {
  // Er war das teuerste Stück im Katalog ganz ohne Wirkung.
  assert.ok(RUHE_DEKO.pond, 'der Teich muss ein Ruheplatz sein');
});

/* ---------------- Der Bestand ---------------- */

test('Die teuersten Stücke im Katalog tun etwas', () => {
  // Die Regel, die das Ganze zusammenhält: Was viel kostet, darf nicht
  // ausschließlich Charmepunkte geben. Ein Zierteich für 560 Münzen, der
  // sich von einem Zaunstück für acht nur durch die Zahl unterscheidet,
  // ist der Grund, warum diese Datei existiert.
  const teuer = KATALOG.filter((e) => e.preis >= 250);
  assert.ok(teuer.length >= 6, 'zu wenige teure Stücke – Test prüft nichts');
  const stumm = [];
  for (const e of teuer) {
    const item = getItem(e.id);
    const tut = wirkungVon(e.id) || (item && item.light) || RUHE_DEKO[e.id];
    if (!tut) stumm.push(e.id + ' (' + e.preis + ')');
  }
  assert.deepEqual(stumm, [], 'teuer und wirkungslos: ' + stumm.join(', '));
});

test('Nicht jedes Stück braucht eine Wirkung', () => {
  // Die Gegenprobe. Ein Tisch ist ein Tisch, ein Teppich ist ein Teppich –
  // gäbe man allen 26 eine Mechanik, wäre keine mehr etwas wert.
  const deko26 = ITEM_LIST.filter((i) => i.cat === CAT.DECOR && i.prop
    && i.id.indexOf('keepsake_') !== 0);
  const ohne = deko26.filter((i) => !wirkungVon(i.id) && !i.light);
  assert.ok(ohne.length >= 8,
    'nur ' + ohne.length + ' stille Stücke – das ist zu viel Mechanik');
  assert.ok(ohne.length <= deko26.length - 8,
    'nur ' + (deko26.length - ohne.length) + ' Stücke mit Wirkung');
});
