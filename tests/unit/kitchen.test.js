/**
 * Die Küche – rechnet sie sich, und ist sie wirklich harmlos?
 *
 * Zwei Sorten Prüfung stehen hier, und die zweite ist die wichtigere:
 *
 * 1. **Rechnet sie sich?** Eine Küche, die aus 30 Münzen Zutaten ein Gericht
 *    für 28 macht, ist eine Falle für jeden, der sie benutzt. Der Wert jedes
 *    Gerichts wird gegen die Summe seiner Zutaten gehalten.
 * 2. **Bleibt sie harmlos?** Kein Hunger, keine Strafe, kein Tier im Topf.
 *    Das sind die drei Regeln des Moduls, und Regeln, die nur im Kommentar
 *    stehen, halten genau bis zum nächsten guten Einfall.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GERICHTE, GERICHT_IDS, STAERKUNG, STAERKUNG_IDS, istGericht, gerichtFuer,
  staerkungVon, fehltFuer, kannKochen, zutatenWert, staerkungHeute,
  tempoFaktor, wuchtBonus, glueckBonus,
} from '../../src/game/kitchen.js';
import { getItem, ITEM_LIST, CAT, CAT_NAMES } from '../../src/game/items.js';
import { SETS } from '../../src/game/collection.js';

/** Eine Tasche, die nur zählt – mehr braucht `fehltFuer` nicht. */
function beutel(inhalt) {
  return { count: function (id) { return inhalt[id] || 0; } };
}

/* ---------------- Die Gerichte ---------------- */

test('Jedes Gericht gibt es auch als Gegenstand, in der Reihe Küche', () => {
  for (const g of GERICHTE) {
    const item = getItem(g.id);
    assert.ok(item, g.id + ' ist kein Gegenstand');
    assert.equal(item.cat, CAT.DISH, g.id + ' steht in der falschen Reihe');
    assert.ok(item.name, g.id + ' hat keinen Namen');
  }
  // Und die Reihe gibt es im Fundbuch, sonst wäre sie unvollständig
  // eingebaut: Gegenstände ohne Reihe zählt niemand mit.
  assert.ok(SETS.some((s) => s.id === CAT.DISH), 'keine Reihe „Küche" im Fundbuch');
  assert.ok(CAT_NAMES[CAT.DISH], 'die Kategorie hat keinen Namen');
});

test('Alle Gerichte im Fundbuch sind auch kochbar', () => {
  // Die Gegenprobe: ein Gericht in der Reihe, das die Küche nicht kennt,
  // wäre ein Feld, das man nie vollmachen kann.
  const inReihe = ITEM_LIST.filter((i) => i.cat === CAT.DISH).map((i) => i.id);
  assert.deepEqual(inReihe.slice().sort(), GERICHT_IDS.slice().sort());
});

test('Kochen lohnt sich – jedes Mal', () => {
  // Der Sinn der Küche in einer Zahl. Sie muss für JEDES Gericht gelten,
  // auch für die teuren aus Mondblüten: Sonst wäre ausgerechnet das seltene
  // Gericht das schlechte Geschäft.
  for (const g of GERICHTE) {
    const zut = zutatenWert(g);
    const wert = getItem(g.id).value;
    assert.ok(zut > 0, g.id + ': Zutaten ohne Wert');
    assert.ok(wert > zut * 1.5,
      g.id + ': ' + zut + ' Münzen Zutaten ergeben nur ' + wert + ' Münzen');
  }
});

test('Aber nicht so sehr, dass man nur noch kocht', () => {
  // Die Gegenprobe zur Prüfung darüber. Bei Faktor fünf wäre die Küche eine
  // Münzpresse, und alles andere im Spiel wäre Zeitverschwendung.
  for (const g of GERICHTE) {
    const faktor = getItem(g.id).value / zutatenWert(g);
    assert.ok(faktor < 3, g.id + ': Faktor ' + faktor.toFixed(2) + ' ist eine Münzpresse');
  }
});

test('Seli isst kein Tier', () => {
  // Die Figur, als Prüfung. Ein Fischgericht wäre schnell dazugeschrieben
  // und der Küche nicht anzusehen – dem Spiel schon.
  for (const g of GERICHTE) {
    for (const z of g.zutaten) {
      const item = getItem(z.id);
      assert.ok(item, g.id + ': Zutat „' + z.id + '" gibt es nicht');
      assert.notEqual(item.cat, CAT.FISH, g.id + ' enthält Fisch: ' + z.id);
      assert.notEqual(item.cat, CAT.BUG, g.id + ' enthält einen Falter: ' + z.id);
      assert.ok(item.cat === CAT.FORAGE || item.cat === CAT.DISH,
        g.id + ': ' + z.id + ' ist nichts, was wächst');
    }
  }
});

test('Gerichte verbrennen nicht', () => {
  // Wie die Saat: Etwas Gekochtes ins Feuer zu werfen wäre die eine
  // Handlung, die hier wirklich schade wäre.
  for (const g of GERICHTE) {
    assert.ok(!getItem(g.id).burn, g.id + ' lässt sich verbrennen');
  }
});

test('Jedes Gericht braucht Zutaten, und keine doppelt', () => {
  for (const g of GERICHTE) {
    assert.ok(g.zutaten.length >= 1, g.id + ' kostet nichts');
    const gesehen = Object.create(null);
    for (const z of g.zutaten) {
      assert.ok(z.n >= 1, g.id + ': Zutat ohne Menge');
      assert.ok(!gesehen[z.id], g.id + ': ' + z.id + ' steht zweimal drin');
      gesehen[z.id] = 1;
    }
  }
});

test('Kein Gericht ist dasselbe wie ein anderes', () => {
  const gesehen = Object.create(null);
  for (const g of GERICHTE) {
    const key = g.zutaten.map((z) => z.id + 'x' + z.n).sort().join(',');
    assert.ok(!gesehen[key], g.id + ' hat dieselben Zutaten wie ' + gesehen[key]);
    gesehen[key] = g.id;
  }
});

test('Die zwei seltenen Gerichte hängen wirklich an Wetter und Nacht', () => {
  // Sie sind der Grund, an einem Regentag in den Wald zu gehen. Stünden
  // stattdessen gewöhnliche Zutaten darin, wären es nur zwei teurere
  // Gerichte.
  const selten = ['dish_rainstew', 'dish_mooncake'];
  for (const id of selten) {
    const g = gerichtFuer(id);
    assert.ok(g, id + ' fehlt');
    // `onlyAt` ist die Bedingung am Gegenstand selbst („night", „rain").
    // Gefragt wird sie dort und nicht in einer zweiten Liste daneben.
    assert.ok(g.zutaten.some((z) => !!(getItem(z.id) || {}).onlyAt),
      id + ' braucht nichts, wofür man auf etwas warten müsste');
  }
});

/* ---------------- Die Stärkungen ---------------- */

test('Jede Stärkung kommt wirklich vor', () => {
  // Eine Wirkung, die kein Gericht gibt, ist geschriebener Code ohne Weg
  // dorthin – genau wie die Begrüßungen, die jahrelang niemand sah.
  for (const id of STAERKUNG_IDS) {
    assert.ok(GERICHTE.some((g) => g.staerkung === id),
      'kein Gericht gibt „' + id + '"');
  }
  for (const g of GERICHTE) {
    assert.ok(STAERKUNG[g.staerkung], g.id + ' gibt eine Stärkung, die es nicht gibt');
  }
});

test('Jede Stärkung tut auch etwas', () => {
  for (const id of STAERKUNG_IDS) {
    const s = STAERKUNG[id];
    const wirkt = (s.tempo && s.tempo !== 1) || s.wucht || s.glueck;
    assert.ok(wirkt, id + ' hat einen Namen und keine Wirkung');
    assert.ok(s.name && s.note, id + ' hat keinen Text fürs Fenster');
    assert.ok(s.icon, id + ' hat kein Symbol');
  }
});

test('Die Wirkungen sind spürbar, aber kein zweites Spiel', () => {
  assert.ok(STAERKUNG.flink.tempo > 1.1, 'unter zehn Prozent merkt das niemand');
  assert.ok(STAERKUNG.flink.tempo < 1.5, 'darüber rennt man an allem vorbei');
  assert.equal(STAERKUNG.kraeftig.wucht, 1, 'mehr als ein Schlag entwertet die Werkzeugstufen');
});

test('Ohne Stärkung rechnet alles wie zuvor', () => {
  // Der wichtigste Fall: Wer nie kocht, spielt das Spiel von gestern.
  for (const stand of [null, undefined, { id: 'flink', tag: 3 }]) {
    assert.equal(tempoFaktor(stand, 9), 1, JSON.stringify(stand));
    assert.equal(wuchtBonus(stand, 9), 0, JSON.stringify(stand));
    assert.equal(glueckBonus(stand, 9), 0, JSON.stringify(stand));
  }
});

test('Die Stärkung gilt genau den Tag, an dem gegessen wurde', () => {
  const stand = { id: 'kraeftig', tag: 7 };
  assert.ok(staerkungHeute(stand, 7), 'am selben Tag wirkt sie nicht');
  assert.equal(staerkungHeute(stand, 8), null, 'sie überlebt die Nacht');
  assert.equal(staerkungHeute(stand, 6), null, 'sie wirkt rückwirkend');
  assert.equal(wuchtBonus(stand, 7), 1);
  assert.equal(wuchtBonus(stand, 8), 0);
});

test('Ein unbekannter Eintrag im Spielstand wirkt einfach nicht', () => {
  // Ein alter Stand oder ein umbenanntes Gericht darf nicht krachen.
  assert.equal(staerkungHeute({ id: 'gibtsnicht', tag: 4 }, 4), null);
  assert.equal(tempoFaktor({ id: 'gibtsnicht', tag: 4 }, 4), 1);
});

/* ---------------- Kochen ---------------- */

test('Was fehlt, wird genau benannt', () => {
  const g = gerichtFuer('dish_forestsoup');
  assert.deepEqual(fehltFuer(g, beutel({})).map((f) => f.id + 'x' + f.n).sort(),
    ['berry x1', 'herb x2', 'mushroom x2'].map((s) => s.replace(' ', '')).sort());
  assert.equal(kannKochen(g, beutel({})), false);
  assert.equal(kannKochen(g, beutel({ mushroom: 2, herb: 2, berry: 1 })), true);
  // Einer zu wenig reicht schon.
  assert.equal(kannKochen(g, beutel({ mushroom: 2, herb: 1, berry: 1 })), false);
  assert.deepEqual(fehltFuer(g, beutel({ mushroom: 2, herb: 1, berry: 1 })),
    [{ id: 'herb', n: 1 }]);
});

test('Mehr als genug schadet nicht', () => {
  const g = gerichtFuer('dish_berrymash');
  assert.equal(kannKochen(g, beutel({ berry: 99 })), true);
  assert.deepEqual(fehltFuer(g, beutel({ berry: 99 })), []);
});

test('Unbekanntes stört nicht', () => {
  assert.equal(istGericht('berry'), false);
  assert.equal(istGericht(undefined), false);
  assert.equal(gerichtFuer('gibtsnicht'), null);
  assert.equal(staerkungVon('gibtsnicht'), null);
  assert.deepEqual(fehltFuer(null, beutel({})), []);
  assert.equal(zutatenWert(null), 0);
});

test('Die Reihenfolge im Fenster steigt vom Leichten zum Seltenen', () => {
  // Wer das Fenster zum ersten Mal öffnet, soll oben etwas finden, das er
  // heute kochen kann – nicht den Mondblütenkuchen.
  const werte = GERICHTE.map((g) => getItem(g.id).value);
  assert.equal(werte[0], Math.min(...werte), 'oben steht nicht das Einfachste');
  assert.equal(werte[werte.length - 1], Math.max(...werte), 'unten steht nicht das Seltenste');
});
