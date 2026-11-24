/**
 * Die beiden, die drinnen wohnen.
 *
 * Geprüft wird vor allem eines: dass ihre Bitten an IHREM Ort erfüllbar
 * sind. Ein Geist in einer Höhle, der nach Fisch fragt, macht aus dem Ort
 * einen Umweg – man läuft hinaus, angelt, läuft zurück, und die Höhle war
 * nur die Stelle, an der man die Aufgabe abgibt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORTGEISTER, ortgeistFuer, ortgeistById, offeneBitte, ketteFertig,
  emptyOrtgeister, ortgeisterAus,
} from '../../src/game/ortgeister.js';
import { INNENORTE, inhaltFuer, innenOrtFuer } from '../../src/game/innenorte.js';
import { defOf } from '../../src/world/entities.js';
import { getItem } from '../../src/game/items.js';

test('In jedem Innenort wohnt genau ein Geist', () => {
  // Zwei Geister in einem Raum wären ein Wartezimmer, keiner wäre ein Lager.
  for (const ort of INNENORTE) {
    const treffer = ORTGEISTER.filter(function (g) { return g.ort === ort.id; });
    assert.equal(treffer.length, 1, ort.name + ': ' + treffer.length + ' Geister');
    assert.ok(ortgeistFuer(ort.id), ort.name + ': kein Geist gefunden');
  }
});

test('Was sie wollen, findet man an ihrem Ort', () => {
  // Die eigentliche Prüfung. Erlaubt ist, was im selben Innenort wächst –
  // und genau eine Ausnahme je Geist für etwas von draußen, denn eine
  // Bitte, die einen einmal hinausschickt, ist eine Geschichte; drei
  // davon sind eine Einkaufsliste.
  for (const g of ORTGEISTER) {
    const ort = innenOrtFuer(g.ort);
    const drinnen = new Set();
    for (const e of inhaltFuer(g.ort, 11)) {
      const def = defOf(e.kind);
      if (!def || !def.yield) continue;
      for (const d of def.yield(1, function () { return 0.5; })) drinnen.add(d.id);
    }
    let vonDraussen = 0;
    const alle = g.bitten.concat([g.dauerbitte]);
    for (const b of alle) {
      assert.ok(b.will.length > 0, g.name + ': eine Bitte ohne Wunsch');
      for (const w of b.will) {
        assert.ok(getItem(w.id), g.name + ': „' + w.id + '" gibt es nicht');
        assert.ok(w.n > 0 && w.n <= 6, g.name + ': ' + w.id + ' × ' + w.n + ' ist zu viel');
        if (!drinnen.has(w.id)) vonDraussen++;
      }
    }
    assert.ok(vonDraussen <= 2, g.name + ': ' + vonDraussen
      + ' Wünsche, die es in ' + ort.name + ' gar nicht gibt');
  }
});

test('Jede Bitte lohnt sich mehr als die davor', () => {
  // Eine Kette, deren zweite Bitte weniger einbringt als die erste, fühlt
  // sich an wie ein Rückschritt – auch wenn die Geschichte weitergeht.
  for (const g of ORTGEISTER) {
    let vorher = 0;
    for (let i = 0; i < g.bitten.length; i++) {
      const lohn = g.bitten[i].lohn;
      assert.ok(lohn.coins > vorher, g.name + ': Bitte ' + (i + 1)
        + ' gibt ' + lohn.coins + ' nach ' + vorher);
      vorher = lohn.coins;
    }
    // Und die Dauerbitte danach gibt weniger als jede Bitte der Kette:
    // Sonst wäre die Geschichte der langsame Weg zum selben Geld.
    assert.ok(g.dauerbitte.lohn.coins < g.bitten[0].lohn.coins,
      g.name + ': die Dauerbitte gibt mehr als die erste Bitte');
  }
});

test('Die Kette hat ein Ende, und danach geht es weiter', () => {
  for (const g of ORTGEISTER) {
    assert.ok(g.bitten.length >= 3, g.name + ': zu kurze Kette');
    for (let i = 0; i < g.bitten.length; i++) {
      assert.equal(offeneBitte(g, i), g.bitten[i], g.name + ': falsche Bitte bei ' + i);
      assert.equal(ketteFertig(g, i), false, g.name + ': bei ' + i + ' schon fertig');
    }
    assert.equal(offeneBitte(g, g.bitten.length), g.dauerbitte,
      g.name + ': nach der Kette kommt nichts');
    assert.equal(ketteFertig(g, g.bitten.length), true, g.name + ': Kette endet nicht');
    // Auch weit jenseits des Endes – ein alter Spielstand mit einer
    // Stufe von 99 darf nicht ins Leere zeigen.
    assert.equal(offeneBitte(g, 99), g.dauerbitte, g.name + ': Stufe 99 zeigt ins Leere');
  }
});

test('Sie reden wie alle hier: kurz', () => {
  // Dasselbe Maß wie bei den Inselgeistern. Ein Ortsgeist, der Absätze
  // spricht, fällt aus dem Spiel heraus.
  for (const g of ORTGEISTER) {
    const sorten = ['gruss', 'dank', 'warten', 'fertig', 'voll'];
    for (const k of sorten) {
      assert.ok(Array.isArray(g.saetze[k]) && g.saetze[k].length,
        g.name + ': keine Zeilen für „' + k + '"');
      for (const satz of g.saetze[k]) {
        assert.ok(satz.length <= 64, g.name + ' (' + k + '): zu lang – „' + satz + '"');
      }
    }
    for (const b of g.bitten.concat([g.dauerbitte])) {
      assert.ok(b.satz.length <= 70, g.name + ': Bitte zu lang – „' + b.satz + '"');
    }
  }
});

test('Ein alter Spielstand bringt sie nicht durcheinander', () => {
  const leer = emptyOrtgeister();
  for (const g of ORTGEISTER) assert.equal(leer[g.id].stufe, 0);
  // Unsinn im Spielstand wird zurechtgezogen statt übernommen.
  const krumm = ortgeisterAus({
    glimm: { stufe: 99, gegeben: -4, letzterTag: 'morgen' },
    unbekannt: { stufe: 2 },
  });
  assert.equal(krumm.glimm.stufe, ortgeistById('glimm').bitten.length);
  assert.equal(krumm.glimm.gegeben, 0);
  assert.equal(krumm.glimm.letzterTag, 0);
  assert.ok(krumm.knarr, 'der zweite Geist fehlt im gezogenen Stand');
  assert.equal(krumm.unbekannt, undefined, 'ein erfundener Geist kam durch');
});
