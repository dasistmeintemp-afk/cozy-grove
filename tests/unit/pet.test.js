/**
 * Das Haustier.
 *
 * Die Tests halten die drei Entscheidungen fest, die es von einem
 * Anhängsel unterscheiden: Es kommt nicht aus einem Menü, es hat eine
 * Aufgabe, und Vernachlässigung nimmt einem nichts weg – sie gibt nur
 * weniger. Die letzte ist die wichtigste: Ein Tier, das wegläuft, wäre in
 * diesem Spiel eine Strafe, und Strafen gibt es hier nirgends.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FUTTER, RUHE_DEKO, PET_MILESTONE, ZAHM_NOETIG, LAUNE_MAX, LAUNE_SUCHT_AB,
  LAUNE_PRO_TAG, emptyPet, petArtFor, futterWert, bestesFutter, istZahm,
  istStreuner, launeAmMorgen, darfFuettern, suchtHeute, petStatus, launeWort,
  istRuheplatz,
} from '../../src/game/pet.js';
import { getItem, CAT } from '../../src/game/items.js';
import { MILESTONES } from '../../src/game/milestones.js';
import { KATALOG } from '../../src/game/catalog.js';
import { Inventory } from '../../src/game/inventory.js';

test('Futter und Ruheplätze zeigen auf echte Dinge', () => {
  for (const id in FUTTER) {
    const item = getItem(id);
    assert.ok(item, id + ' steht auf der Futterliste, gibt es aber nicht');
    assert.ok(FUTTER[id] > 0, id + ' hat keinen Wert');
    // Kein Material und keine Deko: Ein Tier, das Steine frisst, ist ein Witz,
    // den man einmal macht.
    assert.ok(item.cat === CAT.FISH || item.cat === CAT.FORAGE,
      id + ' ist weder Fisch noch Sammelgut');
  }
  for (const id in RUHE_DEKO) {
    const item = getItem(id);
    assert.ok(item, id + ' ist Ruheplatz, gibt es aber nicht');
    assert.equal(item.cat, CAT.DECOR, id + ' ist keine Deko');
    assert.ok(item.prop, id + ' hat keine Weltgrafik');
  }
  assert.equal(istRuheplatz('bench'), true);
  assert.equal(istRuheplatz('fence'), false, 'auf einem Zaun sitzt keine Katze');
  assert.equal(istRuheplatz(null), false);
});

test('Der Napf hängt am Meilenstein und steht im Katalog', () => {
  const meilen = MILESTONES.map((m) => m.id);
  assert.ok(meilen.indexOf(PET_MILESTONE) >= 0, PET_MILESTONE + ' gibt es nicht');
  const eintrag = KATALOG.filter((e) => e.id === 'bowl')[0];
  assert.ok(eintrag, 'der Napf steht nicht im Katalog');
  assert.equal(eintrag.needs, PET_MILESTONE);
  assert.ok(eintrag.preis > 0);
});

test('Welche Art kommt, entscheidet die Insel – aber immer dieselbe', () => {
  // Aus dem Seed statt aus einem Menü: Das Tier, das vorbeikommt, ist das
  // Tier, das vorbeikommt. Und es darf nicht bei jedem Laden wechseln.
  const arten = Object.create(null);
  for (let i = 0; i < 200; i++) {
    const a = petArtFor(i * 7919);
    assert.ok(a === 'cat' || a === 'dog', 'unbekannte Art ' + a);
    arten[a] = (arten[a] || 0) + 1;
    assert.equal(petArtFor(i * 7919), a, 'dieselbe Insel, andere Art');
  }
  assert.ok(arten.cat > 40 && arten.dog > 40,
    'eine Art kommt fast nie vor: ' + JSON.stringify(arten));
});

test('Drei Mal füttern, dann bleibt es', () => {
  const p = emptyPet();
  assert.equal(istZahm(p), false);
  assert.equal(istStreuner(p), false, 'ohne Art ist da noch gar nichts');
  p.art = 'cat';
  assert.equal(istStreuner(p), true);
  for (let i = 1; i < ZAHM_NOETIG; i++) {
    p.zahm = i;
    assert.equal(istZahm(p), false, 'nach ' + i + '× ist es noch fremd');
    assert.equal(istStreuner(p), true);
  }
  p.zahm = ZAHM_NOETIG;
  assert.equal(istZahm(p), true);
  assert.equal(istStreuner(p), false);
});

test('Gefüttert wird einmal am Tag', () => {
  const p = emptyPet();
  p.art = 'dog';
  assert.equal(darfFuettern(p, 5), true);
  p.gefuettertAm = 5;
  assert.equal(darfFuettern(p, 5), false);
  assert.equal(darfFuettern(p, 6), true, 'am nächsten Tag wieder');
});

test('Ein ausgelassener Tag kostet Laune – mehr nicht', () => {
  const p = emptyPet();
  p.art = 'cat';
  p.zahm = ZAHM_NOETIG;
  p.laune = LAUNE_MAX;
  p.gefuettertAm = 10;

  assert.equal(launeAmMorgen(p, 10), LAUNE_MAX, 'am selben Tag ändert sich nichts');
  assert.equal(launeAmMorgen(p, 11), LAUNE_MAX + LAUNE_PRO_TAG);
  // Und sie fällt nie unter null – das Tier läuft NICHT weg.
  p.laune = 5;
  assert.equal(launeAmMorgen(p, 20), 0);
  assert.equal(istZahm(p), true, 'auch hungrig bleibt es deins');
});

test('Hungrig sucht es nichts', () => {
  const p = emptyPet();
  p.art = 'cat';
  p.zahm = ZAHM_NOETIG;
  p.laune = LAUNE_MAX;
  assert.equal(suchtHeute(p, 3), true);
  // Schon gefunden heute
  p.fundAm = 3;
  assert.equal(suchtHeute(p, 3), false);
  assert.equal(suchtHeute(p, 4), true);
  // Zu hungrig
  p.laune = LAUNE_SUCHT_AB - 1;
  assert.equal(suchtHeute(p, 4), false);
  p.laune = LAUNE_SUCHT_AB;
  assert.equal(suchtHeute(p, 4), true);
  // Ein Streuner sucht ohnehin nicht
  p.zahm = 1;
  assert.equal(suchtHeute(p, 4), false);
});

test('Es nimmt das Beste, was da ist', () => {
  const t = new Inventory(30);
  assert.equal(bestesFutter(t), null);
  t.add('herb', 5);
  assert.equal(bestesFutter(t), 'herb');
  t.add('berry', 1);
  assert.equal(bestesFutter(t), 'berry', 'Beeren vor Kraut');
  t.add('fish_cod', 1);
  assert.equal(bestesFutter(t), 'fish_cod', 'Fisch vor allem');
  t.add('fish_goldcarp', 1);
  assert.equal(bestesFutter(t), 'fish_goldcarp', 'der beste Fisch zuerst');
  assert.equal(futterWert('stone'), 0, 'Steine frisst es nicht');
  assert.equal(bestesFutter(null), null);
});

test('Der Stand fürs Fenster stimmt mit dem Zustand überein', () => {
  const p = emptyPet();
  let st = petStatus(p, 1);
  assert.equal(st.zahm, false);
  assert.equal(st.streuner, false);

  p.art = 'dog';
  p.zahm = 2;
  st = petStatus(p, 1);
  assert.equal(st.streuner, true);
  assert.equal(st.fortschritt, 2);
  assert.equal(st.noetig, ZAHM_NOETIG);

  p.zahm = ZAHM_NOETIG;
  p.laune = 90;
  st = petStatus(p, 1);
  assert.equal(st.zahm, true);
  assert.equal(st.laune, 90);
  assert.equal(petStatus(null, 1).zahm, false, 'ohne Stand kein Absturz');
});

test('Die Laune hat für jeden Bereich ein Wort', () => {
  const worte = new Set();
  for (let l = 0; l <= LAUNE_MAX; l += 5) {
    const w = launeWort(l);
    assert.ok(w && w.length > 3, 'Laune ' + l + ' ohne Wort');
    worte.add(w);
  }
  assert.ok(worte.size >= 3, 'die Wörter unterscheiden zu wenig');
});
