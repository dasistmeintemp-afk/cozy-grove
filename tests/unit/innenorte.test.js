/**
 * Innenorte – Höhle und Mühle.
 *
 * Geprüft wird nicht, dass es sie gibt, sondern dass man HINKOMMT und
 * wieder heraus: Ein Eingang, vor dem kein Platz zum Stehen ist, und ein
 * Erzbrocken, der auf dem Ausgang liegt, sind beide schlimmer als gar
 * kein Innenort.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import { defOf } from '../../src/world/entities.js';
import {
  INNENORTE, inhaltFuer, imOrt, amAusgang, ausgangFuer, innenOrtFuer, ORT_RAND,
} from '../../src/game/innenorte.js';
import { TILE_SIZE } from '../../src/art/tiles.js';

const SEEDS = [11, 4711, 555, 20250907, 7];

test('Jede Insel hat Höhlen und eine Mühlentür', () => {
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const hoehlen = welt.entities.filter(function (e) {
      return e.kind === 'hoehle_eingang' && !e.gone;
    });
    const tueren = welt.entities.filter(function (e) {
      return e.kind === 'muehle_tuer' && !e.gone;
    });
    assert.equal(hoehlen.length, 3, 'Seed ' + seed + ': ' + hoehlen.length + ' Höhlen');
    assert.equal(tueren.length, 1, 'Seed ' + seed + ': ' + tueren.length + ' Mühlentüren');
  }
});

test('Vor jedem Eingang kann man stehen', () => {
  // Das ist die Prüfung, die wirklich etwas kostet. Ein Eingang in einer
  // Felsnische sieht auf der Karte richtig aus und lässt sich nie
  // ansprechen – man steht im Fels oder zu weit weg.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const eingaenge = welt.entities.filter(function (e) {
      return (e.kind === 'hoehle_eingang' || e.kind === 'muehle_tuer') && !e.gone;
    });
    for (const e of eingaenge) {
      const def = defOf(e.kind);
      // Irgendwo im Umkreis der Reichweite muss ein Platz sein, auf dem
      // die Figur wirklich steht – nicht bloß eine begehbare Kachel.
      let platz = null;
      for (let r = 40; r <= def.reachR && !platz; r += 12) {
        for (let w = 0; w < 16; w++) {
          const a = (w / 16) * Math.PI * 2;
          const x = e.x + Math.cos(a) * r;
          const y = e.y + Math.sin(a) * r;
          if (!welt.canStand(x, y)) continue;
          const dx = e.x - x;
          const dy = e.y - y;
          if (dx * dx + dy * dy > def.reachR * def.reachR) continue;
          platz = { x: x, y: y };
          break;
        }
      }
      assert.ok(platz, 'Seed ' + seed + ': vor dem ' + e.kind + ' bei '
        + Math.round(e.x / TILE_SIZE) + '/' + Math.round(e.y / TILE_SIZE)
        + ' kann niemand stehen');
    }
  }
});

test('Was drinnen steht, liegt im Raum und nicht im Ausgang', () => {
  // Ein Felsbrocken auf dem Ausgang sperrt den einzigen Weg hinaus.
  for (const ort of INNENORTE) {
    for (const seed of SEEDS) {
      const inhalt = inhaltFuer(ort.id, seed);
      assert.ok(inhalt.length >= 4, ort.name + ': fast nichts drin');
      for (const e of inhalt) {
        assert.ok(imOrt(e.x, e.y, ort),
          ort.name + ' (Seed ' + seed + '): ' + e.kind + ' liegt außerhalb des Bodens');
        const def = defOf(e.kind);
        assert.ok(def && def.tool,
          ort.name + ': ' + e.kind + ' lässt sich mit nichts aufheben');
        assert.ok(def.yield, ort.name + ': ' + e.kind + ' gibt nichts her');
        if (!def.solid) continue;
        // Festes muss vom Ausgang weg bleiben, Pilze dürfen dort stehen.
        const a = ausgangFuer(ort);
        const naheAusgang = amAusgang(e.x, e.y, ort)
          || (e.y > ort.h - 110 && e.x > a.x - 40 && e.x < a.x + a.w + 40);
        assert.ok(!naheAusgang, ort.name + ' (Seed ' + seed + '): ' + e.kind
          + ' steht im Ausgang');
      }
    }
  }
});

test('Zwischen zwei Dingen ist genug Platz zum Durchgehen', () => {
  // Zwei feste Brocken dicht nebeneinander bilden eine Mauer, und in
  // einem Raum ohne Wegfindung steht man dann fest.
  for (const ort of INNENORTE) {
    const inhalt = inhaltFuer(ort.id, SEEDS[0]).filter(function (e) {
      const def = defOf(e.kind);
      return def && def.solid;
    });
    for (let i = 0; i < inhalt.length; i++) {
      for (let k = i + 1; k < inhalt.length; k++) {
        const a = inhalt[i];
        const b = inhalt[k];
        const ra = (defOf(a.kind).blockR || 24) + 10;
        const rb = (defOf(b.kind).blockR || 24) + 10;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        // 34 Punkte ist etwas mehr als die Figur breit ist.
        assert.ok(d > ra + rb + 34, ort.name + ': ' + a.kind + ' und ' + b.kind
          + ' stehen nur ' + Math.round(d) + ' Punkte auseinander');
      }
    }
  }
});

test('Der Ausgang liegt unten in der Mitte – in jedem Innenort', () => {
  // Eine Regel, die man nach dem ersten Mal nie wieder nachschlagen muss,
  // ist mehr wert als ein abwechslungsreicher Grundriss.
  for (const ort of INNENORTE) {
    const o = innenOrtFuer(ort.id);
    assert.ok(amAusgang(o.w / 2, o.h - 10, o), ort.name + ': unten in der Mitte ist kein Ausgang');
    assert.ok(!amAusgang(ORT_RAND + 5, ORT_RAND + 5, o), ort.name + ': oben links ist auch ein Ausgang');
    assert.ok(!amAusgang(o.w / 2, o.h / 2, o), ort.name + ': mitten im Raum ist ein Ausgang');
  }
});
