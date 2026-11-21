/**
 * Benannte Momente – ist das wirklich Inhalt oder nur Rauschen?
 *
 * Die ganze Idee steht und fällt mit einer Behauptung: Eine Kombination wird
 * zu Inhalt, wenn das Spiel sie benennt. Daraus folgen drei Dinge, die hier
 * nachgerechnet werden und nicht geglaubt:
 *
 * 1. **Die Spreizung.** Wären alle Momente gleich selten, hätte man entweder
 *    nach einer Woche alles oder nie etwas. Beides ist dasselbe Problem.
 * 2. **Der seltenste gewinnt.** Ohne diese Regel verdrängt „Nachts am
 *    Wasser" den Moment „Sterne im Wasser", und eine Sternennacht wäre an
 *    einen Satz verschenkt, den man jede Nacht bekommt.
 * 3. **Keine Bedingung, die es nicht gibt.** Ein Tippfehler in `wenn` – ein
 *    Ort oder ein Ereignis, das so nicht heißt – ergibt einen Moment, der
 *    nie kommt. Still, und niemand merkt es je.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MOMENTE, MOMENT_IDS, HAEUFIG,
  momentVon, seltenheit, passt, lageAus,
  emptyMomente, gefunden, heuteSchon, faelligerMoment, merke, gefundene, momenteStand,
} from '../../src/game/momente.js';
import { ORT_IDS, ZEITEN, JAHRESZEITEN, WETTER } from '../../src/game/bild.js';
import { EVENTS } from '../../src/game/calendar.js';
import { SPIRIT_IDS } from '../../src/game/spirits.js';

test('keine Bedingung, die es nicht gibt', function () {
  // Der stille Fehler. Ein Moment mit `ort: 'strand'` – so heißt kein Ort –
  // wäre geschriebener Inhalt, den der Spieler nie zu sehen bekommt, und
  // nichts im Spiel würde es melden.
  const erlaubt = Object.keys(HAEUFIG);
  for (const m of MOMENTE) {
    assert.ok(m.id && m.name && m.satz, m.id + ': Kennung, Name oder Satz fehlt');
    assert.ok(m.wenn && Object.keys(m.wenn).length > 0, m.id + ' hat keine Bedingung');
    for (const k of Object.keys(m.wenn)) {
      assert.ok(erlaubt.indexOf(k) >= 0, m.id + ': Bedingung „' + k + '" kennt niemand');
      const v = m.wenn[k];
      if (k === 'ort') assert.ok(ORT_IDS.indexOf(v) >= 0, m.id + ': Ort „' + v + '" gibt es nicht');
      if (k === 'zeit') assert.ok(ZEITEN[v], m.id + ': Tageszeit „' + v + '" gibt es nicht');
      if (k === 'jahreszeit') assert.ok(JAHRESZEITEN[v], m.id + ': Jahreszeit „' + v + '" gibt es nicht');
      if (k === 'wetter') assert.ok(WETTER[v], m.id + ': Wetter „' + v + '" gibt es nicht');
      if (k === 'ereignis') assert.ok(EVENTS[v], m.id + ': Ereignis „' + v + '" gibt es nicht');
      // Beim Geist ist `null` erlaubt und heißt „irgendeiner".
      if (k === 'geist' && v != null) {
        assert.ok(SPIRIT_IDS.indexOf(v) >= 0, m.id + ': Geist „' + v + '" gibt es nicht');
      }
    }
  }
  assert.equal(MOMENT_IDS.length, new Set(MOMENT_IDS).size, 'doppelte Kennung');
  // Und kein doppelter Satz: Zwei Momente mit demselben Satz sind einer.
  const saetze = MOMENTE.map(function (m) { return m.satz; });
  assert.equal(saetze.length, new Set(saetze).size, 'zwei Momente sagen dasselbe');
});

test('die Sammlung ist gespreizt – Woche eins bis Jahr zwei', function () {
  const p = MOMENTE.map(seltenheit).sort(function (a, b) { return b - a; });

  // Es muss häufige geben: Wer in der ersten Woche keinen einzigen findet,
  // erfährt nie, dass es Momente gibt.
  const haeufig = p.filter(function (x) { return x >= 1 / 30; }).length;
  assert.ok(haeufig >= 6, 'nur ' + haeufig + ' leicht erreichbare Momente');

  // Und seltene: Sonst ist nach einem Monat alles aufgebraucht.
  const selten = p.filter(function (x) { return x <= 1 / 400; }).length;
  assert.ok(selten >= 6, 'nur ' + selten + ' seltene Momente');

  // Die Spreizung selbst. Zwischen dem häufigsten und dem seltensten muss
  // mindestens das Hundertfache liegen – sonst ist die Sammlung flach, und
  // flach heißt: alles zur selben Zeit oder nie.
  assert.ok(p[0] / p[p.length - 1] >= 100,
    'Spreizung nur ' + Math.round(p[0] / p[p.length - 1]) + '-fach');
});

test('der seltenste passende Moment gewinnt', function () {
  // Die wichtigste Regel. Gebaut als echte Lage, in der beides passt:
  // nachts am Wasser (häufig) UND Sternennacht (selten).
  const lage = {
    ort: 'wasser', zeit: 'nacht', jahreszeit: 'summer',
    wetter: null, ereignis: 'stars', geist: null,
  };
  const beide = MOMENTE.filter(function (m) { return passt(m, lage); });
  assert.ok(beide.length >= 2, 'die Lage trifft nur ' + beide.length + ' Moment(e) – Test taugt nicht');

  const m = faelligerMoment(emptyMomente(), lage, 5);
  assert.ok(m);
  // Er muss der seltenste der passenden sein.
  const minP = Math.min(...beide.map(seltenheit));
  assert.equal(seltenheit(m), minP, 'gewählt wurde ' + m.id + ', aber der ist nicht der seltenste');
  assert.equal(m.id, 'sterne_wasser');
});

test('einmal im Spielleben, und höchstens einer am Tag', function () {
  const lage = {
    ort: 'wasser', zeit: 'morgen', jahreszeit: 'spring',
    wetter: null, ereignis: null, geist: null,
  };
  let stand = emptyMomente();
  const erst = faelligerMoment(stand, lage, 3);
  assert.ok(erst);

  // Am selben Tag kommt kein zweiter.
  stand = merke(stand, erst.id, 3);
  assert.equal(faelligerMoment(stand, lage, 3), null, 'zwei Momente an einem Tag');
  assert.equal(heuteSchon(stand, 3), true);
  assert.equal(heuteSchon(stand, 4), false);

  // Und der gefundene kommt nie wieder – auch nicht an einem anderen Tag.
  const spaeter = faelligerMoment(stand, lage, 4);
  assert.ok(!spaeter || spaeter.id !== erst.id, erst.id + ' kommt ein zweites Mal');
  assert.equal(gefunden(stand, erst.id), true);
});

test('ein Moment gibt nichts her', function () {
  // Regel 2. Ein Moment mit Beute wäre eine Aufgabe, und dann stünde man
  // mit dem Wetterbericht am Klippenrand und wartete.
  for (const m of MOMENTE) {
    for (const verboten of ['gift', 'items', 'coins', 'ember', 'lohn', 'gibt']) {
      assert.equal(m[verboten], undefined, m.id + ' gibt etwas her (' + verboten + ')');
    }
  }
});

test('„irgendein Geist" heißt nicht „kein Geist"', function () {
  // Der einzige Sonderfall in `passt`, und er ist leicht falsch zu bauen:
  // `wenn.geist === null` mit `lage.geist === null` zu vergleichen wäre
  // wahr – und dann käme der Moment genau dann, wenn NIEMAND dasteht.
  const mitGeist = MOMENTE.find(function (m) {
    return Object.prototype.hasOwnProperty.call(m.wenn, 'geist');
  });
  assert.ok(mitGeist, 'kein Moment mit Geist-Bedingung');

  const basis = Object.assign({}, mitGeist.wenn);
  const allein = Object.assign({}, basis, { geist: null });
  const zuZweit = Object.assign({}, basis, { geist: SPIRIT_IDS[0] });

  assert.equal(passt(mitGeist, allein), false, 'kommt, obwohl niemand dasteht');
  assert.equal(passt(mitGeist, zuZweit), true, 'kommt nicht, obwohl jemand dasteht');
});

test('lageAus nimmt genau EINEN Ort, von innen nach außen', function () {
  // Am Lagerfeuer steht man auch am Wasser und bei seinem Zuhause. Gemeint
  // ist das Feuer – dieselbe Rangfolge wie bei den Skizzen, damit es nicht
  // zwei Ortsbegriffe gibt, die auseinanderlaufen.
  const l = lageAus({
    orte: ['wasser', 'lager', 'zuhause'],
    nacht: true, jahreszeit: 'winter', wetter: 'schnee',
  }, 'stars');
  assert.equal(l.ort, 'lager');
  assert.equal(l.zeit, 'nacht');
  assert.equal(l.jahreszeit, 'winter');
  assert.equal(l.wetter, 'schnee');
  assert.equal(l.ereignis, 'stars');

  // Und ohne alles kracht nichts.
  const leer = lageAus(null, null);
  assert.equal(leer.ort, null);
  assert.equal(leer.zeit, 'tag');
  assert.equal(leer.ereignis, null);
});

test('jeder Moment ist überhaupt erreichbar', function () {
  // Eine Bedingung kann für sich genommen stimmen und zusammen unmöglich
  // sein: Schnee im Sommer etwa, oder ein jahreszeitliches Ereignis in der
  // falschen Jahreszeit. So ein Moment ist geschriebener Inhalt, den
  // niemand je sieht.
  for (const m of MOMENTE) {
    const w = m.wenn;
    if (w.ereignis && w.jahreszeit) {
      const nur = EVENTS[w.ereignis].nur;
      assert.ok(!nur || nur === w.jahreszeit,
        m.id + ': ' + w.ereignis + ' gibt es nur im ' + nur + ', verlangt wird ' + w.jahreszeit);
    }
    // Schnee gehört zum Winter, und im Sommer schneit es nicht.
    if (w.wetter === 'schnee' && w.jahreszeit) {
      assert.notEqual(w.jahreszeit, 'summer', m.id + ': Schnee im Sommer');
    }
  }
});

test('die Chronik zeigt das Gefundene in der Reihenfolge des Findens', function () {
  let stand = emptyMomente();
  stand = merke(stand, MOMENTE[3].id, 40);
  stand = merke(stand, MOMENTE[0].id, 12);
  stand = merke(stand, MOMENTE[7].id, 25);
  const liste = gefundene(stand);
  assert.deepEqual(liste.map(function (e) { return e.tag; }), [12, 25, 40]);
  // Nur das Gefundene, nie das Fehlende – siehe Regel 4.
  assert.equal(liste.length, 3);
  assert.deepEqual(momenteStand(stand), { gefunden: 3, gesamt: MOMENTE.length });
  assert.equal(momenteStand(emptyMomente()).gefunden, 0);
  assert.equal(momenteStand(null).gefunden, 0);
  assert.equal(momentVon(MOMENTE[0].id), MOMENTE[0]);
  assert.equal(momentVon('gibtsnicht'), null);
});
