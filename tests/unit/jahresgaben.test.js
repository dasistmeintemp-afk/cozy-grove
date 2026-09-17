/**
 * Die Jahresgaben – hat jede Jahreszeit etwas, und führt es zu etwas?
 *
 * Das Feature hat zwei Hälften, und beide können einzeln kaputtgehen:
 *
 * 1. **Es gibt sie nur dann.** Eine Gabe, die das ganze Jahr herumliegt, ist
 *    ein weiteres Fundstück und kein Grund, im Januar hinauszugehen.
 * 2. **Man kann etwas daraus machen.** Ein Fundstück, das man nur verkaufen
 *    kann, ist Geld mit einem Namen. Erst der Kranz macht aus drei Monaten
 *    eine Erinnerung, die an der Wand hängen bleibt.
 *
 * Die dritte Gefahr ist die stillste: Ein Geist bittet um einen Blütenkranz,
 * und man wartet bis März. Dagegen wacht `verlaesslich` – hier wird
 * nachgesehen, dass es wirklich greift.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM_LIST, getItem, CAT, CONDITIONAL, BEDINGUNGEN, bedingteVon,
} from '../../src/game/items.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { RECIPES } from '../../src/game/recipes.js';
import { CRAFTABLE_ASKS, COOK_ASKS, verlaesslich } from '../../src/game/quests.js';
import { SEASON_IDS } from '../../src/game/calendar.js';
import { HINTS as QUELLEN_TEXT } from '../../src/game/collection.js';

const GABEN = bedingteVon('jahreszeit');
const KRAENZE = ['wreath_spring', 'wreath_summer', 'wreath_autumn', 'wreath_winter'];

test('Jede Jahreszeit hat genau eine Gabe, und jede Gabe eine Jahreszeit', () => {
  assert.equal(GABEN.length, SEASON_IDS.length);
  const nach = GABEN.map((g) => g.onlyAt).sort();
  assert.deepEqual(nach, SEASON_IDS.slice().sort());
});

test('Jede Gabe liegt wirklich in der Welt', () => {
  // Ein Gegenstand mit `onlyAt`, zu dem es keine Objektdefinition gibt,
  // wäre ein Eintrag im Fundbuch, den niemand je findet.
  for (const g of GABEN) {
    const def = ENTITY_DEFS[g.id];
    assert.ok(def, g.id + ': keine Objektdefinition');
    assert.equal(def.category, 'forage', g.id);
    assert.equal(def.sprite, g.id, g.id + ': malt etwas anderes');
    // Kein `respawn`: Sie kommen über die Bedingung zurück, nicht über Tage –
    // genau wie Mondblume, Regenpilz und Nebelkristall.
    assert.equal(def.respawn, undefined, g.id + ' wächst zusätzlich nach');
    assert.ok(g.spawn > 0, g.id + ' braucht eine Aussaatzahl');
    assert.ok(g.value > 20, g.id + ' soll sich lohnen: ' + g.value);
  }
});

test('Aus jeder Gabe wird genau ein Kranz', () => {
  // Das ist die zweite Hälfte des Features. Drei Gaben mit Kranz und eine
  // ohne wären drei gute Jahreszeiten und eine, in der man sammelt, ohne zu
  // wissen wofür.
  for (const g of GABEN) {
    const rezepte = RECIPES.filter(function (r) {
      return r.cost.some(function (c) { return c.id === g.id; });
    });
    assert.equal(rezepte.length, 1,
      g.id + ': ' + rezepte.length + ' Rezepte statt genau einem');
    assert.ok(KRAENZE.indexOf(rezepte[0].id) >= 0, g.id + ' führt zu ' + rezepte[0].id);
  }
});

test('Kein Kranz braucht die Gabe einer anderen Jahreszeit', () => {
  // Sonst wäre der Eiskranz erst im zweiten Jahr zu bauen – und der Grund
  // dafür stünde nirgends.
  for (const id of KRAENZE) {
    const rec = RECIPES.find(function (r) { return r.id === id; });
    assert.ok(rec, 'Rezept ' + id + ' fehlt');
    const gaben = rec.cost.filter(function (c) {
      const z = getItem(c.id);
      return z && BEDINGUNGEN[z.onlyAt] === 'jahreszeit';
    });
    assert.equal(gaben.length, 1, id + ': ' + gaben.length + ' Jahresgaben in einem Rezept');
    // Und zwar die, die zum Namen passt.
    assert.equal('wreath_' + getItem(gaben[0].id).onlyAt, id,
      id + ' braucht ' + gaben[0].id);
  }
});

test('Die Kränze hängen an der Wand und haben ihre eigene Grafik', () => {
  const gesehen = {};
  for (const id of KRAENZE) {
    const it = getItem(id);
    assert.ok(it, id + ' gibt es nicht');
    assert.equal(it.cat, CAT.DECOR);
    assert.ok(it.wand === true, id + ' hängt nicht');
    assert.ok(it.charm > getItem('wreath').charm,
      id + ': nicht mehr wert als der gewöhnliche Kranz');
    assert.ok(!gesehen[it.prop], id + ' malt dasselbe wie ' + gesehen[it.prop]);
    gesehen[it.prop] = id;
  }
});

test('Niemand bittet um etwas, das drei Monate nicht zu haben ist', () => {
  // Die stillste Gefahr: Vier Tage Frist auf einen Blütenkranz im Juli.
  // Vorher stand hier eine von Hand geschriebene Liste `{ rain, fog }` –
  // die vier Gaben hätte sie stillschweigend durchgewunken.
  for (const g of GABEN) {
    assert.ok(!verlaesslich(g.id), g.id + ' gilt als jederzeit beschaffbar');
  }
  // Die Nacht dagegen kommt jeden Tag.
  assert.ok(verlaesslich('moonflower'));
  assert.ok(verlaesslich('wood'), 'gewöhnliches Material gilt als verlässlich');
  assert.ok(verlaesslich('gibtsnicht'), 'Unbekanntes blockiert nichts');

  for (const id of KRAENZE) {
    assert.ok(CRAFTABLE_ASKS.indexOf(id) < 0, 'es wird um ' + id + ' gebeten');
  }
  for (const id of COOK_ASKS) {
    const rec = RECIPES.find(function (r) { return r.id === id; });
    if (!rec) continue;
    for (const c of rec.cost) {
      assert.ok(verlaesslich(c.id), id + ' kocht mit ' + c.id);
    }
  }
});

test('Jede Gabe und jeder Kranz sagt, woher er kommt', () => {
  // Dieselbe Regel wie für jeden anderen Gegenstand – hier noch einmal
  // ausdrücklich, weil „im Winter am Boden" ein Fingerzeig ist, den man
  // wirklich braucht: Wer im Juli danach sucht, findet nichts und weiß
  // sonst nicht, ob es an ihm liegt.
  for (const g of GABEN) {
    const t = QUELLEN_TEXT[g.id];
    assert.ok(t && t.length > 10, g.id + ': kein Fingerzeig');
    // Die Jahreszeit muss darin vorkommen, sonst sucht man umsonst.
    assert.ok(/Frühling|Sommer|Herbst|Winter/.test(t),
      g.id + ': der Fingerzeig nennt die Jahreszeit nicht: ' + t);
  }
  for (const id of KRAENZE) {
    assert.ok(QUELLEN_TEXT[id], id + ': kein Fingerzeig');
  }
});

test('Die Gaben stehen nicht im Weg der übrigen bedingten Funde', () => {
  // Keine zwei bedingten Vorkommen teilen sich eine Bedingung: Sonst lägen
  // sie immer gemeinsam da, und eines von beiden wäre überflüssig.
  const alle = CONDITIONAL.map(function (i) { return i.onlyAt; });
  assert.equal(new Set(alle).size, alle.length, 'zwei Vorkommen, eine Bedingung');
  // Und jede Bedingung ist im Modell erklärt.
  for (const b of alle) {
    assert.ok(BEDINGUNGEN[b], 'unbekannte Bedingung ' + b);
  }
});

test('Eine Gabe ist nicht versehentlich ein Fisch oder Falter geworden', () => {
  // Fische und Falter haben ihre eigene Jahreszeitregel (`SEASON_ONLY`).
  // Eine Art mit BEIDEN wäre doppelt gesperrt, und niemand wüsste warum.
  for (const it of ITEM_LIST) {
    if (!it.onlyAt) continue;
    assert.ok(it.cat !== CAT.FISH && it.cat !== CAT.BUG,
      it.id + ': eine Art mit zwei Jahreszeitregeln');
  }
});
