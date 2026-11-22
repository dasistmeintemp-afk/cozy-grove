/**
 * Die Bewohner.
 *
 * Geprüft wird vor allem das, was still schiefgehen kann:
 *
 * 1. **Der Inhalt ist echt.** Jede Türgabe muss auf einen Gegenstand
 *    zeigen, den es gibt – dieselbe Falle wie beim Adventskalender und
 *    davor beim Tagesereignis.
 * 2. **Es kommt immer nur einer.** Zwei Zuzüge am selben Tag wären kein
 *    Ereignis mehr, sondern eine Lieferung.
 * 3. **Kein Satz zweimal**, bis alle durch sind.
 * 4. **Es bleibt immer jemand übrig.** Der Letzte zieht erst im zweiten
 *    Jahr ein; wäre nach vierzig Tagen die Besetzung vollzählig, wäre der
 *    ganze Sinn dahin.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BEWOHNER, BEWOHNER_IDS, bewohnerFuer, emptyBewohner, bewohnerAus, zogHeuteEin,
  STATIONEN, stationFuer, ERINNERUNGEN, ERINNERUNG_ARTEN, ERINNERUNG_FRIST,
  merkeFuerSpaeter, faelligeErinnerung, erinnerungErzaehlt, erinnerungenAltern,
  wohntHier, alleDa, naechsterZuzug, zuzugGrund, einziehen,
  naechsterSatz, merkeRede, heuteGeredet,
  tuergabeFuer, gabeGeholt, merkeGabe, bewohnerStand,
} from '../../src/game/bewohner.js';
import { getItem } from '../../src/game/items.js';

test('vier Bewohner, jeder mit allem, was er braucht', () => {
  assert.equal(BEWOHNER.length, 4);
  const namen = new Set();
  for (const b of BEWOHNER) {
    assert.ok(b.id && b.name && b.was, b.id + ' ist unvollständig');
    assert.ok(!namen.has(b.name), 'zwei heißen ' + b.name);
    namen.add(b.name);
    assert.ok(b.look && b.look.lebt === true, b.name + ' ist kein Lebender');
    assert.ok(b.look.fur && b.look.furShade && b.look.accent);
    assert.ok(b.hutte && b.hutte.wand && b.hutte.dach && b.hutte.tuer);
    assert.ok(['beet', 'werkbank', 'kueche', 'wasser'].indexOf(b.arbeit) >= 0,
      b.name + ' hat keinen Arbeitsplatz');
    assert.equal(bewohnerFuer(b.id), b);
  }
  assert.equal(bewohnerFuer('niemand'), null);
});

test('jede Türgabe zeigt auf einen Gegenstand, den es gibt', () => {
  for (const b of BEWOHNER) {
    assert.ok(b.tuergabe.length >= 3, b.name + ' hat zu wenig im Angebot');
    for (const id of b.tuergabe) {
      assert.ok(getItem(id), b.name + ' legt „' + id + '" hin – das gibt es nicht');
    }
  }
});

test('jeder hat genug eigene Sätze, und keiner sagt, was ein anderer sagt', () => {
  const alle = new Set();
  for (const b of BEWOHNER) {
    assert.ok(b.saetze.length >= 6, b.name + ' hat zu wenig zu sagen');
    // Höchstens ein sehr kurzer je Bewohner. Knuts „Hm." ist Absicht – er
    // redet wenig, das ist seine Figur. Acht davon wären keine Figur mehr,
    // sondern eine leere Tabelle, und genau das soll die Regel verhindern.
    const kurz = b.saetze.filter((x) => x.length <= 8);
    assert.ok(kurz.length <= 1,
      b.name + ' hat ' + kurz.length + ' sehr kurze Zeilen: ' + kurz.join(' / '));
    const schnitt = b.saetze.reduce((n, x) => n + x.length, 0) / b.saetze.length;
    assert.ok(schnitt > 40, b.name + ': im Schnitt nur ' + Math.round(schnitt) + ' Zeichen');
    for (const s of b.saetze) {
      assert.ok(s.length > 2, b.name + ': „' + s + '" ist nichts');
      assert.ok(!alle.has(s), 'zwei sagen dasselbe: ' + s);
      alle.add(s);
      // Regel 2: Niemand erteilt einen Auftrag.
      assert.ok(!/\bbring\b|\bhol\b|\bbesorg/i.test(s),
        b.name + ' erteilt einen Auftrag: ' + s);
    }
  }
});

test('es zieht immer nur einer ein, und zwar in der erzählten Reihenfolge', () => {
  const s = emptyBewohner();
  assert.equal(naechsterZuzug(s, 0, 1), null, 'am ersten Tag noch niemand');
  const erster = naechsterZuzug(s, 999, 1);
  assert.equal(erster.id, BEWOHNER[0].id);
  einziehen(s, erster.id, 20);
  const zweiter = naechsterZuzug(s, 999, 1);
  assert.equal(zweiter.id, BEWOHNER[1].id, 'der Zweite kommt nach dem Ersten');
  assert.equal(alleDa(s).length, 1);
});

test('an einem Tag zieht höchstens einer ein', () => {
  // Gefunden von der Browserprüfung: Zweimal nacheinander gefragt, und es
  // zogen zwei ein. Im Spiel fiele das nicht auf, weil der Tageswechsel nur
  // einmal fragt – aber eine Regel, die davon abhängt, dass der Aufrufer
  // sich benimmt, ist keine.
  const s = emptyBewohner();
  assert.equal(zogHeuteEin(s, 200), false);
  const erster = naechsterZuzug(s, 200, 1);
  einziehen(s, erster.id, 200);
  assert.equal(zogHeuteEin(s, 200), true);
  assert.equal(naechsterZuzug(s, 200, 1), null, 'am selben Tag kommt kein zweiter');
  assert.ok(naechsterZuzug(s, 201, 1), 'am nächsten Tag schon');
});

test('beide Bedingungen zählen – Tage UND Farbe', () => {
  const s = emptyBewohner();
  const b = BEWOHNER[0];
  assert.equal(naechsterZuzug(s, b.ab.tag - 1, 1), null, 'zu früh');
  assert.equal(naechsterZuzug(s, 999, b.ab.deckung - 0.01), null, 'zu blass');
  assert.ok(naechsterZuzug(s, b.ab.tag, b.ab.deckung), 'beides erfüllt');
});

test('der Letzte kommt erst im zweiten Jahr', () => {
  // Wäre nach vierzig Tagen alles besetzt, wäre der Sinn der Sache dahin.
  const letzter = BEWOHNER[BEWOHNER.length - 1];
  assert.ok(letzter.ab.tag > 120, 'der Letzte zieht zu früh ein');
  for (let i = 1; i < BEWOHNER.length; i++) {
    assert.ok(BEWOHNER[i].ab.tag > BEWOHNER[i - 1].ab.tag + 15,
      BEWOHNER[i].name + ' kommt dem Vorgänger zu dicht auf die Fersen');
    assert.ok(BEWOHNER[i].ab.deckung > BEWOHNER[i - 1].ab.deckung);
  }
});

test('der Grund sagt, woran es hakt – nicht „bald"', () => {
  const s = emptyBewohner();
  const g = zuzugGrund(s, 0, 0);
  assert.equal(g.bewohner.id, BEWOHNER[0].id);
  assert.match(g.text, /\d+ Tage/);
  assert.match(g.text, /\d+ % Farbe/);
  const fast = zuzugGrund(s, BEWOHNER[0].ab.tag, BEWOHNER[0].ab.deckung);
  assert.match(fast.text, /morgen/);
  // Sind alle da, gibt es keinen Grund mehr.
  for (const b of BEWOHNER) einziehen(s, b.id, 1);
  assert.equal(zuzugGrund(s, 999, 1), null);
  assert.equal(naechsterZuzug(s, 999, 1), null);
});

test('kein Satz zweimal, bis alle durch sind', () => {
  const s = emptyBewohner();
  const b = BEWOHNER[0];
  einziehen(s, b.id, 1);
  const gesehen = [];
  for (let tag = 1; tag <= b.saetze.length; tag++) {
    const satz = naechsterSatz(s, b.id);
    assert.ok(gesehen.indexOf(satz.text) < 0, 'Satz zum zweiten Mal: ' + satz.text);
    gesehen.push(satz.text);
    assert.equal(merkeRede(s, b.id, satz.nummer, tag), true);
  }
  assert.equal(gesehen.length, b.saetze.length, 'nicht alle Sätze kamen vor');
  // Danach fängt die Runde von vorn an – aber erst danach.
  const neu = naechsterSatz(s, b.id);
  assert.ok(b.saetze.indexOf(neu.text) >= 0);
});

test('einmal am Tag', () => {
  const s = emptyBewohner();
  const b = BEWOHNER[1];
  einziehen(s, b.id, 1);
  assert.equal(heuteGeredet(s, b.id, 5), false);
  assert.equal(merkeRede(s, b.id, 0, 5), true);
  assert.equal(heuteGeredet(s, b.id, 5), true);
  assert.equal(merkeRede(s, b.id, 1, 5), false, 'zweimal am selben Tag zählt nicht');
  assert.equal(merkeRede(s, b.id, 1, 6), true, 'am nächsten Tag wieder');
});

test('die Türgabe hängt am Tag, nicht am Augenblick', () => {
  const b = BEWOHNER[0];
  for (let tag = 1; tag < 40; tag++) {
    const a = tuergabeFuer(b.id, tag);
    assert.equal(a, tuergabeFuer(b.id, tag), 'zweimal gefragt, zwei Antworten');
    assert.ok(b.tuergabe.indexOf(a) >= 0);
  }
  // Und sie wechselt wirklich.
  const verschieden = new Set();
  for (let tag = 1; tag < 40; tag++) verschieden.add(tuergabeFuer(b.id, tag));
  assert.ok(verschieden.size >= 2, 'jeden Tag dasselbe vor der Tür');

  const s = emptyBewohner();
  assert.equal(gabeGeholt(s, b.id, 7), false);
  assert.equal(merkeGabe(s, b.id, 7), true);
  assert.equal(gabeGeholt(s, b.id, 7), true);
  assert.equal(merkeGabe(s, b.id, 7), false);
  assert.equal(merkeGabe(s, b.id, 8), true);
});

test('ein Spielstand von Hand bringt nichts durcheinander', () => {
  const s = bewohnerAus({
    da: { hilde: 12, gibtsnicht: 5 },
    geredet: { hilde: 20 },
    satz: { hilde: [0, 0, 99, -1, 'x', 2] },
    gabe: { hilde: 20 },
  });
  assert.equal(wohntHier(s, 'hilde'), true);
  assert.equal(wohntHier(s, 'gibtsnicht'), false);
  assert.deepEqual(s.satz.hilde, [0, 2], 'Doppeltes und Unsinniges fliegt raus');
  assert.deepEqual(bewohnerAus(null), emptyBewohner());
  assert.equal(bewohnerStand(s).da, 1);
  assert.equal(bewohnerStand(s).alle, BEWOHNER.length);
});

test('keine zwei arbeiten am selben Ort', () => {
  // Vier Bewohner, die vormittags alle an derselben Werkbank stehen, sind
  // eine Schlange, kein Dorf.
  const orte = BEWOHNER.map((b) => b.arbeit);
  assert.equal(new Set(orte).size, orte.length);
});

test('jede Kennung kommt genau einmal vor', () => {
  assert.equal(new Set(BEWOHNER_IDS).size, BEWOHNER_IDS.length);
});

/* ---------------- Der Tagesablauf ---------------- */

test('die Stationen decken den ganzen Tag ab, lückenlos', () => {
  assert.equal(STATIONEN[0].ab, 0);
  assert.equal(STATIONEN[STATIONEN.length - 1].bis, 24);
  for (let i = 1; i < STATIONEN.length; i++) {
    assert.equal(STATIONEN[i].ab, STATIONEN[i - 1].bis,
      'zwischen Station ' + (i - 1) + ' und ' + i + ' klafft eine Lücke');
  }
  // Für JEDE Stunde gibt es genau eine Station – auch für krumme.
  for (let h = 0; h < 24; h += 0.25) {
    const st = stationFuer(h);
    assert.ok(st, 'für ' + h + ' Uhr gibt es keine Station');
    assert.ok(h >= st.ab && h < st.bis, h + ' Uhr fällt auf die falsche Station');
  }
  assert.equal(stationFuer(25).wo, stationFuer(1).wo, 'die Uhr läuft um');
});

test('tagsüber ist niemand zu Hause, nachts sind alle da', () => {
  // Das ist der Punkt der ganzen Sache: Wer um drei Uhr nachmittags vor
  // seiner Tür steht, ist Kulisse.
  assert.equal(stationFuer(3).wo, 'hutte');
  assert.equal(stationFuer(11).wo, 'arbeit');
  assert.equal(stationFuer(15).wo, 'feuer');
  assert.equal(stationFuer(21).wo, 'hutte');
  const draussen = STATIONEN.filter((s) => s.wo !== 'hutte');
  assert.ok(draussen.length >= 2, 'sie sind fast immer zu Hause');
});

/* ---------------- Das Erinnern ---------------- */

test('jede Erinnerung hat für jeden einen eigenen Satz', () => {
  const alle = new Set();
  for (const art of ERINNERUNG_ARTEN) {
    for (const b of BEWOHNER) {
      const satz = ERINNERUNGEN[art][b.id];
      assert.ok(satz && satz.length > 12, art + '/' + b.id + ' fehlt');
      assert.ok(!alle.has(satz), 'zwei Erinnerungen sagen dasselbe: ' + satz);
      alle.add(satz);
    }
  }
  assert.ok(ERINNERUNG_ARTEN.length >= 5);
});

test('gemerkt wird frühestens am nächsten Tag erzählt', () => {
  const s = emptyBewohner();
  einziehen(s, 'hilde', 1);
  const wer = merkeFuerSpaeter(s, 'gepflanzt', 10);
  assert.equal(wer.id, 'hilde');
  assert.equal(faelligeErinnerung(s, 'hilde', 10), null, 'am selben Tag noch nicht');
  const e = faelligeErinnerung(s, 'hilde', 11);
  assert.equal(e.art, 'gepflanzt');
  assert.ok(e.text.length > 12);
});

test('nach einer Woche fängt niemand mehr davon an', () => {
  const s = emptyBewohner();
  einziehen(s, 'hilde', 1);
  merkeFuerSpaeter(s, 'gekocht', 10);
  assert.ok(faelligeErinnerung(s, 'hilde', 10 + ERINNERUNG_FRIST));
  assert.equal(faelligeErinnerung(s, 'hilde', 10 + ERINNERUNG_FRIST + 1), null);
  assert.equal(erinnerungenAltern(s, 10 + ERINNERUNG_FRIST + 1), 1);
  assert.equal(erinnerungenAltern(s, 99), 0, 'einmal weggeräumt ist weggeräumt');
});

test('es merkt sich einer, nicht alle', () => {
  const s = emptyBewohner();
  for (const b of BEWOHNER) einziehen(s, b.id, 1);
  merkeFuerSpaeter(s, 'gefischt', 10);
  const mit = BEWOHNER.filter((b) => !!faelligeErinnerung(s, b.id, 11));
  assert.equal(mit.length, 1, 'ein Chor statt eines Dorfs');
});

test('wer schon etwas trägt, bekommt nichts Neues aufgeladen', () => {
  const s = emptyBewohner();
  einziehen(s, 'hilde', 1);
  merkeFuerSpaeter(s, 'gepflanzt', 10);
  assert.equal(merkeFuerSpaeter(s, 'gekocht', 10), null, 'niemand mehr frei');
  assert.equal(faelligeErinnerung(s, 'hilde', 11).art, 'gepflanzt', 'das Alte bleibt');
});

test('die Erinnerung geht vor und verbraucht keinen der acht Sätze', () => {
  const s = emptyBewohner();
  einziehen(s, 'hilde', 1);
  merkeFuerSpaeter(s, 'benannt', 10);
  const satz = naechsterSatz(s, 'hilde', 11);
  assert.equal(satz.nummer, -1);
  assert.equal(satz.erinnerung, 'benannt');
  merkeRede(s, 'hilde', satz.nummer, 11);
  assert.deepEqual(s.satz.hilde || [], [], 'kein Alltagssatz verbraucht');
  assert.equal(faelligeErinnerung(s, 'hilde', 12), null, 'einmal erzählt, dann weg');
  // Und am nächsten Tag geht es ganz normal weiter.
  const danach = naechsterSatz(s, 'hilde', 12);
  assert.equal(danach.nummer, 0);
});

test('eine Erinnerung an niemanden geht ins Leere, nicht in die Hose', () => {
  const s = emptyBewohner();
  assert.equal(merkeFuerSpaeter(s, 'gekocht', 5), null, 'niemand wohnt hier');
  einziehen(s, 'hilde', 1);
  assert.equal(merkeFuerSpaeter(s, 'gibtsnicht', 5), null, 'unbekannte Art');
  assert.equal(faelligeErinnerung(s, 'hilde', 9), null);
});

test('ein Spielstand von Hand kann keine erfundene Erinnerung einschleusen', () => {
  const s = bewohnerAus({ da: { hilde: 1 }, merk: { hilde: { art: 'quatsch', tag: 5 } } });
  assert.equal(s.merk.hilde, undefined);
  const gut = bewohnerAus({ da: { hilde: 1 }, merk: { hilde: { art: 'gekocht', tag: 5 } } });
  assert.equal(gut.merk.hilde.art, 'gekocht');
});
