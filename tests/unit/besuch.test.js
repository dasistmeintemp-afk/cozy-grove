/**
 * Der Besuch – kommt jemand, und sagt er etwas Wahres?
 *
 * Zwei Sorten Prüfung:
 *
 * 1. **Der Rhythmus.** Dieselbe Bauart wie beim Wanderer, und aus demselben
 *    gemessenen Grund: Ein Tageswurf mit gleicher Häufigkeit ließ dort bis zu
 *    66 Tage Lücke. Gewürfelt wird nicht OB, sondern AN WELCHEM Tag des
 *    Fensters – und dann sind die Lücken beschränkt, nicht nur im Schnitt
 *    richtig.
 * 2. **Der Satz nennt etwas, das wirklich dasteht.** Ein Geist, der ein
 *    Möbelstück lobt, das gar nicht im Zimmer ist, wäre schlimmer als einer,
 *    der schweigt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  besuchAm, naechsterBesuch, gastFuer, satzFuer, bestesStueck,
  emptyBesuch, besuchAus, heuteGesprochen,
  SAETZE, FENSTER, FRUEHESTENS, FREUND_AB, VOLL_AB, KAHL_BIS,
} from '../../src/game/besuch.js';
import { SPIRIT_IDS } from '../../src/game/spirits.js';

/* ---------------- 1. Wann jemand kommt ---------------- */

test('Vor dem frühesten Tag kommt niemand', () => {
  // Wer im Zelt sitzt, bekommt keinen Besuch: Der Satz über „dein Zimmer"
  // wäre dort ein Satz über eine Plane.
  for (let seed = 1; seed <= 40; seed++) {
    for (let t = 0; t < FRUEHESTENS; t++) {
      assert.ok(!besuchAm(seed, t), 'Insel ' + seed + ': Besuch an Tag ' + t);
    }
  }
});

test('In jedem Fenster kommt genau einer', () => {
  // Das ist die ganze Bauart: Nicht die Häufigkeit wird gewürfelt, sondern
  // der Tag innerhalb des Fensters. Damit kann kein Fenster leer bleiben
  // und keines zwei enthalten.
  for (let seed = 1; seed <= 60; seed++) {
    for (let f = 0; f < 12; f++) {
      let n = 0;
      for (let i = 0; i < FENSTER; i++) {
        if (besuchAm(seed, FRUEHESTENS + f * FENSTER + i)) n++;
      }
      assert.equal(n, 1, 'Insel ' + seed + ', Fenster ' + f + ': ' + n + ' Besuche');
    }
  }
});

test('Die Lücken bleiben beschränkt – gemessen', () => {
  // Der Grund für die ganze Konstruktion. Beim Wanderer lagen mit einem
  // Tageswurf bis zu 66 Tage zwischen zwei Besuchen; hier sind es
  // höchstens zwei Fenster minus zwei Tage, und das ist eine Zahl, die aus
  // der Bauart folgt und nicht aus Glück.
  let groesste = 0;
  let spaetester = 0;
  for (let seed = 1; seed <= 200; seed++) {
    let letzter = null;
    let erster = null;
    for (let t = 1; t <= 200; t++) {
      if (!besuchAm(seed, t)) continue;
      if (erster === null) erster = t;
      if (letzter !== null) groesste = Math.max(groesste, t - letzter);
      letzter = t;
    }
    spaetester = Math.max(spaetester, erster);
  }
  assert.ok(groesste <= 2 * FENSTER - 2, 'größte Lücke: ' + groesste);
  assert.ok(spaetester <= FRUEHESTENS + FENSTER - 1,
    'spätester erster Besuch: Tag ' + spaetester);
});

test('Und zwei Besuche liegen nie an aufeinanderfolgenden Tagen', () => {
  // Fällt aus der Bauart heraus statt aus einem Nachtrag: Der Tag im Fenster
  // wird aus 1…FENSTER-1 gewählt, nie 0.
  for (let seed = 1; seed <= 120; seed++) {
    for (let t = 1; t <= 150; t++) {
      if (besuchAm(seed, t) && besuchAm(seed, t + 1)) {
        assert.fail('Insel ' + seed + ': Besuch an Tag ' + t + ' und ' + (t + 1));
      }
    }
  }
});

test('Der nächste Besuch lässt sich vorausrechnen', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const start of [1, FRUEHESTENS, 40, 77]) {
      const t = naechsterBesuch(seed, start);
      assert.ok(besuchAm(seed, t), 'Insel ' + seed + ': Tag ' + t + ' ist keiner');
      assert.ok(t >= Math.max(start, FRUEHESTENS));
      // Und es ist wirklich der nächste, nicht irgendeiner danach.
      for (let i = Math.max(start, FRUEHESTENS); i < t; i++) {
        assert.ok(!besuchAm(seed, i), 'Tag ' + i + ' wäre früher gewesen');
      }
    }
  }
});

/* ---------------- 2. Wer kommt ---------------- */

test('Wer kommt, steht fest – und ändert sich nicht beim zweiten Hinsehen', () => {
  // Sonst stünde beim zweiten Betreten des Zimmers jemand anderes darin.
  const kandidaten = ['bruno', 'mira', 'nelly'];
  for (let seed = 1; seed <= 30; seed++) {
    const tag = naechsterBesuch(seed, 1);
    const a = gastFuer(seed, tag, kandidaten);
    const b = gastFuer(seed, tag, kandidaten);
    assert.equal(a, b);
    assert.ok(kandidaten.indexOf(a) >= 0, 'jemand Fremdes: ' + a);
    // Und die Reihenfolge der Liste ändert nichts.
    assert.equal(gastFuer(seed, tag, ['nelly', 'bruno', 'mira']), a);
  }
});

test('Ohne Kandidaten und an einem Tag ohne Fenster kommt niemand', () => {
  assert.equal(gastFuer(7, naechsterBesuch(7, 1), []), null);
  assert.equal(gastFuer(7, naechsterBesuch(7, 1), null), null);
  // Ein Tag, an dem niemand kommt, gibt auch mit Kandidaten null.
  let tag = naechsterBesuch(7, 1) + 1;
  while (besuchAm(7, tag)) tag++;
  assert.equal(gastFuer(7, tag, ['mira']), null);
});

test('Über viele Tage kommt jeder einmal dran', () => {
  // Sonst wäre einer der sieben der Hausfreund und die anderen sechs Deko.
  const kandidaten = SPIRIT_IDS.slice();
  const gesehen = Object.create(null);
  for (let seed = 1; seed <= 40; seed++) {
    for (let t = FRUEHESTENS; t <= 300; t++) {
      const wer = gastFuer(seed, t, kandidaten);
      if (wer) gesehen[wer] = (gesehen[wer] || 0) + 1;
    }
  }
  for (const id of kandidaten) {
    assert.ok(gesehen[id] > 0, id + ' war nie zu Besuch');
  }
  // Und keiner viel öfter als die anderen: Der seltenste soll mindestens
  // halb so oft kommen wie der häufigste.
  const zahlen = kandidaten.map((id) => gesehen[id]);
  assert.ok(Math.min(...zahlen) > Math.max(...zahlen) * 0.5,
    'sehr ungleich verteilt: ' + zahlen.join(', '));
});

/* ---------------- 3. Was gesagt wird ---------------- */

test('Jeder der sieben hat alle drei Sätze', () => {
  for (const id of SPIRIT_IDS) {
    const s = SAETZE[id];
    assert.ok(s, 'kein Besuchssatz für ' + id);
    for (const lage of ['kahl', 'stueck', 'voll']) {
      assert.ok(typeof s[lage] === 'string' && s[lage].length > 4,
        id + ': kein Satz für „' + lage + '"');
    }
    assert.ok(s.stueck.indexOf('%s') >= 0, id + ': der Satz nennt kein Stück');
  }
  assert.equal(Object.keys(SAETZE).length, SPIRIT_IDS.length,
    'ein Satz ohne Geist: ' + Object.keys(SAETZE).join(', '));
});

test('Und alle einundzwanzig sind verschieden', () => {
  // Zwei Geister mit demselben Satz sind einer. Das ist der ganze Grund,
  // warum es sieben sind und nicht einer mit sieben Gesichtern.
  const alle = [];
  for (const id of SPIRIT_IDS) {
    for (const lage of ['kahl', 'stueck', 'voll']) alle.push(SAETZE[id][lage]);
  }
  assert.equal(new Set(alle).size, alle.length, 'zwei gleiche Sätze');
});

test('Ein leeres Zimmer bekommt keinen Tadel, sondern einen anderen Satz', () => {
  // „Nichts verdirbt, nichts bestraft" gilt auch hier. Und kahl schlägt das
  // Stück: Bei zwei Möbeln über eines zu reden wäre seltsam.
  for (const id of SPIRIT_IDS) {
    const kahl = satzFuer(id, { stuecke: 0, stueckName: 'Tisch' });
    assert.equal(kahl, SAETZE[id].kahl, id + ': redet über ein Möbel im leeren Zimmer');
    assert.equal(satzFuer(id, { stuecke: KAHL_BIS, stueckName: 'Tisch' }), SAETZE[id].kahl);
  }
});

test('Steht etwas da, wird es beim Namen genannt', () => {
  const satz = satzFuer('nelly', { stuecke: 5, stueckName: 'Bücherkiste' });
  assert.ok(satz.indexOf('Bücherkiste') >= 0, 'der Name fehlt: ' + satz);
  assert.ok(satz.indexOf('%s') < 0, 'die Lücke ist stehengeblieben: ' + satz);
});

test('Ohne benennbares Stück fällt es auf den allgemeinen Satz zurück', () => {
  // Kommt vor, wenn im Zimmer nur Dinge stehen, die keinen Charme haben.
  assert.equal(satzFuer('nelly', { stuecke: 9, stueckName: null }), SAETZE.nelly.voll);
  assert.equal(satzFuer('gibtsnicht', { stuecke: 9 }), '');
  assert.equal(satzFuer('nelly', null), SAETZE.nelly.kahl);
});

test('Das angesprochene Stück ist das beste – und immer dasselbe', () => {
  const charme = { table: 8, chair: 3, rug: 8, crate: 0 };
  const stuecke = [
    { itemId: 'chair' }, { itemId: 'table' }, { itemId: 'rug' }, { itemId: 'crate' },
  ];
  const c = (id) => charme[id] || 0;
  const n = (id) => id.toUpperCase();
  const b = bestesStueck(stuecke, c, n);
  assert.equal(b.charme, 8);
  // Gleichstand zwischen Tisch und Teppich: Die Kennung entscheidet, nicht
  // die Reihenfolge im Spielstand. Sonst spräche er nach dem Neuladen über
  // ein anderes Stück.
  assert.equal(b.itemId, 'rug');
  assert.equal(b.name, 'RUG');
  const andersHerum = bestesStueck(
    [{ itemId: 'rug' }, { itemId: 'table' }, { itemId: 'chair' }], c, n);
  assert.equal(andersHerum.itemId, 'rug');

  // Was keinen Charme hat, wird nicht angesprochen – und ein Zimmer nur
  // damit gibt null statt eines Satzes über eine Kiste.
  assert.equal(bestesStueck([{ itemId: 'crate' }], c, n), null);
  assert.equal(bestesStueck([], c, n), null);
  assert.equal(bestesStueck(null, c, n), null);
  assert.equal(bestesStueck([{}, null], c, n), null);
});

/* ---------------- 4. Der Spielstand ---------------- */

test('Einmal am Tag, dann sagt er etwas Kurzes', () => {
  const stand = emptyBesuch();
  assert.ok(!heuteGesprochen(stand, 5));
  stand.gesprochen = 5;
  assert.ok(heuteGesprochen(stand, 5));
  assert.ok(!heuteGesprochen(stand, 6));
  assert.ok(!heuteGesprochen(null, 5));
});

test('Ein alter oder kaputter Spielstand gibt einen leeren Stand', () => {
  assert.deepEqual(besuchAus(undefined), emptyBesuch());
  assert.deepEqual(besuchAus('nelly'), emptyBesuch());
  // Ein erfundener Gast wird verworfen – sein Satz käme sonst aus dem Nichts.
  assert.equal(besuchAus({ wer: 'gibtsnicht', tag: 4 }).wer, null);
  assert.equal(besuchAus({ wer: 'nelly', tag: 4, gesprochen: 4 }).wer, 'nelly');
  assert.equal(besuchAus({ wer: 'nelly', tag: 'morgen' }).tag, 0);
});

test('Die Freundschaftsschwelle ist keine Hürde am Anfang', () => {
  // Stufe 3 heißt neun erledigte Bitten. Wer sich das Zimmer von jemandem
  // ansieht, kennt ihn – aber es soll auch nicht das halbe Spiel dauern.
  assert.ok(FREUND_AB >= 2 && FREUND_AB <= 4, 'Schwelle ' + FREUND_AB);
  assert.ok(VOLL_AB > KAHL_BIS + 2, 'zwischen kahl und voll liegt fast nichts');
});
