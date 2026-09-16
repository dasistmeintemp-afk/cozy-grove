/**
 * Becken und Falterkasten – zeigen sie das Richtige?
 *
 * Beide führen keine eigene Liste: Das Becken liest die Fanggrößen, der
 * Kasten das Fundbuch. Geprüft wird deshalb die Auswahl – und die hat genau
 * zwei Stellen, an denen sie falsch sein könnte:
 *
 * 1. **Der Maßstab.** Die drei „besten" Fische sind nicht die drei längsten.
 *    Ein Wels wird nun einmal länger als eine Sardine; nach Zentimetern
 *    sortiert schwämmen für immer dieselben drei Arten im Becken.
 * 2. **Die Reihenfolge bei Gleichstand.** Sie darf nicht davon abhängen, in
 *    welcher Reihenfolge die Fänge zufällig im Spielstand stehen – sonst
 *    tauschen die Fische beim Neuladen die Plätze.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAETZE, ZEIGT, zeigtWas, fischeImBecken, falterImKasten, inhaltVon,
  FENSTER, PLAETZE_XY, plaetzeVon,
} from '../../src/game/schaukasten.js';
import { getItem, ITEM_LIST, CAT, BUGS } from '../../src/game/items.js';
import { spanneFuer } from '../../src/game/records.js';

/** Ein Fang, der genau diesen Anteil der Artspanne erreicht. */
function fangMit(id, anteil) {
  const sp = spanneFuer(id);
  return Math.round(sp[0] + (sp[1] - sp[0]) * anteil);
}

test('Nur diese beiden Stücke zeigen etwas', () => {
  assert.equal(zeigtWas('aquarium'), 'fisch');
  assert.equal(zeigtWas('buttercase'), 'falter');
  assert.equal(zeigtWas('bench'), null);
  assert.equal(zeigtWas(null), null);
  // Und was zeigt, muss es auch geben.
  for (const id in ZEIGT) {
    const it = getItem(id);
    assert.ok(it, 'zeigt etwas an, das es nicht gibt: ' + id);
    assert.equal(it.cat, CAT.DECOR, id + ' ist keine Deko');
    assert.ok(it.prop, id + ' hat keine Weltgrafik');
    assert.ok(FENSTER[id], id + ' hat kein Schaufenster');
  }
});

test('Das Becken misst an der Art, nicht in Zentimetern', () => {
  // Eine fast perfekte Sardine schlägt einen mittelmäßigen Wels, obwohl der
  // in Zentimetern deutlich größer ist.
  const sardine = fangMit('fish_sardine', 0.95);
  const wels = fangMit('fish_catfish', 0.3);
  assert.ok(wels > sardine, 'der Wels ist gar nicht länger – die Prüfung misst nichts');

  const liste = fischeImBecken({ fish_sardine: sardine, fish_catfish: wels });
  assert.equal(liste[0].id, 'fish_sardine',
    'nach Zentimetern sortiert (' + sardine + ' vs ' + wels + ')');
  assert.equal(liste[1].id, 'fish_catfish');
});

test('Höchstens drei, und immer die besten', () => {
  const records = {
    fish_sardine: fangMit('fish_sardine', 0.2),
    fish_roach: fangMit('fish_roach', 0.9),
    fish_trout: fangMit('fish_trout', 0.8),
    fish_cod: fangMit('fish_cod', 0.7),
    fish_catfish: fangMit('fish_catfish', 0.1),
  };
  const liste = fischeImBecken(records);
  assert.equal(liste.length, PLAETZE);
  assert.deepEqual(liste.map((f) => f.id), ['fish_roach', 'fish_trout', 'fish_cod']);
});

test('Gleichstand wird immer gleich aufgelöst', () => {
  // Sonst tauschen die Fische beim Neuladen die Plätze.
  const a = { fish_roach: fangMit('fish_roach', 0.5), fish_trout: fangMit('fish_trout', 0.5) };
  const b = { fish_trout: fangMit('fish_trout', 0.5), fish_roach: fangMit('fish_roach', 0.5) };
  assert.deepEqual(fischeImBecken(a).map((f) => f.id), fischeImBecken(b).map((f) => f.id));
});

test('Was kein Fisch ist, schwimmt auch nicht', () => {
  // Ein von Hand bearbeiteter Spielstand könnte alles Mögliche in den
  // Fanggrößen stehen haben.
  const liste = fischeImBecken({ wood: 99, gibtsnicht: 50, fish_trout: 30 });
  assert.deepEqual(liste.map((f) => f.id), ['fish_trout']);
  assert.deepEqual(fischeImBecken({}), []);
  assert.deepEqual(fischeImBecken(null), []);
});

test('Der Kasten zeigt die seltensten Falter', () => {
  const found = { bug_lemon: 9, bug_blue: 4, bug_admiral: 2, bug_luna: 1, bug_moth: 3 };
  const liste = falterImKasten(found);
  assert.equal(liste.length, PLAETZE);
  // Nach Wert absteigend – der Wert steht im ganzen Spiel für die Seltenheit.
  const werte = liste.map((f) => getItem(f.id).value);
  assert.deepEqual(werte.slice().sort((a, b) => b - a), werte, 'nicht nach Seltenheit sortiert');
  assert.equal(liste[0].id, 'bug_luna', 'der Mondfalter ist der seltenste');
});

test('Was kein Falter ist, sitzt auch nicht im Kasten', () => {
  const liste = falterImKasten({ wood: 400, fish_trout: 3, bug_blue: 1, bug_lemon: 0 });
  assert.deepEqual(liste.map((f) => f.id), ['bug_blue'], 'ein Null-Eintrag kam durch');
  assert.deepEqual(falterImKasten({}), []);
  assert.deepEqual(falterImKasten(null), []);
});

test('Jeder Falter hat einen Wert, der ihn von den anderen unterscheidet', () => {
  // Sonst entschiede bei zwei gleich teuren Faltern die Kennung, und die
  // Reihenfolge wäre eine Alphabetsfrage statt einer Seltenheitsfrage.
  const werte = BUGS.map((b) => b.value);
  assert.equal(new Set(werte).size, werte.length,
    'zwei Falter sind gleich viel wert: ' + werte.join(', '));
});

test('inhaltVon fragt für jedes Stück die richtige Liste ab', () => {
  const lage = {
    records: { fish_trout: 30 },
    found: { bug_luna: 1 },
  };
  assert.deepEqual(inhaltVon('aquarium', lage).map((x) => x.id), ['fish_trout']);
  assert.deepEqual(inhaltVon('buttercase', lage).map((x) => x.id), ['bug_luna']);
  assert.deepEqual(inhaltVon('bench', lage), []);
  assert.deepEqual(inhaltVon('aquarium', null), []);
});

test('Die Plätze liegen im Schaufenster und nie übereinander', () => {
  const lage = {
    records: { fish_trout: 30, fish_roach: 14, fish_cod: 40 },
    found: { bug_luna: 1, bug_admiral: 1, bug_blue: 1 },
  };
  for (const id in FENSTER) {
    const f = FENSTER[id];
    const plaetze = plaetzeVon(id, lage);
    assert.equal(plaetze.length, PLAETZE, id + ': ' + plaetze.length + ' Plätze');
    for (const p of plaetze) {
      // Das ganze Tier muss hineinpassen, nicht nur sein Mittelpunkt: Ein
      // Fisch, dessen Schwanz aus dem Becken ragt, ist ein Fisch neben dem
      // Becken. (Die erste Fassung dieser Zeile rechnete die halbe Tiergröße
      // auf BEIDEN Seiten dazu und kürzte sich damit zu einer Behauptung
      // weg, die immer wahr ist.)
      assert.ok(Math.abs(p.dx) + p.groesse / 2 <= f.w / 2,
        id + ': ' + p.id + ' ragt waagerecht heraus (' + p.dx + ' bei Fenster ' + f.w + ')');
      assert.ok(p.dy < 0, id + ': ' + p.id + ' liegt unter dem Fußpunkt');
      assert.ok(Math.abs(p.dy - f.cy) + p.groesse / 2 <= f.h / 2 + p.groesse / 2,
        id + ': ' + p.id + ' ragt senkrecht heraus (' + p.dy + ')');
    }
    for (let i = 1; i < plaetze.length; i++) {
      for (let k = 0; k < i; k++) {
        const d = Math.hypot(plaetze[i].dx - plaetze[k].dx, plaetze[i].dy - plaetze[k].dy);
        assert.ok(d >= plaetze[i].groesse * 0.6,
          id + ': zwei Tiere sitzen aufeinander (' + Math.round(d) + ')');
      }
    }
  }
  assert.deepEqual(plaetzeVon('bench', lage), []);
});

test('Ohne Fang bleibt das Becken leer, statt etwas zu erfinden', () => {
  assert.deepEqual(plaetzeVon('aquarium', {}), []);
  assert.deepEqual(plaetzeVon('buttercase', {}), []);
  // Und mit einem einzigen Fang steht genau einer darin.
  assert.equal(plaetzeVon('aquarium', { records: { fish_trout: 30 } }).length, 1);
});

test('Es gibt genau so viele Plätze, wie Stellen vorgesehen sind', () => {
  assert.equal(PLAETZE_XY.length, PLAETZE);
  // Und alle Kategorien, die gezeigt werden, gibt es auch wirklich.
  const fische = ITEM_LIST.filter((i) => i.cat === CAT.FISH).length;
  assert.ok(fische >= PLAETZE, 'es gibt weniger Fischarten als Plätze im Becken');
  assert.ok(BUGS.length >= PLAETZE, 'es gibt weniger Falterarten als Plätze im Kasten');
});
