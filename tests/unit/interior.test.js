/**
 * Das Hausinnere – hält der Raum, was er verspricht?
 *
 * Drei Sorten Prüfung stehen hier, und die dritte ist die wichtigste:
 *
 * 1. **Maße.** Jede Ausbaustufe hat einen Raum, und er wächst mit dem Haus.
 *    Ein „Haus mit Veranda", dessen Zimmer so groß ist wie die Zeltecke,
 *    wäre ein Ausbau ohne Folgen.
 * 2. **Platz.** Wo etwas hinpasst und wo nicht. Die eine Regel, die hier
 *    wirklich zählt: **vor die Tür nicht.** Wer seinen Ausgang zustellt,
 *    käme nicht mehr heraus – das wäre die einzige Sackgasse im ganzen
 *    Spiel, und es gibt hier keine.
 * 3. **Alte Spielstände.** Ein Stand von vor dem Zimmer hat keines; einer,
 *    dessen Haus inzwischen gewachsen ist, hat Möbel an Stellen, die es im
 *    kleinen Raum nicht gab. Beides darf nichts kaputtmachen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RAEUME, TUER_BREITE, TUER_TIEFE, STUECK_ABSTAND, RAND, WOHN_STUFEN,
  WOHN_BONUS_MAX, raumFuer, tuerFuer, anDerTuer, bettFuer, amBett, imRaum,
  klemmeInRaum, platzFrei, stueckAn, maxStuecke, gemuetlichkeit, wohnStufe,
  bisZurNaechstenWohnstufe, wohnBonus, emptyInterior, interiorAus, BETT_HOEHE,
} from '../../src/game/interior.js';
import { HOUSE_STAGES, MAX_HOUSE_STAGE, houseColor } from '../../src/game/house.js';
import { getItem, ITEM_LIST, CAT } from '../../src/game/items.js';

const RAUM = raumFuer(3);

/* ---------------- Die Maße ---------------- */

test('Jede Ausbaustufe hat ihr Zimmer', () => {
  // Vier Stufen von außen und drei von innen wäre ein Ausbau, nach dem man
  // dieselbe Ecke vorfindet.
  assert.equal(RAEUME.length, MAX_HOUSE_STAGE);
  for (const st of HOUSE_STAGES) {
    const r = raumFuer(st.id);
    assert.equal(r.stufe, st.id, st.name + ' bekommt das falsche Zimmer');
    assert.ok(r.name && r.w > 0 && r.h > 0 && r.wand > 0, st.name + ': Zimmer unvollständig');
  }
});

test('Das Zimmer wächst mit dem Haus', () => {
  for (let i = 1; i < RAEUME.length; i++) {
    const a = RAEUME[i - 1];
    const b = RAEUME[i];
    assert.ok(b.w > a.w && b.h > a.h,
      b.name + ' ist nicht größer als ' + a.name);
    assert.ok(maxStuecke(b) > maxStuecke(a),
      b.name + ' fasst nicht mehr Stücke als ' + a.name);
  }
});

test('Unsinnige Stufen bekommen trotzdem ein Zimmer', () => {
  // Ein Spielstand mit `house: 0` oder `house: 99` darf nicht dazu führen,
  // dass man in einem Raum ohne Maße steht.
  for (const n of [0, -3, 1.5, 99, null, undefined, NaN]) {
    const r = raumFuer(n);
    assert.ok(r && r.w > 0 && r.h > 0, 'Stufe ' + n + ' ergibt keinen Raum');
  }
  assert.equal(raumFuer(99).stufe, MAX_HOUSE_STAGE);
  assert.equal(raumFuer(0).stufe, 1);
});

test('Jedes Zimmer passt auf einen normalen Bildschirm', () => {
  // Der ganze Raum soll IMMER zu sehen sein – das ist die Idee dahinter.
  // Wird er zu groß, muss man doch wieder scrollen, und aus dem Zimmer wird
  // ein zweites Draußen.
  for (const r of RAEUME) {
    assert.ok(r.w <= 1100, r.name + ' ist ' + r.w + ' breit');
    assert.ok(r.h + r.wand <= 800, r.name + ' ist ' + (r.h + r.wand) + ' hoch');
  }
});

/* ---------------- Tür und Bett ---------------- */

test('Die Tür liegt unten in der Mitte und ist breit genug', () => {
  for (const r of RAEUME) {
    const t = tuerFuer(r);
    assert.ok(t.x > 0 && t.x + t.w < r.w, r.name + ': die Tür hängt aus der Wand');
    assert.equal(Math.round(t.x + t.w / 2), Math.round(r.w / 2), r.name + ': nicht mittig');
    assert.ok(t.w >= 80, r.name + ': die Tür ist enger als Seli');
  }
});

test('Wer unten in der Mitte steht, steht an der Tür – und sonst nicht', () => {
  const t = tuerFuer(RAUM);
  assert.equal(anDerTuer(t.x + t.w / 2, RAUM.h - 20, RAUM), true);
  assert.equal(anDerTuer(t.x + t.w / 2, RAUM.h / 2, RAUM), false, 'mitten im Raum');
  assert.equal(anDerTuer(RAND + 5, RAUM.h - 20, RAUM), false, 'unten links');
  assert.equal(anDerTuer(RAUM.w - RAND - 5, RAUM.h - 20, RAUM), false, 'unten rechts');
});

test('Das Bett steht im Raum und nicht vor der Tür', () => {
  // Ein Bett im Ausgang wäre beides zugleich kaputt.
  for (const r of RAEUME) {
    const b = bettFuer(r);
    assert.ok(imRaum(b.x, b.y, r), r.name + ': das Bett steht in der Wand');
    assert.equal(anDerTuer(b.x, b.y, r), false, r.name + ': das Bett steht im Ausgang');
    assert.equal(amBett(b.x, b.y, r), true);
    assert.equal(amBett(r.w - RAND, r.h - RAND, r), false, r.name + ': das Bett ist überall');
  }
});

/* ---------------- Wo man laufen kann ---------------- */

test('Der Boden hört an der Wand auf', () => {
  assert.equal(imRaum(RAUM.w / 2, RAUM.h / 2, RAUM), true);
  assert.equal(imRaum(-5, RAUM.h / 2, RAUM), false);
  assert.equal(imRaum(RAUM.w + 5, RAUM.h / 2, RAUM), false);
  assert.equal(imRaum(RAUM.w / 2, -5, RAUM), false);
  assert.equal(imRaum(RAUM.w / 2, RAUM.h + 5, RAUM), false);
  // Und der Rand ist wirklich ein Rand, keine Linie: Seli hat Breite.
  assert.equal(imRaum(RAND - 1, RAUM.h / 2, RAUM), false);
  assert.equal(imRaum(RAND + 1, RAUM.h / 2, RAUM), true);
});

test('Wer draußen landet, wird hereingezogen', () => {
  const p = klemmeInRaum(-900, 9000, RAUM);
  assert.equal(imRaum(p.x, p.y, RAUM), true, 'immer noch draußen: ' + JSON.stringify(p));
  const q = klemmeInRaum(RAUM.w / 2, RAUM.h / 2, RAUM);
  assert.deepEqual(q, { x: RAUM.w / 2, y: RAUM.h / 2 }, 'was drin ist, bleibt, wo es ist');
});

/* ---------------- Wo etwas hinpasst ---------------- */

test('Im freien Raum ist Platz', () => {
  assert.equal(platzFrei([], RAUM.w / 2, RAUM.h / 2, RAUM), true);
});

test('Auf einem anderen Stück ist keiner', () => {
  const stuecke = [{ id: 'bench', x: 300, y: 300 }];
  assert.equal(platzFrei(stuecke, 300, 300, RAUM), false);
  assert.equal(platzFrei(stuecke, 300 + STUECK_ABSTAND - 2, 300, RAUM), false, 'zu nah');
  assert.equal(platzFrei(stuecke, 300 + STUECK_ABSTAND + 2, 300, RAUM), true, 'weit genug');
  // Beim Verschieben darf das Stück selbst nicht im Weg stehen.
  assert.equal(platzFrei(stuecke, 300, 300, RAUM, stuecke[0]), true);
});

test('Vor der Tür ist nie Platz – das ist die Regel, die zählt', () => {
  // Wer seinen Ausgang zustellt, käme nicht mehr heraus. Es wäre die einzige
  // Stelle im ganzen Spiel, an der man sich einsperren kann.
  const t = tuerFuer(RAUM);
  for (let x = t.x; x <= t.x + t.w; x += 12) {
    for (let y = RAUM.h - TUER_TIEFE; y <= RAUM.h - RAND; y += 12) {
      assert.equal(platzFrei([], x, y, RAUM), false,
        'vor der Tür ging etwas hin: ' + x + '/' + y);
    }
  }
});

test('Im Bett ist auch keiner', () => {
  const b = bettFuer(RAUM);
  assert.equal(platzFrei([], b.x, b.y, RAUM), false);
});

test('In der Wand erst recht nicht', () => {
  assert.equal(platzFrei([], -10, 100, RAUM), false);
  assert.equal(platzFrei([], RAUM.w + 10, 100, RAUM), false);
});

test('Angesprochen wird das nächste Stück', () => {
  const stuecke = [
    { id: 'bench', x: 200, y: 200 },
    { id: 'table', x: 260, y: 200 },
  ];
  assert.equal(stueckAn(stuecke, 205, 200, 40), stuecke[0]);
  assert.equal(stueckAn(stuecke, 255, 200, 40), stuecke[1]);
  assert.equal(stueckAn(stuecke, 600, 600, 40), null, 'aus dem Nichts gegriffen');
  assert.equal(stueckAn([], 10, 10, 40), null);
});

/* ---------------- Gemütlichkeit ---------------- */

test('Gemütlichkeit ist dieselbe Zahl wie draußen', () => {
  // Zwei Bewertungen nebeneinander, die verschiedene Dinge meinen, wären
  // eine Zahl zu viel. Eine Mondlaterne ist drinnen so viel wert wie draußen.
  const lampe = getItem('moonlamp');
  const bank = getItem('bench');
  const summe = gemuetlichkeit(
    [{ id: 'moonlamp', x: 1, y: 1 }, { id: 'bench', x: 2, y: 2 }], getItem);
  assert.equal(summe, lampe.charm + bank.charm);
  assert.equal(gemuetlichkeit([], getItem), 0);
  assert.equal(gemuetlichkeit(null, getItem), 0);
  // Unbekanntes zählt null statt NaN.
  assert.equal(gemuetlichkeit([{ id: 'gibtsnicht', x: 0, y: 0 }], getItem), 0);
});

test('Die Wohnstufe steigt und hat ein Wort für jede Lage', () => {
  let vorher = -1;
  for (const s of WOHN_STUFEN) {
    assert.ok(s.ab > vorher, 'die Schwellen steigen nicht: ' + s.name);
    vorher = s.ab;
    assert.ok(s.name && s.name.length <= 30, s.name + ' ist kein Wort, sondern ein Satz');
  }
  assert.equal(wohnStufe(0).name, WOHN_STUFEN[0].name);
  assert.equal(wohnStufe(-5).name, WOHN_STUFEN[0].name, 'Unsinn fällt auf die erste Stufe');
  assert.equal(wohnStufe(99999).name, WOHN_STUFEN[WOHN_STUFEN.length - 1].name);
});

test('Die erste Stufe ist an dem Tag zu erreichen, an dem man hineingeht', () => {
  // Wer eine Laterne und eine Bank hineinstellt, soll nicht „Leer" lesen.
  const lampe = getItem('lantern').charm;
  const bank = getItem('bench').charm;
  assert.ok(lampe + bank >= WOHN_STUFEN[1].ab,
    'zwei Stücke reichen nicht für die erste Stufe (' + (lampe + bank) +
    ' von ' + WOHN_STUFEN[1].ab + ')');
});

test('Bis zur nächsten Stufe wird richtig gezählt', () => {
  const s = WOHN_STUFEN[1];
  assert.equal(bisZurNaechstenWohnstufe(0), s.ab);
  assert.equal(bisZurNaechstenWohnstufe(s.ab - 1), 1);
  assert.equal(bisZurNaechstenWohnstufe(99999), null, 'auf der letzten Stufe gibt es kein Weiter');
});

test('Das Zimmer färbt ein wenig weiter – aber nur ein wenig', () => {
  // Die einzige Wirkung nach außen, und sie ist mit Absicht klein. Ein
  // Zimmer, das den halben Fleck einfärbt, machte aus dem Einrichten eine
  // Pflicht, und drinnen soll nichts Pflicht sein.
  assert.equal(wohnBonus(0), 0);
  assert.equal(wohnBonus(-9), 0);
  assert.ok(wohnBonus(10) > 0, 'zehn Punkte bewirken gar nichts');
  assert.equal(wohnBonus(999999), WOHN_BONUS_MAX);
  const grossesHaus = houseColor(MAX_HOUSE_STAGE);
  assert.ok(WOHN_BONUS_MAX < grossesHaus * 0.5,
    'das Zimmer schlägt das Haus: ' + WOHN_BONUS_MAX + ' gegen ' + grossesHaus);
});

test('Ein voll eingerichtetes Zimmer bleibt unter der Obergrenze zu erreichen', () => {
  // Die Gegenprobe: Die Grenze darf nicht so hoch liegen, dass sie nie
  // jemand sieht – dann wäre sie eine Zahl ohne Bedeutung.
  const beste = ITEM_LIST.filter((i) => i.cat === CAT.DECOR && i.charm > 0)
    .sort((a, b) => b.charm - a.charm);
  assert.ok(beste.length > 5, 'zu wenig Deko zum Messen');
  const raum = raumFuer(MAX_HOUSE_STAGE);
  let summe = 0;
  for (let i = 0; i < Math.min(maxStuecke(raum), beste.length); i++) summe += beste[i].charm;
  assert.ok(wohnBonus(summe) === WOHN_BONUS_MAX,
    'selbst das beste Zimmer erreicht die Obergrenze nicht (' + summe + ' Punkte)');
});

/* ---------------- Spielstände ---------------- */

test('Ein leeres Zimmer ist wirklich leer', () => {
  const i = emptyInterior();
  assert.deepEqual(i.stuecke, []);
});

test('Ein Spielstand von vor dem Zimmer bekommt eines', () => {
  for (const roh of [null, undefined, 0, 'nein', [], {}]) {
    const i = interiorAus(roh, RAUM, null);
    assert.deepEqual(i.stuecke, [], JSON.stringify(roh) + ' ergibt kein leeres Zimmer');
  }
});

test('Unfug im Spielstand wird still verworfen', () => {
  // Dieselbe Haltung wie bei `Inventory.fromJSON`: Ein von Hand bearbeiteter
  // Stand darf das Spiel nicht zum Stehen bringen.
  const roh = {
    stuecke: [
      { id: 'bench', x: 200, y: 200 },
      null,
      { id: 42, x: 10, y: 10 },
      { x: 10, y: 10 },
      { id: 'bench', x: 'links', y: 10 },
      { id: 'bench', x: NaN, y: 10 },
      { id: 'gibtsnicht', x: 100, y: 100 },
    ],
  };
  const i = interiorAus(roh, RAUM, (id) => !!(getItem(id) && getItem(id).prop));
  assert.equal(i.stuecke.length, 1, 'durchgekommen: ' + JSON.stringify(i.stuecke));
  assert.equal(i.stuecke[0].id, 'bench');
});

test('Möbel aus einem größeren Zimmer gehen nicht verloren', () => {
  // Wer das Haus ausbaut, behält seine Möbel – und wer eines Tages wieder
  // kleiner wohnte, auch. Verworfen wird nichts, es wird hereingezogen.
  const gross = raumFuer(MAX_HOUSE_STAGE);
  const klein = raumFuer(1);
  const roh = { stuecke: [
    { id: 'bench', x: gross.w - 20, y: gross.h - 20 },
    { id: 'table', x: gross.w - 60, y: 40 },
  ] };
  const i = interiorAus(roh, klein, null);
  assert.equal(i.stuecke.length, 2, 'ein Möbelstück ist verschwunden');
  for (const s of i.stuecke) {
    assert.ok(imRaum(s.x, s.y, klein), 'steht immer noch draußen: ' + JSON.stringify(s));
    assert.equal(anDerTuer(s.x, s.y, klein), false,
      'nach dem Ziehen im Ausgang: ' + JSON.stringify(s));
  }
});

test('Mehr Stücke, als hineinpassen, werden gekappt', () => {
  const viele = [];
  for (let i = 0; i < 400; i++) viele.push({ id: 'bench', x: 100, y: 100 });
  const i = interiorAus({ stuecke: viele }, RAUM, null);
  assert.ok(i.stuecke.length <= maxStuecke(RAUM), 'das Zimmer läuft über');
  assert.ok(i.stuecke.length > 0, 'es wurde alles weggeworfen');
});

test('Die Türbreite passt zu jedem Zimmer', () => {
  for (const r of RAEUME) {
    assert.ok(TUER_BREITE < r.w * 0.6, r.name + ': die Tür ist die halbe Wand');
  }
});

test('Das Bett ragt in keinem Zimmer über die Wand hinaus', () => {
  // Erst beim Hinsehen aufgefallen: In der Zeltecke ist die Wand 96 Punkte
  // hoch, das Bett 180 – es stand oben aus dem Zimmer heraus. In der
  // Rechnung war davon nichts zu merken.
  for (const r of RAEUME) {
    const b = bettFuer(r);
    assert.ok(b.y + r.wand >= BETT_HOEHE,
      r.name + ': das Bett ragt ' + (BETT_HOEHE - b.y - r.wand) + ' Punkte hinaus');
    // Und es bleibt trotzdem im begehbaren Raum stehen.
    assert.ok(imRaum(b.x, b.y, r), r.name + ': das Bett rutscht aus dem Boden');
  }
});
