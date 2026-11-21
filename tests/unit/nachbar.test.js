/**
 * Jule – macht sie aus den Sammlungen wirklich ein Gespräch?
 *
 * Ihr ganzer Zweck ist ein Vervielfacher: Das Spiel hat drei Sammlungen, die
 * der Spieler für sich anlegt – 36 benannte Momente, sieben Sternbilder, acht
 * selbst benannte Orte –, und alle drei sind stumm. Jule fragt danach. Damit
 * wird jeder vorhandene Inhalt mehr wert, ohne dass ein neuer dazukommt.
 *
 * Zwei Dinge entscheiden darüber, ob das trägt, und beide stehen hier:
 *
 * 1. **Sie fragt nach dem, was man WIRKLICH gefunden hat.** Fragt sie nach
 *    etwas Ungefundenem, ist sie eine Aufgabenliste mit Gesicht – und das
 *    wäre genau das Gegenteil von dem, was sie sein soll.
 * 2. **Sie stellt keine Aufgabe und übt keinen Druck aus.** Wer ihr nie
 *    etwas erzählt, verpasst nichts; wer alles erzählt hat, bekommt keinen
 *    Vorwurf.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NAME, SORTEN, STUFEN, SAETZE, LOHN,
  emptyNachbar, istDa, schluessel, schonErzaehlt, heuteSchon,
  offeneGeschichten, naechsteGeschichte, merke, neueStufe, nachbarStand,
} from '../../src/game/nachbar.js';
import { MOMENTE } from '../../src/game/momente.js';
import { STERNBILDER } from '../../src/game/sternbilder.js';

/** Ein Fundstand mit den ersten `n` Momenten, gefunden an aufsteigenden Tagen. */
function mitMomenten(n) {
  const g = Object.create(null);
  for (let i = 0; i < n; i++) g[MOMENTE[i].id] = 10 + i;
  return { gefunden: g, zuletzt: 0 };
}

function mitSternen(n) {
  const g = Object.create(null);
  for (let i = 0; i < n; i++) g[STERNBILDER[i].id] = 100 + i;
  return { gefunden: g, zuletzt: 0 };
}

test('sie fragt nur nach dem, was wirklich gefunden wurde', function () {
  // Die wichtigste Prüfung. Fragt sie nach etwas Ungefundenem, ist sie eine
  // Aufgabenliste mit Gesicht.
  const stand = emptyNachbar();

  // Gar nichts gefunden: nichts zu erzählen.
  assert.deepEqual(offeneGeschichten(stand, null, null, null), []);
  assert.deepEqual(offeneGeschichten(stand, { gefunden: {} }, { gefunden: {} }, []), []);

  // Drei Momente gefunden: genau diese drei.
  const offen = offeneGeschichten(stand, mitMomenten(3), null, null);
  assert.equal(offen.length, 3);
  const ids = offen.map(function (o) { return o.id; });
  assert.deepEqual(ids.slice().sort(), MOMENTE.slice(0, 3).map(function (m) { return m.id; }).sort());
  for (const o of offen) assert.ok(SORTEN.indexOf(o.art) >= 0, 'unbekannte Sorte ' + o.art);
});

test('sie fragt nach dem Ältesten zuerst', function () {
  // Ein Gespräch, das dort anfängt, wo man selbst angefangen hat – nicht
  // „erzähl mir irgendwas".
  const stand = emptyNachbar();
  const offen = offeneGeschichten(stand, mitMomenten(4), mitSternen(2), null);
  for (let i = 1; i < offen.length; i++) {
    assert.ok(offen[i].tag >= offen[i - 1].tag,
      'Reihenfolge stimmt nicht: ' + offen[i - 1].tag + ' vor ' + offen[i].tag);
  }
  // Die Momente wurden an Tag 10–13 gefunden, die Sternbilder an 100–101:
  // also kommen die Momente zuerst.
  assert.equal(offen[0].art, 'moment');
});

test('ein frisch benannter Ort wartet nicht hinter zwanzig alten Momenten', function () {
  // Orte haben keinen Fundtag. Stünden sie damit am ANFANG der Liste,
  // fragte sie ewig nach Orten; stünden sie blind am Ende, wartete man
  // nach dem Aufstellen eines Schildes vier Wochen. Sie zählen deshalb als
  // „gerade eben" – also hinter allem Gefundenen, aber vor nichts.
  const stand = emptyNachbar();
  const orte = [{ name: 'Mondgarten', x: 0, y: 0 }];
  const offen = offeneGeschichten(stand, mitMomenten(2), null, orte);
  assert.equal(offen.length, 3);
  assert.equal(offen[offen.length - 1].art, 'ort');
  assert.equal(offen[offen.length - 1].titel, 'Mondgarten');

  // Und ohne alles davor ist der Ort das Erste, wonach sie fragt.
  const nur = offeneGeschichten(stand, null, null, orte);
  assert.equal(nur.length, 1);
  assert.equal(nur[0].art, 'ort');
});

test('jede Geschichte nur einmal, und höchstens eine am Tag', function () {
  let stand = emptyNachbar();
  const momente = mitMomenten(5);

  const erst = naechsteGeschichte(stand, momente, null, null, 50);
  assert.ok(erst);
  stand = merke(stand, erst.art, erst.id, 50);

  // Am selben Tag nichts mehr – sonst liest man ihr eine Liste vor.
  assert.equal(naechsteGeschichte(stand, momente, null, null, 50), null);
  assert.equal(heuteSchon(stand, 50), true);
  assert.equal(heuteSchon(stand, 51), false);

  // Am nächsten Tag die nächste, nie wieder dieselbe.
  const zweit = naechsteGeschichte(stand, momente, null, null, 51);
  assert.ok(zweit);
  assert.notEqual(zweit.id, erst.id);
  assert.equal(schonErzaehlt(stand, erst.art, erst.id), true);
  assert.equal(stand.zahl, 1);

  // Dieselbe zweimal eintragen zählt nicht doppelt.
  stand = merke(stand, erst.art, erst.id, 52);
  assert.equal(stand.zahl, 1, 'dieselbe Geschichte wurde doppelt gezählt');
});

test('alles erzählt heißt: keine Frage mehr, kein Vorwurf', function () {
  // Regel 2. Wer fertig ist, bekommt kein „du könntest mal wieder".
  let stand = emptyNachbar();
  const momente = mitMomenten(3);
  for (let tag = 1; tag <= 3; tag++) {
    const g = naechsteGeschichte(stand, momente, null, null, tag);
    assert.ok(g, 'Tag ' + tag + ': nichts zu erzählen, obwohl etwas offen war');
    stand = merke(stand, g.art, g.id, tag);
  }
  assert.equal(naechsteGeschichte(stand, momente, null, null, 4), null);
  assert.equal(offeneGeschichten(stand, momente, null, null).length, 0);

  // Und die Sätze für diesen Fall dürfen nichts verlangen.
  for (const satz of SAETZE.nichts.concat(SAETZE.satt)) {
    const klein = satz.toLowerCase();
    for (const w of ['du solltest', 'bring', 'such', 'du musst', 'vergiss nicht']) {
      assert.ok(klein.indexOf(w) < 0, 'fordernder Satz: ' + satz);
    }
  }
});

test('die Stationen kommen in der Reihenfolge und jede nur einmal', function () {
  let stand = emptyNachbar();
  assert.equal(neueStufe(stand), null, 'eine Station ohne eine einzige Geschichte');

  const gesehen = [];
  // Genug Geschichten für alle Stationen.
  const noetig = STUFEN[STUFEN.length - 1].ab;
  const momente = mitMomenten(Math.min(noetig, MOMENTE.length));
  const sterne = mitSternen(STERNBILDER.length);

  for (let tag = 1; tag <= noetig + 5; tag++) {
    const g = naechsteGeschichte(stand, momente, sterne, null, tag);
    if (!g) break;
    stand = merke(stand, g.art, g.id, tag);
    const st = neueStufe(stand);
    if (st) {
      gesehen.push(st.nummer);
      stand.stufe = st.nummer;
      // Sofort noch einmal gefragt darf dieselbe Station nicht wiederkommen.
      assert.equal(neueStufe(stand), null, 'Station ' + st.nummer + ' kam doppelt');
    }
  }
  assert.deepEqual(gesehen, STUFEN.map(function (_, i) { return i + 1; }),
    'Stationen kamen nicht der Reihe nach: ' + gesehen.join(','));
});

test('sie verlangt nichts, was man bringen muss', function () {
  // Regel 3: Die Geister fragen nach Holz, der Wanderer tauscht. Sie fragt
  // nach etwas, das man ohnehin schon hat. Ein `braucht`, `sucht` oder
  // `items` an einer Station wäre ein achter Sammelauftrag.
  for (const st of STUFEN) {
    for (const verboten of ['braucht', 'sucht', 'kosten', 'preis']) {
      assert.equal(st[verboten], undefined, 'Station ab ' + st.ab + ' verlangt etwas (' + verboten + ')');
    }
    assert.ok(st.satz && st.ab > 0, 'Station ohne Satz oder Schwelle');
  }
  // Die Schwellen steigen, sonst springt sie.
  for (let i = 1; i < STUFEN.length; i++) {
    assert.ok(STUFEN[i].ab > STUFEN[i - 1].ab, 'Schwellen steigen nicht');
  }
  assert.ok(LOHN > 0 && LOHN < 60, 'Lohn ' + LOHN + ' – sie ist keine Händlerin');
});

test('der Stand zählt richtig', function () {
  let stand = emptyNachbar();
  assert.equal(istDa(stand), false);
  stand.da = 55;
  assert.equal(istDa(stand), true);

  const momente = mitMomenten(4);
  let s = nachbarStand(stand, momente, null, null);
  assert.deepEqual(s, { erzaehlt: 0, offen: 4, stufe: 0, stufen: STUFEN.length });

  const g = naechsteGeschichte(stand, momente, null, null, 60);
  stand = merke(stand, g.art, g.id, 60);
  s = nachbarStand(stand, momente, null, null);
  assert.equal(s.erzaehlt, 1);
  assert.equal(s.offen, 3);

  assert.equal(schluessel('moment', 'abc'), 'moment:abc');
  assert.equal(NAME.length > 0, true);
});
