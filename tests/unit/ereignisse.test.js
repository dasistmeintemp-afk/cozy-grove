/**
 * Tagesereignisse – trägt die Kalender-Achse wirklich Jahre?
 *
 * Gemessen war sie das schwächste Glied: Sechs Ereignisse, und über zwei
 * Jahre kommt jedes rund 180-mal. Beim fünften Falterzug ist ein Falterzug
 * keine Besonderheit mehr, sondern Tapete. Die Zahl der Ereignisse ist
 * deshalb keine Geschmacksfrage, sondern die Größe, an der hängt, ob das
 * Spiel nach einem halben Jahr noch etwas zu zeigen hat – und dagegen steht
 * hier eine Prüfung mit einer echten Rechnung, nicht mit einer Behauptung.
 *
 * Das zweite, was hier geprüft wird, ist gefährlicher und war tatsächlich ein
 * Fehler: **Ein Ereignis streut Gegenstände auf die Insel, und die Liste
 * dieser Gegenstände steht in einer Tabelle.** Ein Tippfehler darin ist still
 * – `_streuen` legt dann nichts hin, der Tag heißt „Pilzmorgen" und es wächst
 * kein Pilz. Und ein *solides* Objekt in dieser Liste wäre schlimmer: Dann
 * stünde morgens ein Felsen auf der Brücke.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { EVENTS, EVENT_IDS, eventOf, vorratFuer, seasonOf } from '../../src/game/calendar.js';
import { SEASON_IDS } from '../../src/game/calendar.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';

/** Alle Streu-Vorgaben eines Ereignisses – heute wie am Morgen danach. */
function streuungen(ev) {
  const w = ev.wirkt || {};
  return [w.streut, w.danach].filter(Boolean);
}

test('jedes Ereignis wirkt etwas', function () {
  // Ein Ereignis, das nur einen Namen hat, ist ein Zwischentitel. Die Regel
  // ist dieselbe wie bei den Kapiteln.
  for (const id of EVENT_IDS) {
    const w = EVENTS[id].wirkt;
    assert.ok(w && Object.keys(w).length > 0, id + ' wirkt nichts');
    assert.ok(EVENTS[id].name && EVENTS[id].hint && EVENTS[id].icon, id + ': Name, Hinweis oder Bild fehlt');
    assert.equal(EVENTS[id].id, id, id + ': Kennung stimmt nicht mit dem Schlüssel');
  }
});

test('was gestreut wird, gibt es wirklich – und es ist nie solide', function () {
  // Der Fehler, den diese Prüfung sucht, ist still: Ein unbekannter Name
  // legt einfach nichts hin, und der „Pilzmorgen" wäre ein Morgen ohne Pilze.
  for (const id of EVENT_IDS) {
    for (const spec of streuungen(EVENTS[id])) {
      assert.ok(Array.isArray(spec.arten) && spec.arten.length, id + ': streut ohne Arten');
      assert.ok(spec.n > 0, id + ': streut 0 Stück');
      for (const art of spec.arten) {
        const def = ENTITY_DEFS[art];
        assert.ok(def, id + ': streut „' + art + '" – diese Art gibt es nicht');
        // Das Wichtige. Ein solides Objekt mitten auf dem Weg oder auf der
        // Brücke wäre eine Sperre, die der Spieler nicht gebeten hat – und
        // je nach Werkzeugstufe eine, die er noch nicht wegräumen kann.
        assert.ok(!def.solid, id + ': streut „' + art + '", und das ist solide');
      }
      assert.ok(['sand', 'gras', 'fels'].indexOf(spec.boden || 'gras') >= 0,
        id + ': Boden „' + spec.boden + '" kennt `_streuen` nicht');
    }
  }
});

test('ein Ereignis auf dem Fels sagt, dass es das Hochland braucht', function () {
  // Gefunden im laufenden Spiel, nicht hier: „Steinkraut" streut auf den
  // Fels, der Fels liegt im Hochland, und das ist zu Spielbeginn gesperrt.
  // Der Tag hatte einen Namen und einen Hinweis und keine Deckung.
  //
  // Diese Prüfung leitet die Regel aus den Daten ab, statt sie für ein
  // Ereignis aufzuschreiben: Wer später einen zweiten Felstag erfindet und
  // `braucht` vergisst, fällt hier auf – im Spiel hätte er es erst gemerkt,
  // wenn jemand das Hochland noch nicht offen hat.
  for (const id of EVENT_IDS) {
    const ev = EVENTS[id];
    const boeden = streuungen(ev).map(function (sp) { return sp.boden || 'gras'; });
    if (boeden.indexOf('fels') >= 0) {
      assert.equal(ev.braucht, 'fels', id + ' streut auf den Fels, sagt aber nicht `braucht`');
    }
    // Und umgekehrt darf nichts verlangt werden, was nicht geprüft werden
    // kann: `hatBoden` kennt genau diese drei.
    if (ev.braucht) {
      assert.ok(['sand', 'gras', 'fels'].indexOf(ev.braucht) >= 0,
        id + ': `braucht` „' + ev.braucht + '" kennt `hatBoden` nicht');
    }
  }
});

test('die Achse trägt zwei Jahre, ohne sich auszuleiern', function () {
  // Die eigentliche Messung. Zwei Jahre echter Kalender, zwei Inseltage je
  // Sitzung – so ist die Zahl entstanden, die den Umbau ausgelöst hat.
  const zahl = Object.create(null);
  const start = new Date(2026, 0, 1);
  const TAGE = 730;
  let mitEreignis = 0;
  for (let i = 0; i < TAGE; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    for (let t = 0; t < 2; t++) {
      const ev = eventOf(d, i * 2 + t);
      if (!ev) continue;
      mitEreignis++;
      zahl[ev.id] = (zahl[ev.id] || 0) + 1;
    }
  }

  const haeufigste = Math.max(...Object.values(zahl));
  // Mit sechs Ereignissen lag dieser Wert bei rund 180. Die Grenze liegt
  // bewusst knapp darunter: Sie ist genau dann verletzt, wenn jemand die
  // Tabelle wieder auf eine Handvoll zusammenstreicht.
  assert.ok(haeufigste < 120,
    'häufigstes Ereignis kommt ' + haeufigste + '-mal in zwei Jahren vor – die Achse leiert aus');

  // Und jedes Ereignis muss überhaupt vorkommen. Ein Eintrag, den der
  // Verteiler nie zieht, ist geschriebener Inhalt, den niemand sieht.
  for (const id of EVENT_IDS) {
    assert.ok(zahl[id] > 0, id + ' kommt in zwei Jahren nie vor');
  }

  // Etwa jeder vierte Tag bleibt ohne Ereignis – das ist Absicht und steht
  // so in `eventOf`. Ohne den normalen Tag wäre das Besondere nicht besonders.
  const anteilOhne = 1 - mitEreignis / (TAGE * 2);
  assert.ok(anteilOhne > 0.2 && anteilOhne < 0.3,
    'Anteil der Tage ohne Ereignis: ' + anteilOhne.toFixed(2));
});

test('jahreszeitliche Ereignisse kommen nur in ihrer Jahreszeit', function () {
  const gebunden = EVENT_IDS.filter(function (id) { return EVENTS[id].nur; });
  assert.ok(gebunden.length >= 4, 'keine jahreszeitlichen Ereignisse');

  for (const js of SEASON_IDS) {
    const vorrat = vorratFuer(js);
    for (const id of gebunden) {
      const drin = vorrat.indexOf(id) >= 0;
      assert.equal(drin, EVENTS[id].nur === js,
        id + ' ist in ' + js + (drin ? ' im Vorrat' : ' nicht im Vorrat') + ' – falsch');
    }
    // Der Vorrat darf durch das Filtern nicht dünn werden: Sonst wäre die
    // Jahreszeit mit wenigen Ereignissen genau die, in der es langweilig ist.
    assert.ok(vorrat.length >= EVENT_IDS.length - gebunden.length,
      js + ': nur ' + vorrat.length + ' Ereignisse im Vorrat');
  }

  // Und über ein echtes Jahr darf kein gebundenes Ereignis außerhalb
  // seiner Jahreszeit auftauchen.
  const start = new Date(2026, 0, 1);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const ev = eventOf(d, i);
    if (!ev || !ev.nur) continue;
    assert.equal(ev.nur, seasonOf(d).id,
      ev.id + ' am ' + d.toDateString() + ', aber das ist ' + seasonOf(d).id);
  }
});

test('kein Ereignis nimmt etwas weg', function () {
  // „Nichts verdirbt, nichts bestraft" – auch nicht an einem besonderen Tag.
  // Ein Handel UNTER 1 wäre ein Tag, an dem man schlechter wegkommt, weil
  // der Kalender es so will; ein Grabfaktor unter 1 dasselbe.
  for (const id of EVENT_IDS) {
    const w = EVENTS[id].wirkt;
    if (w.handel != null) assert.ok(w.handel >= 1, id + ': handel ' + w.handel + ' ist eine Strafe');
    if (w.grabstellen != null) assert.ok(w.grabstellen >= 1, id + ': grabstellen ' + w.grabstellen + ' ist eine Strafe');
  }
});

test('derselbe Tag ergibt überall dasselbe', function () {
  // Zwei Leute am selben Kalendertag an ihrem Tag 7 sollen dasselbe erleben.
  const d = new Date(2026, 5, 14);
  for (let t = 0; t < 12; t++) {
    const a = eventOf(d, t);
    const b = eventOf(new Date(2026, 5, 14), t);
    assert.equal(a ? a.id : null, b ? b.id : null, 'Tag ' + t + ' ist nicht reproduzierbar');
  }
});
