/**
 * Der Garten an der Haustür.
 *
 * Drei Dinge stehen hier, und das mittlere ist das, was wirklich
 * schiefgehen kann:
 *
 * 1. **Die Beete wachsen mit dem Haus** und liegen nicht darin.
 * 2. **Der Weg zur Tür bleibt frei.** Beete links und rechts, nicht davor
 *    – ein Garten, durch den man nicht zur eigenen Tür kommt, ist eine
 *    Sackgasse mit Blumen.
 * 3. **Einrasten und Wachsen meinen dieselben Beete.** Der Fangbereich ist
 *    grösser als das Beet; wer am Rand des einen steht, soll nicht im
 *    anderen gelandet sein.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BEETE_JE_STUFE, BEET_B, BEET_H, EINRASTEN, REIHE, GARTEN_BONUS,
  gartenPlaetze, gartenBeete, beetAn, imGarten, gartenStand,
} from '../../src/game/garten.js';
import { houseFootprint, MAX_HOUSE_STAGE } from '../../src/game/house.js';
import { hausMasse } from '../../src/art/painted-camp.js';

test('Der Garten wächst mit dem Haus', () => {
  assert.equal(BEETE_JE_STUFE.length, MAX_HOUSE_STAGE);
  let vorher = 0;
  for (let st = 1; st <= MAX_HOUSE_STAGE; st++) {
    const n = BEETE_JE_STUFE[st - 1];
    assert.ok(n >= vorher, 'Stufe ' + st + ': der Garten schrumpft');
    assert.equal(gartenPlaetze(st).length, n, 'Stufe ' + st + ': falsche Beetzahl');
    vorher = n;
  }
  // Schon beim Zelt gibt es welche – der Garten wartet nicht aufs Haus.
  assert.ok(BEETE_JE_STUFE[0] >= 2, 'am Zelt gibt es keinen Garten');
  assert.ok(BEETE_JE_STUFE[MAX_HOUSE_STAGE - 1] > BEETE_JE_STUFE[0],
    'der Ausbau bringt keine Beete');
  // Unsinnige Stufen fallen in den gültigen Bereich.
  assert.equal(gartenPlaetze(0).length, BEETE_JE_STUFE[0]);
  assert.equal(gartenPlaetze(99).length, BEETE_JE_STUFE[MAX_HOUSE_STAGE - 1]);
});

test('Kein Beet liegt im Haus oder vor der Tür', () => {
  for (let st = 1; st <= MAX_HOUSE_STAGE; st++) {
    const f = houseFootprint(st);
    for (const b of gartenPlaetze(st)) {
      // Nicht in der Kollisionsform des Hauses – dort stünde das Beet in
      // der Wand und man käme nicht heran.
      const naechsteKante = Math.abs(b.x) - BEET_B / 2;
      assert.ok(naechsteKante >= f.blockR,
        'Stufe ' + st + ': Beet bei ' + b.x + ' reicht in das Haus (blockR ' + f.blockR + ')');
      // Und nicht vor der Tür: Die sitzt unten in der Mitte, der Weg
      // dorthin muss frei bleiben.
      assert.ok(Math.abs(b.x) > BEET_B / 2 + 20,
        'Stufe ' + st + ': Beet bei ' + b.x + ' steht im Weg zur Tür');
      // Vor dem Haus, nicht dahinter: Hinter der Wand sähe man es nicht.
      assert.ok(b.y > 0, 'Stufe ' + st + ': Beet hinter dem Haus');
    }
    // Links und rechts, nicht alles auf einer Seite.
    const links = gartenPlaetze(st).filter((b) => b.x < 0).length;
    const rechts = gartenPlaetze(st).length - links;
    assert.ok(links > 0 && rechts > 0, 'Stufe ' + st + ': der Garten steht einseitig');
    assert.ok(Math.abs(links - rechts) <= 1, 'Stufe ' + st + ': sehr ungleich verteilt');
  }
});

test('Die Beete liegen nicht übereinander', () => {
  for (let st = 1; st <= MAX_HOUSE_STAGE; st++) {
    const p = gartenPlaetze(st);
    for (let i = 0; i < p.length; i++) {
      for (let k = i + 1; k < p.length; k++) {
        const dx = Math.abs(p[i].x - p[k].x);
        const dy = Math.abs(p[i].y - p[k].y);
        assert.ok(dx >= BEET_B || dy >= BEET_H,
          'Stufe ' + st + ': Beet ' + i + ' und ' + k + ' überlappen');
      }
    }
  }
});

test('Das Haus verdeckt kein Beet', () => {
  // Das Hausbild steht VOLLSTÄNDIG über seinem Fußpunkt: Der Maler setzt
  // den Anker auf (Mitte, Fußpunkt), und alles, was er zeichnet, liegt
  // darüber. Ein Beet, dessen Oberkante über dem Fußpunkt läge, läge
  // damit im Bild unter dem Haus – genau das war der erste Entwurf, und
  // bei Zelt und Hütte sah man vom vorderen Beet nur die untere Hälfte.
  for (let st = 1; st <= MAX_HOUSE_STAGE; st++) {
    for (const b of gartenPlaetze(st)) {
      assert.ok(b.y - BEET_H / 2 > 4,
        'Stufe ' + st + ': Beet bei ' + b.x + '/' + b.y + ' liegt unter dem Haus');
    }
  }
  // Und das Haus steht nicht im Garten: Die Veranda ist das breiteste
  // Bauteil, und auch sie bleibt links und rechts vom Beet.
  for (let st = 2; st <= MAX_HOUSE_STAGE; st++) {
    const L = hausMasse(st);
    assert.ok(L.halb > 0);
  }
});

test('Einrasten trifft das nächste Beet – und nur in Reichweite', () => {
  const beete = gartenBeete(4, 1000, 1000);
  assert.equal(beete.length, BEETE_JE_STUFE[3]);
  for (const b of beete) {
    assert.equal(beetAn(beete, b.x, b.y).i, b.i, 'mitten im Beet rastet es nicht ein');
    // Davorstehen zählt noch.
    assert.equal(beetAn(beete, b.x, b.y + EINRASTEN - 4).i, b.i);
    assert.equal(beetAn(beete, b.x - EINRASTEN + 4, b.y).i, b.i);
    // Weit weg nicht mehr.
    assert.equal(beetAn(beete, b.x, b.y + EINRASTEN + 400), null);
  }
  // Zwischen zwei Beeten gewinnt das nähere – und zwar eindeutig.
  const a = beete[0];
  const c = beete.find((x) => x.x === a.x && x.y !== a.y);
  assert.ok(c, 'es gibt keine zweite Reihe zum Vergleichen');
  assert.equal(beetAn(beete, a.x, a.y + 10).i, a.i);
  assert.equal(beetAn(beete, c.x, c.y - 10).i, c.i);
  assert.equal(beetAn([], 1000, 1000), null);
});

test('Der Fangbereich ist größer als das Beet – und das Wachstum folgt dem Beet', () => {
  // Der Unterschied ist kein Detail: Wer am Rand des Fangbereichs sät,
  // landet IM Beet (es rastet ein). Wer dort eine Pflanze von Hand
  // hinsetzt, steht daneben und bekommt den Schritt extra nicht.
  const beete = gartenBeete(4, 1000, 1000);
  const b = beete[0];
  // Der Fangbereich darf das Nachbarbeet nicht erreichen – sonst sät man
  // vor dem vorderen Beet ins hintere.
  assert.ok(EINRASTEN < REIHE / 2, 'der Fangbereich reicht in die nächste Reihe');
  assert.ok(imGarten(beete, b.x, b.y), 'die Mitte zählt nicht');
  assert.ok(imGarten(beete, b.x + BEET_B / 2 - 1, b.y + BEET_H / 2 - 1), 'die Ecke zählt nicht');
  assert.ok(!imGarten(beete, b.x, b.y + BEET_H / 2 + 2), 'daneben zählt mit');
  assert.ok(!imGarten(beete, 1000, 1000), 'das Haus selbst liegt im Garten');
  assert.ok(!imGarten([], b.x, b.y));
  // Und der Schritt ist einer – so viel wie Gießen, nicht mehr.
  assert.equal(GARTEN_BONUS, 1);
});

test('Die Zählung sieht, was in den Beeten steht', () => {
  const beete = gartenBeete(3, 500, 500);
  assert.deepEqual(gartenStand(beete, []), { belegt: 0, beete: beete.length });
  const pflanzen = [
    { x: beete[0].x, y: beete[0].y, gone: false },
    { x: beete[1].x + 3, y: beete[1].y - 3, gone: false },
    // Abgeerntet zählt nicht mehr.
    { x: beete[2].x, y: beete[2].y, gone: true },
    // Und was daneben steht, auch nicht.
    { x: beete[2].x, y: beete[2].y + BEET_H, gone: false },
  ];
  assert.deepEqual(gartenStand(beete, pflanzen), { belegt: 2, beete: beete.length });
  // Zwei Pflanzen in einem Beet zählen einmal – sonst stünde dort „5 von 4".
  assert.equal(gartenStand([beete[0]], [
    { x: beete[0].x - 4, y: beete[0].y, gone: false },
    { x: beete[0].x + 4, y: beete[0].y, gone: false },
  ]).belegt, 1);
});
