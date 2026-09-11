/**
 * Hat jeder Gegenstand eine Quelle?
 *
 * Der Anlass war ein echter Fund: Die **Feder** stand seit jeher in der
 * Gegenstandsliste, im Botengang-Pool der Aufträge, im Fundbuch und im
 * Tagesgesuch des Händlers – aber es gab sie nirgends. Kein Objekt ließ sie
 * fallen, kein Rezept, kein Laden, kein Katalog, keine Post. Gemessen waren
 * das acht unlösbare Aufträge in neunzig Tagen, und die Materialreihe im
 * Fundbuch konnte nie voll werden. Der Fingerzeig sagte sogar „Aus
 * Grabstellen" – und Grabstellen gaben keine Federn.
 *
 * Dieser Test ist die Zusicherung dagegen: Was das Spiel verlangt, muss es
 * auch hergeben.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { ITEM_LIST, getItem, CAT } from '../../src/game/items.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { RECIPES } from '../../src/game/recipes.js';
import { KATALOG } from '../../src/game/catalog.js';
import { GERICHTE } from '../../src/game/kitchen.js';
import { CROPS, CROP_IDS } from '../../src/game/crops.js';
import { SPIRITS, SPIRIT_IDS, friendshipGift } from '../../src/game/spirits.js';
import { MILESTONES } from '../../src/game/milestones.js';
import { POOLS, SET_POOLS, DELIVER_POOL, CRAFTABLE_ASKS } from '../../src/game/quests.js';
import { HINTS } from '../../src/game/collection.js';
import { makeRng } from '../../src/core/rng.js';

/**
 * Alles, was man auf irgendeinem Weg bekommen kann.
 *
 * Erinnerungsstücke und Andenken stehen bewusst NICHT hier drin: Die kommen
 * aus den Erinnerungsketten der Geister, und die stehen in stories.js. Sie
 * werden unten einzeln behandelt.
 */
function erreichbar() {
  const q = Object.create(null);
  const mark = function (id, wo) {
    if (!id) return;
    if (!q[id]) q[id] = [];
    if (q[id].indexOf(wo) < 0) q[id].push(wo);
  };

  for (const kind of Object.keys(ENTITY_DEFS)) {
    const def = ENTITY_DEFS[kind];
    if (!def.yield) continue;
    // Ausbeuten sind Zufallsfunktionen; über viele Würfe sieht man alles,
    // was überhaupt fallen kann.
    for (let lvl = 1; lvl <= 4; lvl++) {
      for (let i = 0; i < 300; i++) {
        const out = def.yield(lvl, makeRng(i * 7919 + lvl)) || [];
        for (const d of out) mark(d.id, 'abbauen:' + kind);
      }
    }
  }
  for (const r of RECIPES) if (r.out) mark(r.out.id, 'werkbank:' + r.id);
  for (const e of KATALOG) mark(e.id, 'katalog');
  for (const g of GERICHTE) mark(g.id, 'kochstelle:' + g.id);
  for (const id of CROP_IDS) {
    for (const y of CROPS[id].yields) mark(y, 'ernte:' + id);
    mark(CROPS[id].seed, 'saat');
  }
  for (const it of ITEM_LIST) {
    if (it.cat === CAT.FISH) mark(it.id, 'angeln');
    if (it.cat === CAT.BUG) mark(it.id, 'kescher');
  }
  for (const m of MILESTONES) {
    if (m.gift && m.gift.items) for (const g of m.gift.items) mark(g.id, 'meilenstein');
  }
  for (const id of SPIRIT_IDS) {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const g = friendshipGift(id, lvl);
      if (g && g.items) for (const it of g.items) mark(it.id, 'freundschaft:' + id);
    }
  }
  return q;
}

const QUELLEN = erreichbar();

/* ---------------- Wohin das Seltene geht ---------------- */

test('Was selten ist, hat auch eine Verwendung', () => {
  // Gemessen, bevor diese Prüfung stand: Die drei wertvollsten Materialien
  // des Spiels – Sternenstaub (38), Bernstein (70), Granit (19) – mochte
  // NIEMAND, und Sternenstaub kam in keinem einzigen Rezept vor. Der
  // seltenste Fund des Spiels, aus einem Ereignis, das ein paarmal im Monat
  // kommt, war ausschließlich Geld.
  //
  // „Verwendung" heißt: in einem Bauplan, in einem Gericht, oder ein Geist
  // freut sich darüber. Verkaufen zählt nicht – das kann man mit Holz auch.
  const mag = new Set();
  for (const id of SPIRIT_IDS) for (const l of SPIRITS[id].likes) mag.add(l);
  const inRezept = new Set();
  for (const r of RECIPES) for (const c of r.cost) inRezept.add(c.id);
  for (const g of GERICHTE) for (const z of g.zutaten) inRezept.add(z.id);

  const ohne = [];
  for (const it of ITEM_LIST) {
    // Nur Material und Fundstücke: Fische und Falter gehören ins Fundbuch
    // und in die Bitten, Deko wird aufgestellt, Gerichte werden gegessen.
    if (it.cat !== CAT.MATERIAL && it.cat !== CAT.RELIC) continue;
    if (it.value < 15) continue;          // Billiges darf schlicht Geld sein
    if (it.id === 'coin_pouch') continue; // öffnet sich von selbst
    if (mag.has(it.id) || inRezept.has(it.id)) continue;
    ohne.push(it.name + ' (' + it.value + ')');
  }
  assert.deepEqual(ohne, [], 'selten und zu nichts zu gebrauchen: ' + ohne.join(', '));
});
/** Kommt aus den Erinnerungsketten, nicht aus der Welt. */
const AUS_GESCHICHTEN = function (id) {
  return id.indexOf('memory_') === 0 || id.indexOf('keepsake_') === 0;
};

test('Jeder Gegenstand hat eine Quelle', () => {
  const ohne = [];
  for (const it of ITEM_LIST) {
    if (AUS_GESCHICHTEN(it.id)) continue;
    if (!QUELLEN[it.id]) ohne.push(it.id + ' (' + it.name + ')');
  }
  assert.deepEqual(ohne, [], 'ohne jede Quelle im Spiel: ' + ohne.join(', '));
});

test('Kein Auftrag verlangt etwas, das es nicht gibt', () => {
  // Genau das war der Fehler: Ein Geist bat um Federn, und man konnte die
  // Bitte niemals erfüllen – sie lief nach drei bis fünf Tagen ab.
  const pools = [];
  for (const k of Object.keys(POOLS)) pools.push([k, POOLS[k]]);
  for (const k of Object.keys(SET_POOLS)) pools.push(['satz:' + k, SET_POOLS[k]]);
  pools.push(['botengang', DELIVER_POOL]);
  pools.push(['bauen', CRAFTABLE_ASKS]);

  for (const [name, liste] of pools) {
    for (const id of liste) {
      assert.ok(getItem(id), name + ': ' + id + ' gibt es gar nicht');
      assert.ok(QUELLEN[id], name + ': ' + id + ' lässt sich nirgends bekommen');
    }
  }
});

test('Jede Reihe im Fundbuch lässt sich vollmachen', () => {
  // Eine Reihe, in der ein unerreichbarer Gegenstand steht, hat eine
  // Belohnung, die niemand je bekommt.
  const kategorien = Object.create(null);
  for (const it of ITEM_LIST) {
    if (AUS_GESCHICHTEN(it.id)) continue;
    if (!kategorien[it.cat]) kategorien[it.cat] = [];
    if (!QUELLEN[it.id]) kategorien[it.cat].push(it.id);
  }
  for (const cat of Object.keys(kategorien)) {
    assert.deepEqual(kategorien[cat], [],
      'Reihe ' + cat + ' enthält Unerreichbares: ' + kategorien[cat].join(', '));
  }
});

test('Der Fingerzeig zeigt nicht auf eine falsche Quelle', () => {
  // „Aus Grabstellen" stand bei der Feder, und Grabstellen gaben keine.
  // Vollständig prüfen lässt sich ein deutscher Satz nicht – aber die
  // wenigen Fälle, in denen der Hinweis eine Grabstelle nennt, müssen
  // wirklich aus einer kommen.
  const graben = [];
  for (const id of Object.keys(HINTS)) {
    if (!/Grabstelle/i.test(HINTS[id])) continue;
    graben.push(id);
    const wege = QUELLEN[id] || [];
    assert.ok(wege.some((w) => w.indexOf('digspot') >= 0),
      id + ': der Hinweis nennt Grabstellen, dort fällt es aber nicht');
  }
  assert.ok(graben.length > 0, 'kein einziger Hinweis nennt Grabstellen – Test prüft nichts');
});
