/**
 * Wunschplätze – das Spiel nach dem Spiel.
 *
 * Bei hundert Prozent ist die Insel bunt und alle Meilensteine sind erreicht.
 * Danach lief nur der Tagesbetrieb weiter: dieselben Bitten, dieselbe Runde.
 * Die Wünsche sind das, was nicht aufhört – die Geister hören auf, Farbe zu
 * brauchen, und fangen an, sich Orte zu wünschen.
 *
 * Weil ein Wunsch aus Bausteinen zusammengesetzt wird statt geschrieben zu
 * sein, gilt hier dieselbe Gefahr wie damals bei der Feder, nur schlimmer:
 * Eine einzige unerfüllbare Kombination taucht irgendwann bei jedem auf und
 * bleibt dann für immer stehen. Deshalb prüft dieser Test JEDE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SORTEN, SORT_IDS, ORTE, ORT_IDS, ZUGABEN, ZUGAB_IDS, MAX_OFFEN,
  WUNSCH_MEILENSTEIN, ZUGABE_RADIUS,
  wunschBauen, pruefeWunsch, wunschLohn, wunschText, wunschTitel, wunschIcon,
  orteFuer, emptyWishes,
} from '../../src/game/wishes.js';
import { World, TILE_SIZE } from '../../src/world/world.js';
import { isWalkable } from '../../src/art/tiles.js';
import { MAP_W, MAP_H } from '../../src/world/worldgen.js';
import { getItem, CAT, ITEM_LIST } from '../../src/game/items.js';
import { MILESTONES } from '../../src/game/milestones.js';
import { makeRng } from '../../src/core/rng.js';

const SEED = 4711;

function offeneWelt() {
  const welt = new World(SEED).populate();
  for (let r = 1; r <= 3; r++) welt.unlockRegion(r);
  return welt;
}

const WELT = offeneWelt();

/** Eine begehbare Kachel, die diesen Ort erfüllt – oder null. */
function stelleFuer(welt, ortId) {
  const ort = ORTE[ortId];
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const x = (tx + 0.5) * TILE_SIZE;
      const y = (ty + 0.5) * TILE_SIZE;
      if (!isWalkable(welt.tileAtTile(tx, ty))) continue;
      if (!ort.test(welt, x, y)) continue;
      return { x: x, y: y };
    }
  }
  return null;
}

/** Deko hinstellen, ohne das Spiel zu bemühen. */
function stellHin(welt, itemId, x, y, nr) {
  return welt.add({
    id: 800000 + nr, kind: 'decor', itemId: itemId, x: x, y: y, sprite: itemId,
  });
}

/* ---------------- Die Bausteine ---------------- */

test('Jede Sorte besteht aus Deko, die es wirklich gibt', () => {
  // Ein Tippfehler hier wäre ein Wunsch, den man mit nichts erfüllen kann.
  for (const id of SORT_IDS) {
    const s = SORTEN[id];
    assert.ok(s.items.length >= 3, id + ': zu wenig Auswahl – das ist eine Einkaufsliste');
    for (const it of s.items) {
      const item = getItem(it);
      assert.ok(item, id + ': „' + it + '" gibt es nicht');
      assert.equal(item.cat, CAT.DECOR, id + ': ' + it + ' ist keine Deko');
      assert.ok(item.prop, id + ': ' + it + ' lässt sich nicht aufstellen');
    }
  }
});

test('Der Meilenstein, ab dem gewünscht wird, existiert', () => {
  assert.ok(MILESTONES.some((m) => m.id === WUNSCH_MEILENSTEIN),
    WUNSCH_MEILENSTEIN + ' ist kein Meilenstein');
});

test('Jeder Ort kommt auf der Karte oft genug vor', () => {
  // Ein Ort mit drei passenden Kacheln wäre eine Schnitzeljagd, kein Wunsch.
  for (const id of ORT_IDS) {
    let n = 0;
    for (let ty = 2; ty < MAP_H - 2; ty += 2) {
      for (let tx = 2; tx < MAP_W - 2; tx += 2) {
        const x = (tx + 0.5) * TILE_SIZE;
        const y = (ty + 0.5) * TILE_SIZE;
        if (!isWalkable(WELT.tileAtTile(tx, ty))) continue;
        if (ORTE[id].test(WELT, x, y)) n++;
      }
    }
    assert.ok(n >= 20, id + ': nur ' + n + ' passende Stellen auf der ganzen Karte');
  }
});

/* ---------------- Erfüllbarkeit ---------------- */

test('JEDE Kombination aus Sorte und Ort lässt sich erfüllen', () => {
  // Der wichtigste Test der Datei. Eine unerfüllbare Kombination taucht bei
  // jedem Spieler irgendwann auf und bleibt dann für immer stehen – dieselbe
  // Falle wie die Feder ohne Quelle, nur dass sie sich selbst nachlegt.
  let nr = 0;
  for (const sorte of SORT_IDS) {
    for (const ort of ORT_IDS) {
      const welt = offeneWelt();
      const stelle = stelleFuer(welt, ort);
      assert.ok(stelle, ort + ': keine einzige passende Stelle');
      // Ein einzelnes Stück der Sorte genügt für einen Wunsch ohne Zugabe.
      stellHin(welt, SORTEN[sorte].items[0], stelle.x, stelle.y, nr++);
      const w = { sorte: sorte, ort: ort, zugabe: 'keine', satz: 0 };
      assert.equal(pruefeWunsch(w, welt).erfuellt, true,
        sorte + ' ' + ort + ': mit passender Deko am passenden Ort nicht erfüllt');
    }
  }
});

test('Auch die Zugaben lassen sich erfüllen', () => {
  let nr = 5000;
  for (const zugabe of ZUGAB_IDS) {
    const z = ZUGABEN[zugabe];
    const welt = offeneWelt();
    const stelle = stelleFuer(welt, 'wald');
    // Genug Stücke derselben Sorte, und genug Charme drumherum.
    const sorte = SORTEN.sitz;
    for (let i = 0; i < Math.max(3, z.stueck); i++) {
      stellHin(welt, sorte.items[i % sorte.items.length],
        stelle.x + i * 30, stelle.y, nr++);
    }
    // Charme auffüllen, falls die Zugabe ihn verlangt
    for (let i = 0; i < 6; i++) {
      stellHin(welt, 'moonlamp', stelle.x + 20, stelle.y + 20 + i * 10, nr++);
    }
    const w = { sorte: 'sitz', ort: 'wald', zugabe: zugabe, satz: 0 };
    assert.equal(pruefeWunsch(w, welt).erfuellt, true, zugabe + ': nicht erfüllbar');
  }
});

test('Falsche Sorte oder falscher Ort erfüllt nichts', () => {
  // Die Gegenprobe. Ohne sie prüfte der Test darüber nur, dass die Funktion
  // manchmal `true` sagt.
  const welt = offeneWelt();
  const imWald = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', imWald.x, imWald.y, 9001);

  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'keine' }, welt).erfuellt,
    true, 'die Bank im Wald erfüllt den Sitzwunsch im Wald');
  assert.equal(pruefeWunsch({ sorte: 'licht', ort: 'wald', zugabe: 'keine' }, welt).erfuellt,
    false, 'eine Bank ist kein Licht');
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'klippen', zugabe: 'keine' }, welt).erfuellt,
    false, 'die Bank steht im Wald, nicht auf den Klippen');
});

test('Eine Zugabe verlangt wirklich mehr', () => {
  const welt = offeneWelt();
  const stelle = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', stelle.x, stelle.y, 9100);
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'keine' }, welt).erfuellt, true);
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'mehrere' }, welt).erfuellt,
    false, 'eine einzelne Bank darf „nicht nur eins" nicht erfüllen');
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'gemuetlich' }, welt).erfuellt,
    false, 'eine einzelne Bank ist nicht „ringsum gemütlich"');
});

test('Entfernte Deko zählt nicht zur Nachbarschaft', () => {
  // Knapp außerhalb, nicht weit weg: `queryNear` arbeitet auf einem Raster
  // von 160 Pixeln und liefert bei Reichweite 260 gemessen auch noch Dinge
  // in 280 und 320 Pixeln Entfernung. Die genaue Abstandsprüfung dahinter
  // ist also keine Zierde – mit Kandidaten in doppelter Entfernung hätte
  // dieser Test sie gar nicht bemerkt.
  const welt = offeneWelt();
  const stelle = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', stelle.x, stelle.y, 9200);
  // Auf VERSCHIEDENE Seiten: Nebeneinander wären die beiden füreinander in
  // Reichweite und zählten sich gegenseitig – dann stünde dort ja auch
  // wirklich ein Platz, nur eben nicht bei der Bank.
  stellHin(welt, 'chair', stelle.x + ZUGABE_RADIUS + 20, stelle.y, 9201);
  stellHin(welt, 'hammock', stelle.x - ZUGABE_RADIUS - 20, stelle.y, 9202);
  const stand = pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'mehrere' }, welt);
  assert.equal(stand.erfuellt, false,
    'drei Sitzgelegenheiten außer Reichweite sind kein gemeinsamer Platz');
  assert.equal(stand.stueck, 1, 'keine steht mit einer anderen beieinander');
});

test('Der Fortschritt sagt, wie weit es noch ist', () => {
  // Ohne Rückmeldung wäre ein Wunsch Raten. Die Zahl muss also steigen,
  // wenn man etwas danebenstellt.
  const welt = offeneWelt();
  const stelle = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', stelle.x, stelle.y, 9300);
  const w = { sorte: 'sitz', ort: 'wald', zugabe: 'gemuetlich' };
  const vorher = pruefeWunsch(w, welt).charme;
  stellHin(welt, 'moonlamp', stelle.x + 40, stelle.y, 9301);
  const nachher = pruefeWunsch(w, welt).charme;
  assert.ok(nachher > vorher, 'die Gemütlichkeit muss steigen (' + vorher + ' → ' + nachher + ')');
});

/* ---------------- Nachschub ---------------- */

test('Wünsche wiederholen sich nicht innerhalb der offenen Liste', () => {
  const rng = makeRng(99);
  const belegt = Object.create(null);
  const gebaut = [];
  for (let i = 0; i < MAX_OFFEN; i++) {
    const w = wunschBauen(WELT, 'mira', 10, rng, belegt);
    assert.ok(w, 'kein Wunsch gebaut');
    const key = w.sorte + ':' + w.ort;
    assert.ok(!belegt[key], 'derselbe Wunsch zweimal offen: ' + key);
    belegt[key] = 1;
    gebaut.push(key);
  }
  assert.equal(new Set(gebaut).size, MAX_OFFEN);
});

test('Sie gehen nicht aus', () => {
  // Der ganze Sinn: Nach hundert erfüllten Wünschen muss noch einer kommen.
  const rng = makeRng(5);
  const gesehen = new Set();
  for (let i = 0; i < 400; i++) {
    const w = wunschBauen(WELT, 'mira', 10 + i, rng, null);
    assert.ok(w, 'nach ' + i + ' Wünschen kam keiner mehr');
    gesehen.add(w.sorte + ':' + w.ort + ':' + w.zugabe);
  }
  assert.ok(gesehen.size > 60,
    'nur ' + gesehen.size + ' verschiedene Wünsche – das wiederholt sich zu schnell');
});

test('Gesperrte Bereiche kommen nicht vor', () => {
  // Dieselbe Regel wie bei den Tagesbitten: kein Wunsch nach den Klippen,
  // bevor die Brücke steht.
  const zu = new World(SEED).populate();
  const offen = orteFuer(zu);
  assert.ok(offen.indexOf('wald') < 0, 'der Wald ist noch zu');
  assert.ok(offen.indexOf('klippen') < 0, 'die Klippen sind noch zu');
  assert.ok(offen.indexOf('lager') >= 0, 'das Lager ist von Anfang an offen');
  assert.ok(offen.length >= 3, 'am Anfang muss es trotzdem Wünsche geben können');

  const rng = makeRng(3);
  for (let i = 0; i < 60; i++) {
    const w = wunschBauen(zu, 'flamey', 5, rng, null);
    assert.ok(offen.indexOf(w.ort) >= 0, w.ort + ' ist gesperrt und wurde trotzdem gewünscht');
  }
});

/* ---------------- Text und Lohn ---------------- */

test('Jeder Wunsch hat einen Satz, der wie ein Satz aussieht', () => {
  for (const sorte of SORT_IDS) {
    for (const ort of ORT_IDS) {
      for (const zugabe of ZUGAB_IDS) {
        for (const satz of [0, 1, 2, 3]) {
          const t = wunschText({ sorte: sorte, ort: ort, zugabe: zugabe, satz: satz });
          assert.ok(t.length > 15, sorte + '/' + ort + ': Satz zu kurz');
          assert.ok(t.indexOf('$ORT') < 0, sorte + '/' + ort + ': Platzhalter stehen geblieben');
          assert.ok(/[.!?]$/.test(t), sorte + '/' + ort + ': endet ohne Satzzeichen – „' + t + '"');
          assert.ok(t.indexOf('undefined') < 0, 'undefined im Text');
        }
      }
      const titel = wunschTitel({ sorte: sorte, ort: ort });
      assert.ok(titel.length > 5 && titel.indexOf('undefined') < 0, 'Titel kaputt: ' + titel);
      assert.ok(/^icon_/.test(wunschIcon({ sorte: sorte })), 'kein Symbol');
    }
  }
});

test('Ein Wunsch lohnt mehr als eine Tagesbitte – und gibt Deko zurück', () => {
  const ohne = wunschLohn({ zugabe: 'keine' });
  const mit = wunschLohn({ zugabe: 'gemuetlich' });
  assert.ok(ohne.coins >= 200, 'ein Wunsch kostet Deko, die Geld gekostet hat');
  assert.ok(mit.coins > ohne.coins, 'die Zugabe muss sich auszahlen');
  assert.ok(ohne.items.length > 0, 'wer Deko verbaut, soll auch etwas zurückbekommen');
  for (const it of ohne.items) assert.ok(getItem(it.id), it.id + ' gibt es nicht');
});

test('Ein frischer Spielstand hat eine leere Wunschliste', () => {
  const w = emptyWishes();
  assert.deepEqual(w.offen, []);
  assert.equal(w.erfuellt, 0);
});

test('Jede aufstellbare Deko kommt in höchstens einer Sorte vor', () => {
  // Sonst erfüllte ein einziges Stück zwei verschiedene Wünsche auf einmal,
  // und der zweite fühlte sich geschenkt an.
  const wo = Object.create(null);
  for (const id of SORT_IDS) {
    for (const it of SORTEN[id].items) {
      assert.ok(!wo[it], it + ' steht in „' + wo[it] + '" und in „' + id + '"');
      wo[it] = id;
    }
  }
  // Und es bleibt genug übrig, das in keiner Sorte steht – nicht jedes Stück
  // muss für einen Wunsch taugen.
  const deko = ITEM_LIST.filter((i) => i.cat === CAT.DECOR && i.prop
    && i.id.indexOf('keepsake_') !== 0);
  const frei = deko.filter((i) => !wo[i.id]);
  assert.ok(frei.length >= 2, 'jedes einzelne Stück ist verplant');
});
