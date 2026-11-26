/**
 * Die Fassade und das Fenster am Abend.
 *
 * Zwei Dinge stehen hier, und beide sind einmal schiefgegangen:
 *
 * 1. **Die Voreinstellung darf nichts vorgeben.** `paintHouse` setzt je
 *    Ausbaustufe eigene Farben – das Haus mit Veranda hat ein dunkleres
 *    Dach als die Hütte. Stünden in `kalk` feste Zahlen, hätte die
 *    Voreinstellung die Stufen eingeebnet, und niemandem wäre aufgefallen,
 *    dass dabei etwas verloren geht.
 * 2. **Die Farben müssen auseinanderliegen.** Vier Fassaden, die man im
 *    Bild nicht unterscheidet, sind eine Fassade mit vier Namen. Dasselbe
 *    gilt für das Licht im Fenster: Der erste Satz Zimmerfarben lag für
 *    drei von vier unter 40 Einheiten auseinander, und im Bild sahen sie
 *    alle gleich gelb aus.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HAUSFARBEN, HAUSFARBE_IDS, FASSADE_AB,
  hausfarbeFuer, malvorgabeFuer, hausfarbeAus,
} from '../../src/game/hausfarbe.js';
import { AUSSTATTUNG } from '../../src/game/interior.js';
import { hausMasse, hausFenster } from '../../src/art/painted-camp.js';
import { HOUSE_STAGES, MAX_HOUSE_STAGE } from '../../src/game/house.js';

const HEX = /^#[0-9a-f]{6}$/;
const MALFELDER = ['wand', 'wandSchatten', 'dach', 'dachSchatten', 'tuer'];

function abstand(a, b) {
  return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
}

function ausHex(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

test('Jede Fassade hat Hand und Fuß', () => {
  const ids = Object.create(null);
  for (const f of HAUSFARBEN) {
    assert.ok(!ids[f.id], 'doppelte Kennung ' + f.id);
    ids[f.id] = 1;
    assert.ok(f.name && f.name.length <= 24, f.id + ': Name zu lang');
    assert.ok(HEX.test(f.probeWand), f.id + ': Probe der Wand fehlt');
    assert.ok(HEX.test(f.probeDach), f.id + ': Probe des Dachs fehlt');
    for (const feld of MALFELDER) {
      if (f[feld] != null) assert.ok(HEX.test(f[feld]), f.id + '.' + feld);
    }
  }
  assert.equal(HAUSFARBE_IDS.length, HAUSFARBEN.length);
  assert.ok(HAUSFARBEN.length >= 4, 'zu wenig zur Auswahl');
  // Es gibt eine Stufe mit Wand, auf der das überhaupt Sinn ergibt.
  assert.ok(FASSADE_AB >= 2 && FASSADE_AB <= MAX_HOUSE_STAGE);
  assert.equal(HOUSE_STAGES[FASSADE_AB - 1].id, FASSADE_AB);
});

test('Die Voreinstellung gibt nichts vor, alle anderen alles', () => {
  // Der Grund steht oben. Ohne diese Prüfung fällt es erst auf, wenn
  // jemand das Haus mit Veranda ansieht und sich wundert, warum sein Dach
  // plötzlich so hell ist wie das der Hütte.
  assert.deepEqual(malvorgabeFuer(HAUSFARBE_IDS[0]), {},
    'die Voreinstellung schreibt dem Maler etwas vor');
  for (let i = 1; i < HAUSFARBEN.length; i++) {
    const v = malvorgabeFuer(HAUSFARBEN[i].id);
    for (const feld of MALFELDER) {
      assert.ok(v[feld], HAUSFARBEN[i].id + ': ' + feld + ' fehlt');
    }
  }
  // Und die Probe zeigt wirklich das, was gemalt wird.
  for (let i = 1; i < HAUSFARBEN.length; i++) {
    assert.equal(HAUSFARBEN[i].probeWand, HAUSFARBEN[i].wand);
    assert.equal(HAUSFARBEN[i].probeDach, HAUSFARBEN[i].dach);
  }
});

test('Die Fassaden sind im Bild auseinanderzuhalten', () => {
  // Gemessen am Dach, weil das die Fläche ist, die man von Weitem sieht.
  // Die Wände dürfen sich näher kommen – „Treibholz" und „Kalk" sind
  // absichtlich beide erdig und unterscheiden sich am Dach.
  let min = 999;
  for (let i = 0; i < HAUSFARBEN.length; i++) {
    for (let j = i + 1; j < HAUSFARBEN.length; j++) {
      const d = abstand(ausHex(HAUSFARBEN[i].probeDach), ausHex(HAUSFARBEN[j].probeDach));
      min = Math.min(min, d);
      assert.ok(d >= 40,
        HAUSFARBEN[i].id + ' und ' + HAUSFARBEN[j].id + ': Dächer nur ' + d + ' auseinander');
    }
  }
  assert.ok(min >= 40);
});

test('Die vier Fenster leuchten in vier Farben', () => {
  // Der erste Satz lag für Holz, Moos und Sand unter 40 auseinander – im
  // Bild drei gleiche Gelbtöne. 45 ist die Grenze, unter der es im
  // Nachtbild nicht mehr trägt; gemessen liegt der engste Abstand bei 52.
  for (const a of AUSSTATTUNG) {
    assert.ok(Array.isArray(a.licht) && a.licht.length === 3, a.id + ': kein Licht');
    for (const k of a.licht) assert.ok(k >= 0 && k <= 255, a.id + ': Farbwert daneben');
    // Hell genug, um in der Nacht als Licht zu lesen.
    assert.ok(a.licht[0] + a.licht[1] + a.licht[2] >= 420, a.id + ': zu dunkel fürs Fenster');
  }
  for (let i = 0; i < AUSSTATTUNG.length; i++) {
    for (let j = i + 1; j < AUSSTATTUNG.length; j++) {
      const d = abstand(AUSSTATTUNG[i].licht, AUSSTATTUNG[j].licht);
      assert.ok(d >= 45,
        AUSSTATTUNG[i].id + ' und ' + AUSSTATTUNG[j].id + ': nur ' + d + ' auseinander');
    }
  }
});

test('Ein kaputter Spielstand bekommt die Voreinstellung', () => {
  assert.equal(hausfarbeAus(undefined), HAUSFARBE_IDS[0]);
  assert.equal(hausfarbeAus('gibtesnicht'), HAUSFARBE_IDS[0]);
  assert.equal(hausfarbeAus(null), HAUSFARBE_IDS[0]);
  assert.equal(hausfarbeAus(HAUSFARBE_IDS[2]), HAUSFARBE_IDS[2]);
  assert.equal(hausfarbeFuer('gibtesnicht').id, HAUSFARBE_IDS[0]);
});

test('Die Fenster stehen da, wo sie gemalt werden', () => {
  // `hausFenster` und der Maler rechnen aus DERSELBEN Tabelle. Diese
  // Prüfung hält fest, dass das so bleibt: Sie rechnet die Rechtecke aus
  // `hausMasse` noch einmal nach, und zwar auf dem Weg des Malers.
  assert.deepEqual(hausFenster(1), [], 'ein Zelt hat kein Fenster');
  assert.equal(hausFenster(2).length, 1, 'die Hütte hat eines');
  for (let st = 3; st <= MAX_HOUSE_STAGE; st++) {
    assert.equal(hausFenster(st).length, 2, 'Stufe ' + st + ' hat zwei');
  }
  for (let st = 2; st <= MAX_HOUSE_STAGE; st++) {
    const L = hausMasse(st);
    const f = hausFenster(st);
    for (const fe of f) {
      assert.equal(fe.w, L.fenW, 'Stufe ' + st + ': Breite weicht ab');
      assert.equal(fe.h, L.fenH, 'Stufe ' + st + ': Höhe weicht ab');
      // Oberkante der Wand ist -sockel-wandH, der Fußpunkt 0.
      assert.ok(fe.y > -L.sockel - L.wandH - 1, 'Stufe ' + st + ': Fenster über der Traufe');
      assert.ok(fe.y + fe.h < -L.sockel, 'Stufe ' + st + ': Fenster unter der Wand');
      // Und innerhalb der Wandbreite, nicht in der Luft daneben.
      assert.ok(fe.x > -L.halb, 'Stufe ' + st + ': Fenster links neben dem Haus');
      assert.ok(fe.x + fe.w < L.halb, 'Stufe ' + st + ': Fenster rechts neben dem Haus');
    }
    // Zwei Fenster gehen sich aus dem Weg – und lassen die Tür dazwischen.
    if (f.length === 2) {
      const links = f[1].x + f[1].w;
      assert.ok(links < f[0].x, 'Stufe ' + st + ': die Fenster überlappen');
      assert.ok(f[0].x > L.tuerW, 'Stufe ' + st + ': Fenster über der Tür');
    }
  }
  // Und sie wachsen mit dem Haus.
  assert.ok(hausFenster(4)[0].w > hausFenster(2)[0].w, 'die Fenster wachsen nicht mit');
});
