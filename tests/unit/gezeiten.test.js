/**
 * Gezeiten – kommt die Ebbe verlässlich, und kann sie niemanden einsperren?
 *
 * Der Rhythmus ist eine reine Rechnung und steht hier. Die beiden Fragen,
 * die wirklich wehtun, lassen sich nur an einer erzeugten Insel beantworten
 * und stehen deshalb in der Browser-Prüfung:
 *
 *   **Kommt man überall hin?** Flaches Wasser gibt es auch rund um
 *   vorgelagerte Felsen. Ohne Prüfung entstand dort bei Ebbe trockener
 *   Grund mitten im Meer – gemessen 658 von 1262 Kacheln unerreichbar.
 *
 *   **Sitzt die Figur fest, wenn das Wasser zurückkommt?** `canStand` fragt
 *   nur Kacheln. Wer auf einer Kachel steht, die wieder Wasser ist, kann
 *   sich keinen Schritt bewegen, und es gäbe nichts, was der Spieler dagegen
 *   tun könnte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FENSTER, FRUEHESTENS, ABSTAND_MIN, ABSTAND_MAX, BREITE, FUNDE, GRABSTELLEN,
  niedrigAm, naechstesNiedrig,
} from '../../src/game/gezeiten.js';
import { KAPITEL } from '../../src/game/kapitel.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';

/** Alle Ebbe-Tage eines Samens in einem Bereich. */
function ebbeTage(seed, bis) {
  const raus = [];
  for (let t = 1; t <= bis; t++) if (niedrigAm(seed, t)) raus.push(t);
  return raus;
}

test('vor dem Kapitel gibt es keine Ebbe', function () {
  // Die Zahl steht an zwei Stellen – im Kapitel und hier – und darf nicht
  // auseinanderlaufen: Sonst kündigt das Kapitel etwas an, das erst Tage
  // später kommt, oder es gibt Ebbe, bevor jemand davon weiß.
  const kap = KAPITEL.find(function (k) { return k.bringt.indexOf('gezeiten') >= 0; });
  assert.ok(kap, 'kein Kapitel bringt die Gezeiten');
  assert.equal(FRUEHESTENS, kap.ab,
    'Gezeiten ab Tag ' + FRUEHESTENS + ', Kapitel ab Tag ' + kap.ab);

  for (let seed = 1; seed <= 40; seed++) {
    for (let t = 0; t < FRUEHESTENS; t++) {
      assert.equal(niedrigAm(seed * 7919, t), false, 'Ebbe an Tag ' + t);
    }
  }
});

test('die Ebbe kommt verlässlich und mit Abstand', function () {
  // Dieselbe Überlegung wie beim Wanderer: Ein Tageswurf ergibt im Schnitt
  // dasselbe, aber im schlechtesten Fall wochenlang nichts. Das Fenster
  // garantiert den Abstand – also wird der Abstand nachgerechnet.
  let kleinster = Infinity;
  let groesster = 0;
  let ersterSpaetester = 0;

  for (let i = 0; i < 300; i++) {
    const seed = (i + 1) * 2654435761 % 4294967296;
    const tage = ebbeTage(seed, 400);
    assert.ok(tage.length > 60, 'nur ' + tage.length + ' Ebben in 400 Tagen');
    ersterSpaetester = Math.max(ersterSpaetester, tage[0]);
    for (let k = 1; k < tage.length; k++) {
      const d = tage[k] - tage[k - 1];
      if (d < kleinster) kleinster = d;
      if (d > groesster) groesster = d;
    }
  }
  assert.ok(kleinster >= ABSTAND_MIN, 'kleinster Abstand ' + kleinster);
  assert.ok(groesster <= ABSTAND_MAX,
    'größter Abstand ' + groesster + ' – das Fenster hält nicht');
  // Die erste Ebbe darf nicht auf sich warten lassen: Das Kapitel geht an
  // Tag 12 auf und verspricht freien Grund.
  assert.ok(ersterSpaetester <= FRUEHESTENS + FENSTER - 1,
    'erste Ebbe erst an Tag ' + ersterSpaetester);
});

test('naechstesNiedrig findet immer den nächsten Tag', function () {
  for (let i = 0; i < 60; i++) {
    const seed = (i + 3) * 40503 % 4294967296;
    for (const tag of [1, 5, FRUEHESTENS, 30, 77, 200]) {
      const n = naechstesNiedrig(seed, tag);
      assert.ok(n > 0, 'kein nächster Tag gefunden (Samen ' + seed + ', Tag ' + tag + ')');
      assert.ok(n >= tag, 'nächster Tag liegt in der Vergangenheit');
      assert.equal(niedrigAm(seed, n), true, 'der genannte Tag hat gar keine Ebbe');
      // Und es ist wirklich der NÄCHSTE.
      for (let t = Math.max(tag, FRUEHESTENS); t < n; t++) {
        assert.equal(niedrigAm(seed, t), false, 'Tag ' + t + ' wurde übersprungen');
      }
    }
  }
});

test('zwei Leute auf derselben Insel erleben dieselbe Ebbe', function () {
  // Das Watt hängt am Inselsamen und am Tag, nicht am Augenblick. Wer neu
  // lädt, findet denselben Grund frei.
  for (const seed of [1, 999, 123456789]) {
    for (let t = FRUEHESTENS; t < FRUEHESTENS + 40; t++) {
      assert.equal(niedrigAm(seed, t), niedrigAm(seed, t), 'nicht reproduzierbar');
    }
  }
  // Verschiedene Inseln haben verschiedene Tage – sonst wäre der Samen
  // wirkungslos und alle hätten am selben Tag Ebbe.
  const a = ebbeTage(11111, 200).join(',');
  const b = ebbeTage(22222, 200).join(',');
  assert.notEqual(a, b, 'der Inselsamen wirkt nicht');
});

test('das Watt bleibt ein Saum und keine zweite Insel', function () {
  // Drei Kacheln sind rund zweihundert Punkte – etwa so breit wie der
  // Strand selbst. Bei einer wäre es ein Streifen, bei sechs liefe man
  // minutenlang über leeren Grund.
  assert.ok(BREITE >= 2 && BREITE <= 4, 'Breite ' + BREITE + ' passt nicht zum Saum');
});

test('im Watt liegt nichts Eigenes', function () {
  // Ein Fund, den es nur alle fünf Tage gibt, wäre ein Grund, auf die Ebbe
  // zu WARTEN – und Warten ist das Gegenteil von dem, was dieses Spiel
  // will. Deshalb nur Dinge, die es am Strand auch gibt.
  assert.equal(FUNDE.boden, 'watt');
  assert.ok(FUNDE.n > 0 && GRABSTELLEN >= 0);
  for (const art of FUNDE.arten) {
    const def = ENTITY_DEFS[art];
    assert.ok(def, 'Art „' + art + '" gibt es nicht');
    assert.equal(def.category, 'forage', art + ' ist kein Fundstück');
    // Dieselbe Regel wie bei den Tagesereignissen: nichts Solides in den Weg.
    assert.ok(!def.solid, art + ' ist solide und darf nicht gestreut werden');
  }
});
