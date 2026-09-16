/**
 * Was kommt – rechnet der Kalender richtig?
 *
 * Die Insel hat elf Termine im Jahr und erzählte von jedem erst an dem
 * Morgen, an dem er da war. Hier steht, was die Vorschau können muss:
 *
 * 1. **Sie erfindet nichts.** Die Liste kommt aus `spirits.js` und
 *    `festivals.js`; eine zweite Tabelle daneben liefe irgendwann
 *    auseinander.
 * 2. **Sie rechnet über den Jahreswechsel.** Am 28. Dezember liegt Nellys
 *    Geburtstag im nächsten Jahr, nicht elf Monate in der Vergangenheit.
 * 3. **Sie bleibt eine Nachricht.** Über das Jahr gemessen zeigt sie an
 *    einem von fünf Tagen etwas. Wäre es jeder zweite, läse es niemand.
 * 4. **Und sie lässt niemanden durchfallen.** Wer einmal die Woche spielt,
 *    sieht jeden der elf Termine kommen – das ist der Grund für die Sieben
 *    in `VORLAUF`, und es wird hier nachgerechnet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VORLAUF, alleTermine, tageBis, terminHeute, naechsterTermin, wannText,
} from '../../src/game/termine.js';
import { SPIRITS, SPIRIT_IDS } from '../../src/game/spirits.js';
import { FESTE } from '../../src/game/festivals.js';
import { getItem } from '../../src/game/items.js';

/** Ein Jahr ohne Schalttag – sonst verschiebt sich die Zählung um einen. */
const JAHR = 2027;
const tag = (monat, t) => new Date(JAHR, monat, t);

test('Die Liste kommt aus den Geistern und den Festen – und erfindet nichts', () => {
  const alle = alleTermine();
  const geburtstage = SPIRIT_IDS.filter((id) => SPIRITS[id].geburtstag).length;
  const feste = Object.keys(FESTE).length;
  assert.equal(alle.length, geburtstage + feste,
    'die Vorschau kennt andere Termine als das Spiel');
  assert.ok(geburtstage >= 7, 'nur ' + geburtstage + ' Geburtstage');
  assert.ok(feste >= 4, 'nur ' + feste + ' Feste');

  for (const t of alle) {
    assert.ok(t.art === 'geburtstag' || t.art === 'fest', t.art);
    assert.ok(t.monat >= 0 && t.monat <= 11, t.name + ': Monat ' + t.monat);
    assert.ok(t.tag >= 1 && t.tag <= 31, t.name + ': Tag ' + t.tag);
    assert.ok(t.name && t.name.length > 3, 'ein Termin ohne Namen');
    assert.ok(t.icon && t.icon.indexOf('icon_') === 0, t.name + ': ' + t.icon);
    // Das Lieblingsstück gehört zum Geburtstag und nur dorthin.
    if (t.art === 'geburtstag') {
      assert.ok(getItem(t.mag), t.name + ': mag etwas, das es nicht gibt');
    } else {
      assert.equal(t.mag, null, t.name + ': ein Fest hat kein Lieblingsstück');
    }
  }
});

test('Sortiert nach Datum', () => {
  const alle = alleTermine();
  for (let i = 1; i < alle.length; i++) {
    const vor = alle[i - 1].monat * 100 + alle[i - 1].tag;
    const nach = alle[i].monat * 100 + alle[i].tag;
    assert.ok(nach >= vor, alle[i].name + ' steht vor ' + alle[i - 1].name);
  }
});

test('Zwei Termine liegen nie auf demselben Tag', () => {
  // Sonst wäre einer davon unsichtbar: Die Vorschau zeigt den nächsten, und
  // „nächster" ist bei Gleichstand eine Frage der Reihenfolge im Code.
  const gesehen = Object.create(null);
  for (const t of alleTermine()) {
    const key = t.monat + '-' + t.tag;
    assert.ok(!gesehen[key], 'zwei Termine am ' + t.tag + '.' + (t.monat + 1));
    gesehen[key] = t.name;
  }
});

test('tageBis rechnet über den Jahreswechsel', () => {
  const lichter = alleTermine().find((t) => t.id === 'lichter');
  assert.ok(lichter, 'das Lichterfest fehlt');
  assert.equal(tageBis(lichter, tag(11, 21)), 0, 'am Fest selbst');
  assert.equal(tageBis(lichter, tag(11, 20)), 1, 'einen Tag vorher');
  assert.equal(tageBis(lichter, tag(11, 14)), 7, 'eine Woche vorher');
  // Am 27. Dezember ist es nicht sechs Tage HER, sondern fast ein Jahr hin.
  assert.equal(tageBis(lichter, tag(11, 27)), 360);
  // 1. Januar bis 21. Dezember desselben Jahres: 354 Tage.
  assert.equal(tageBis(lichter, tag(0, 1)), 354);
});

test('Heute und demnächst melden nie dasselbe', () => {
  // Sonst stünde am Geburtstag „heute Geburtstag" und darunter „in 365
  // Tagen Geburtstag".
  for (const t of alleTermine()) {
    const heute = new Date(JAHR, t.monat, t.tag);
    const h = terminHeute(heute);
    assert.ok(h && h.id === t.id, t.name + ': wird an seinem Tag nicht erkannt');
    const n = naechsterTermin(heute);
    assert.ok(!n || n.id !== t.id, t.name + ': steht an seinem Tag auch in der Vorschau');
  }
});

test('Die Vorschau reicht genau bis VORLAUF', () => {
  for (const t of alleTermine()) {
    for (let n = 1; n <= VORLAUF; n++) {
      const d = new Date(JAHR, t.monat, t.tag - n);
      const gefunden = naechsterTermin(d);
      assert.ok(gefunden, t.name + ': ' + n + ' Tage vorher steht nichts da');
      // Es muss nicht DIESER sein – ein näherer darf ihn überholen –,
      // aber er muss näher sein.
      assert.ok(gefunden.in <= n,
        t.name + ': gemeldet wird etwas Ferneres (' + gefunden.in + ' > ' + n + ')');
    }
    // Einen Tag weiter draußen: nur dann nichts, wenn auch sonst nichts kommt.
    const weit = new Date(JAHR, t.monat, t.tag - (VORLAUF + 1));
    const dahinter = naechsterTermin(weit);
    if (dahinter) assert.ok(dahinter.id !== t.id, t.name + ': meldet sich zu früh');
  }
});

test('Der Vorlauf lässt niemanden durchfallen, der wöchentlich spielt', () => {
  // DAS ist der Grund für die Sieben. Die Geburtstage hängen am echten
  // Kalender; wer sonntags spielt, hätte bei kürzerem Vorlauf schlicht Pech.
  // Nachgerechnet für jeden Wochentag, an dem jemand spielen könnte.
  for (const t of alleTermine()) {
    for (let start = 0; start < 7; start++) {
      let gesehen = false;
      // Jemand, der alle sieben Tage hereinschaut, beginnend irgendwann.
      for (let d = start; d < start + 40; d += 7) {
        const wann = new Date(JAHR, t.monat, t.tag - d);
        const n = naechsterTermin(wann);
        if (n && n.id === t.id) { gesehen = true; break; }
      }
      assert.ok(gesehen,
        t.name + ': ein Wochenspieler mit Start ' + start + ' sieht ihn nie kommen');
    }
  }
});

test('Die Vorschau bleibt eine Nachricht und wird keine Tapete', () => {
  // Gemessen über ein ganzes Jahr: An wie vielen Tagen steht überhaupt
  // etwas da? Bei vierzehn Tagen Vorlauf wären es 39 % – was an zwei von
  // fünf Tagen dasteht, liest niemand mehr.
  let mit = 0;
  for (let d = 0; d < 365; d++) {
    const wann = new Date(JAHR, 0, 1 + d);
    if (naechsterTermin(wann)) mit++;
  }
  const anteil = mit / 365;
  assert.ok(anteil > 0.12, 'nur ' + Math.round(anteil * 100) + ' % der Tage – zu selten, um zu helfen');
  assert.ok(anteil < 0.3, Math.round(anteil * 100) + ' % der Tage – das ist Tapete');
});

test('Der nächste ist wirklich der nächste', () => {
  for (let d = 0; d < 365; d++) {
    const wann = new Date(JAHR, 0, 1 + d);
    const n = naechsterTermin(wann);
    if (!n) {
      // Dann darf in den nächsten VORLAUF Tagen auch keiner liegen.
      for (const t of alleTermine()) {
        assert.ok(tageBis(t, wann) > VORLAUF || tageBis(t, wann) === 0,
          t.name + ' läge in Reichweite, wird aber nicht gemeldet');
      }
      continue;
    }
    for (const t of alleTermine()) {
      const bis = tageBis(t, wann);
      if (bis < 1 || bis > VORLAUF) continue;
      assert.ok(bis >= n.in, t.name + ' ist näher als der gemeldete Termin');
    }
  }
});

test('Das Jahr im Ergebnis ist das, in dem er stattfindet', () => {
  // Daran hängt die Marke, mit der sich das Spiel merkt, dass es schon
  // Bescheid gesagt hat. Mit dem heutigen Jahr sagte es über Silvester
  // zweimal an.
  const nelly = alleTermine().find((t) => t.art === 'geburtstag' && t.monat === 0);
  assert.ok(nelly, 'im Januar hat niemand Geburtstag – die Prüfung misst nichts');
  const vorSilvester = naechsterTermin(new Date(JAHR, 11, 31), 40);
  assert.ok(vorSilvester, 'am 31.12. steht nichts in Reichweite');
  assert.equal(vorSilvester.jahr, JAHR + 1, 'der Termin gehört ins nächste Jahr');
  const imJanuar = naechsterTermin(new Date(JAHR, 0, nelly.tag - 3));
  assert.equal(imJanuar.jahr, JAHR);
});

test('„in 1 Tagen" sagt hier niemand', () => {
  assert.equal(wannText(0), 'heute');
  assert.equal(wannText(1), 'morgen');
  assert.equal(wannText(2), 'übermorgen');
  assert.equal(wannText(3), 'in 3 Tagen');
  assert.equal(wannText(7), 'in 7 Tagen');
  for (let n = 0; n <= 14; n++) {
    assert.ok(!/\b1 Tagen\b/.test(wannText(n)), n + ': ' + wannText(n));
  }
});
