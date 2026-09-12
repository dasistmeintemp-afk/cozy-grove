/**
 * Der Wanderer – kommt er in einem Rhythmus, den man merkt?
 *
 * Die Prüfungen hier zerfallen in drei Gruppen, und die erste ist die, für
 * die das Modul umgebaut wurde:
 *
 * 1. **Der Takt.** Ein Besucher, auf den man fünfzehn Stunden wartet, ist
 *    kein Besucher. Der erste Entwurf war ein Tageswurf mit 17 % Chance; im
 *    Schnitt kam damit dasselbe heraus wie jetzt, aber die Messung über 400
 *    Inseln zeigte Lücken von **bis zu 66 Tagen** und einen ersten Besuch,
 *    der auf mancher Insel erst an Tag 46 stattfand. Hier steht jetzt die
 *    Schranke, die das verhindert – und sie ist der Grund, warum das Modul
 *    mit einem Fenster rechnet statt mit einer Chance.
 * 2. **Der Tausch.** Was er sucht, muss es geben und auffindbar sein; was er
 *    gibt, muss es geben. Und die Reiselaterne muss GENAU EINMAL kommen –
 *    ein Andenken, das man zweimal bekommt, ist ein Warenposten.
 * 3. **Die Tasche.** Wer abgibt, muss auch etwas zurückbekommen können. Die
 *    Prüfung dazu steht bei `passtNach`, denn das ist die Stelle, an der ein
 *    Tausch still etwas verschlucken könnte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FENSTER, FRUEHESTENS, ABSTAND_MIN, ABSTAND_MAX,
  SUCHT, GIBT, SAETZE, MITBRINGSEL, LATERNE_AB,
  wandererAm, naechsterBesuch, besuchFuer, emptyWanderer,
  heuteGetauscht, heuteGegruesst, tauschZahl, gibtLaterne,
} from '../../src/game/wanderer.js';
import { getItem, CAT } from '../../src/game/items.js';
import { Inventory } from '../../src/game/inventory.js';
import { RECIPES } from '../../src/game/recipes.js';
import { KATALOG } from '../../src/game/catalog.js';

const SEEDS = [4711, 20250907, 1, 999999, 424242, 7, 31337, 555, 12345, 8675309];
const JAHR = 365;

/** Alle Tage eines Jahres, an denen er kommt. */
function tageVon(seed, bis) {
  const raus = [];
  for (let t = 1; t <= (bis || JAHR); t++) if (wandererAm(seed, t)) raus.push(t);
  return raus;
}

/* ---------------- 1. Der Takt ---------------- */

test('Vor dem fünften Tag kommt er nicht', () => {
  // Die ersten Tage gehören der Insel. Wer noch nicht weiß, wo die Werkbank
  // steht, braucht keinen Fremden am Strand.
  for (const seed of SEEDS) {
    for (let t = -3; t < FRUEHESTENS; t++) {
      assert.equal(wandererAm(seed, t), false, 'Insel ' + seed + ' Tag ' + t);
    }
  }
});

test('Nie zwei Tage hintereinander', () => {
  // Sonst wäre er kein Besuch mehr, sondern ein Nachbar. Das folgt hier aus
  // der Bauart – der Tag im Fenster wird aus 1…6 gewählt, nie 0 –, aber
  // gerade deshalb muss es eine Prüfung geben: Eine Regel, die niemand
  // ausspricht, verschwindet beim nächsten Umbau.
  for (const seed of SEEDS) {
    for (let t = 1; t < JAHR; t++) {
      assert.ok(!(wandererAm(seed, t) && wandererAm(seed, t + 1)),
        'Insel ' + seed + ': Tag ' + t + ' und ' + (t + 1));
    }
  }
});

test('Zwischen zwei Besuchen liegen 2 bis 12 Tage – auf jeder Insel', () => {
  // Die eigentliche Prüfung. Ein Tageswurf hielte sie NICHT ein: gemessen
  // über 400 Inseln kam er dort einmal 66 Tage lang nicht.
  let kleinste = 999;
  let groesste = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const tage = tageVon(seed);
    assert.ok(tage.length > 40, 'Insel ' + seed + ': nur ' + tage.length + ' Besuche im Jahr');
    for (let i = 1; i < tage.length; i++) {
      const luecke = tage[i] - tage[i - 1];
      kleinste = Math.min(kleinste, luecke);
      groesste = Math.max(groesste, luecke);
      assert.ok(luecke >= ABSTAND_MIN && luecke <= ABSTAND_MAX,
        'Insel ' + seed + ': ' + luecke + ' Tage zwischen ' + tage[i - 1] + ' und ' + tage[i]);
    }
  }
  // Die Gegenprobe: Die Schranken sollen eng anliegen. Läge die kleinste
  // gemessene Lücke bei 5, wäre ABSTAND_MIN = 2 eine Behauptung ohne Deckung.
  assert.equal(kleinste, ABSTAND_MIN, 'kleinste Lücke gemessen: ' + kleinste);
  assert.equal(groesste, ABSTAND_MAX, 'größte Lücke gemessen: ' + groesste);
});

test('Der erste Besuch kommt spätestens am elften Tag', () => {
  // Wer eine Woche spielt, soll ihn gesehen haben. Beim Tageswurf lag der
  // späteste erste Besuch über 400 Inseln bei Tag 46.
  let spaetester = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const tage = tageVon(seed, 40);
    assert.ok(tage.length, 'Insel ' + seed + ': in 40 Tagen kein einziger Besuch');
    spaetester = Math.max(spaetester, tage[0]);
  }
  assert.ok(spaetester <= FRUEHESTENS + FENSTER - 1,
    'spätester erster Besuch: Tag ' + spaetester);
});

test('Etwa einmal die Woche, und auf allen Inseln gleich oft', () => {
  // Der Schnitt soll stimmen, aber vor allem soll er NICHT je Insel
  // schwanken: Beim Tageswurf hatte eine Insel 33 Besuche im Jahr und eine
  // andere 69 – dieselbe Rechnung, zwei völlig verschiedene Spiele.
  let min = 999;
  let max = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const n = tageVon(seed).length;
    min = Math.min(min, n);
    max = Math.max(max, n);
  }
  const soll = Math.floor((JAHR - FRUEHESTENS) / FENSTER);
  assert.ok(min >= soll - 1 && max <= soll + 2,
    'Besuche im Jahr: ' + min + ' bis ' + max + ' (erwartet um ' + soll + ')');
});

test('naechsterBesuch findet immer einen Tag, und zwar den richtigen', () => {
  for (const seed of SEEDS) {
    for (let t = 1; t < 60; t++) {
      const n = naechsterBesuch(seed, t);
      assert.ok(n >= Math.max(t, FRUEHESTENS), 'Insel ' + seed + ' Tag ' + t + ' -> ' + n);
      assert.ok(wandererAm(seed, n), 'gemeldeter Tag ' + n + ' ist gar keiner');
      // Und es ist wirklich der nächste: dazwischen liegt keiner.
      for (let z = Math.max(t, FRUEHESTENS); z < n; z++) {
        assert.equal(wandererAm(seed, z), false, 'Tag ' + z + ' läge vor ' + n);
      }
    }
  }
});

test('Gleiche Insel, gleicher Tag, gleicher Besuch', () => {
  // Wer neu lädt, findet denselben Wanderer mit demselben Wunsch vor. Ohne
  // das wäre Neuladen die beste Art, sich den Tausch auszusuchen.
  for (const seed of SEEDS) {
    for (let t = FRUEHESTENS; t < 60; t++) {
      const a = besuchFuer(seed, t);
      const b = besuchFuer(seed, t);
      assert.deepEqual(a, b, 'Insel ' + seed + ' Tag ' + t);
    }
  }
});

test('An Tagen ohne Besuch gibt es keinen Besuch', () => {
  for (const seed of SEEDS) {
    for (let t = 1; t < 80; t++) {
      if (wandererAm(seed, t)) assert.ok(besuchFuer(seed, t), 'Tag ' + t + ' ohne Inhalt');
      else assert.equal(besuchFuer(seed, t), null, 'Tag ' + t + ' hat einen Besuch');
    }
  }
});

/* ---------------- 2. Der Tausch ---------------- */

test('Was er sucht, hebt man im Vorbeigehen auf', () => {
  // Er soll nichts wollen, wofür man einen halben Tag braucht – der Tausch
  // soll sich anfühlen wie „ach, das habe ich dabei".
  //
  // Geprüft wird das an zwei Zahlen statt an einem Bauchgefühl:
  //
  //   Kategorie   Material, Gesammeltes und Fundstücke sind das, was man
  //               beim Laufen aufhebt oder am Strand ausgräbt. Alles andere
  //               braucht eine Station, ein Werkzeug mit Anbiss oder Geld:
  //               Fische und Falter wollen gefangen sein, Gerichte gekocht,
  //               Deko gebaut. Nichts davon ist ein Tausch im Vorbeigehen.
  //   Gesamtwert  Was er verlangt, soll billig sein. 30 Münzen sind der
  //               höchste Posten in der Liste (4 Pilze); gemessen liegt sie
  //               zwischen 10 und 28.
  const erlaubt = [CAT.MATERIAL, CAT.FORAGE, CAT.RELIC];
  let teuerster = 0;
  for (const w of SUCHT) {
    const it = getItem(w.id);
    assert.ok(it, 'sucht etwas, das es nicht gibt: ' + w.id);
    assert.ok(erlaubt.indexOf(it.cat) >= 0,
      it.name + ' ist ' + it.cat + ' – das hebt man nicht im Vorbeigehen auf');
    assert.ok(w.n >= 1 && w.n <= 4, it.name + ': ' + w.n + ' Stück sind zu viel oder zu wenig');
    teuerster = Math.max(teuerster, it.value * w.n);
  }
  assert.ok(teuerster <= 30, 'teuerster Wunsch: ' + teuerster + ' Münzen');
  // Und keiner doppelt: Zehn Wünsche, von denen zwei derselbe sind, sind neun.
  assert.equal(new Set(SUCHT.map((w) => w.id)).size, SUCHT.length);
});

test('Was er gibt, gibt es auch', () => {
  for (const g of GIBT) {
    assert.ok(g.items.length >= 1, 'ein Tausch ohne Gegenwert');
    for (const it of g.items) {
      assert.ok(getItem(it.id), 'gibt etwas, das es nicht gibt: ' + it.id);
      assert.ok(it.n >= 1);
    }
    assert.ok(g.coins > 0, 'ein Tausch ohne Münzen');
  }
  assert.ok(getItem(MITBRINGSEL), 'die Reiselaterne gibt es gar nicht');
});

test('Er gibt mehr, als er nimmt – aber nicht das Zehnfache', () => {
  // Gemessen statt geschätzt. Er soll sich lohnen (sonst tauscht niemand)
  // und trotzdem keine Abkürzung sein (sonst steht das halbe Spiel still
  // und man wartet auf ihn).
  let schlechtester = 999;
  let bester = 0;
  for (const w of SUCHT) {
    const rein = getItem(w.id).value * w.n;
    for (const g of GIBT) {
      let raus = g.coins;
      for (const it of g.items) raus += getItem(it.id).value * it.n;
      const faktor = raus / rein;
      schlechtester = Math.min(schlechtester, faktor);
      bester = Math.max(bester, faktor);
    }
  }
  assert.ok(schlechtester > 2, 'schlechtester Tausch bringt nur das ' +
    schlechtester.toFixed(1) + '-fache – dann lässt man es');
  assert.ok(bester < 40, 'bester Tausch bringt das ' + bester.toFixed(1) +
    '-fache – das ist keine Begegnung mehr, das ist eine Geldquelle');
});

test('Die Reiselaterne kommt genau einmal – beim zweiten Tausch', () => {
  // Ein Andenken, das man zweimal bekommt, ist ein Warenposten. Und beim
  // ERSTEN Tausch wäre es ein Begrüßungsgeschenk statt eines Andenkens.
  const stand = emptyWanderer();
  const wann = [];
  for (let i = 0; i < 12; i++) {
    if (gibtLaterne(stand)) wann.push(i + 1);
    stand.getauscht = tauschZahl(stand) + 1;
  }
  assert.deepEqual(wann, [LATERNE_AB]);
  assert.equal(LATERNE_AB, 2);
});

test('Die Reiselaterne steht in keinem Bauplan und in keinem Katalog', () => {
  // Die Regel, an der er hängt: Er gibt, was es sonst nicht gibt. Käme die
  // Laterne auch aus der Werkbank, wäre er ein Händler mit Hut.
  for (const r of RECIPES) {
    assert.ok(!r.out || r.out.id !== MITBRINGSEL, 'die Laterne steht in ' + r.id);
  }
  for (const e of KATALOG) {
    assert.notEqual(e.id, MITBRINGSEL, 'die Laterne steht im Katalog');
  }
  // Und sie tut etwas: Sie leuchtet. Ein Andenken für 210 Münzen, das nur
  // Charmepunkte gibt, wäre ein teures Nichts.
  assert.ok(getItem(MITBRINGSEL).light > 0, 'die Reiselaterne leuchtet nicht');
});

test('Einmal am Tag getauscht, einmal am Tag gegrüßt', () => {
  const stand = emptyWanderer();
  assert.equal(heuteGetauscht(stand, 7), false);
  assert.equal(heuteGegruesst(stand, 7), false);
  stand.tag = 7;
  stand.gegruesst = 7;
  assert.equal(heuteGetauscht(stand, 7), true);
  assert.equal(heuteGegruesst(stand, 7), true);
  // Morgen ist er weg, und der Stand von gestern sperrt nichts.
  assert.equal(heuteGetauscht(stand, 8), false);
  assert.equal(heuteGegruesst(stand, 8), false);
  assert.equal(heuteGetauscht(null, 7), false);
  assert.equal(tauschZahl(null), 0);
});

test('Er sagt in jeder Lage etwas, und nie zweimal dasselbe', () => {
  const alle = [];
  for (const k of Object.keys(SAETZE)) {
    assert.ok(SAETZE[k].length >= 2, k + ': nur ' + SAETZE[k].length + ' Satz');
    for (const satz of SAETZE[k]) {
      assert.ok(satz.length > 10 && satz.length < 70, k + ': „' + satz + '"');
      assert.ok(/[.!?]$/.test(satz), k + ': kein Satzzeichen – „' + satz + '"');
      alle.push(satz);
    }
  }
  assert.equal(new Set(alle).size, alle.length, 'zwei gleiche Sätze');
});

test('Ein Besuch bringt für jede Lage einen Satz mit', () => {
  // Sonst stünde er stumm da, sobald man in eine Lage gerät, an die beim
  // Würfeln niemand gedacht hat.
  const b = besuchFuer(4711, naechsterBesuch(4711, 1));
  for (const k of Object.keys(SAETZE)) {
    assert.ok(typeof b[k] === 'string' && b[k].length, 'kein Satz für ' + k);
    assert.ok(SAETZE[k].indexOf(b[k]) >= 0, k + ': ein Satz, der nicht in der Liste steht');
  }
});

/* ---------------- 3. Die Tasche ---------------- */

test('passtNach rechnet erst das Weggeben, dann das Bekommen', () => {
  // Die Falle: Eine volle Tasche, in der genau ein Stapel des Gesuchten
  // liegt. Nach dem Abgeben ist ein Fach frei – der Tausch geht auf.
  const inv = new Inventory(3);
  inv.add('shell', 3);
  inv.add('wood', 5);
  inv.add('stone', 5);
  assert.ok(inv.isFull());
  assert.equal(inv.passtNach([{ id: 'shell', n: 3 }], [{ id: 'gem', n: 1 }]), true);
  // Nimmt er nur einen Teil des Stapels, bleibt das Fach belegt.
  assert.equal(inv.passtNach([{ id: 'shell', n: 1 }], [{ id: 'gem', n: 1 }]), false);
});

test('passtNach zählt ein freies Fach nicht doppelt', () => {
  // Genau hier wäre eine Prüfung „passt Stück für Stück" falsch: Beide
  // Gegenstände sähen dasselbe freie Fach und sagten beide Ja.
  const inv = new Inventory(3);
  inv.add('wood', 5);
  inv.add('stone', 5);
  assert.equal(inv.freeSlots(), 1);
  assert.equal(inv.passtNach([], [{ id: 'gem', n: 1 }]), true);
  assert.equal(inv.passtNach([], [{ id: 'gem', n: 1 }, { id: 'amber', n: 1 }]), false);
});

test('passtNach sagt Nein, wenn das Geforderte gar nicht da ist', () => {
  const inv = new Inventory(20);
  inv.add('shell', 2);
  assert.equal(inv.passtNach([{ id: 'shell', n: 3 }], [{ id: 'gem', n: 1 }]), false);
  assert.equal(inv.passtNach([{ id: 'shell', n: 2 }], [{ id: 'gem', n: 1 }]), true);
});

test('passtNach ändert die Tasche nicht', () => {
  // Eine Probe, die etwas verändert, ist keine Probe.
  const inv = new Inventory(4);
  inv.add('shell', 3);
  inv.add('wood', 9);
  const vorher = JSON.stringify(inv.slots);
  inv.passtNach([{ id: 'shell', n: 3 }], [{ id: 'gem', n: 1 }, { id: 'amber', n: 2 }]);
  assert.equal(JSON.stringify(inv.slots), vorher);
});

test('Jeder mögliche Tausch geht in einer halbvollen Tasche auf', () => {
  // Die Gegenprobe zu allem oben: Es soll keine Kombination geben, die schon
  // bei normalem Gepäck scheitert. Der größte Tausch gibt zwei Sorten plus
  // die Laterne – drei Fächer.
  for (const w of SUCHT) {
    for (const g of GIBT) {
      const inv = new Inventory(30);
      inv.add(w.id, w.n);
      const rein = g.items.concat([{ id: MITBRINGSEL, n: 1 }]);
      assert.ok(inv.passtNach([w], rein),
        w.id + ' gegen ' + g.items.map((i) => i.id).join('+'));
    }
  }
});
